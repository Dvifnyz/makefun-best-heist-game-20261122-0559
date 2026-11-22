// entities.js — game state, guard and camera AI, tools, alarm, win/lose
// and scoring for The Gilded Vault.

import {
  PLAYER_START,
  GUARD_DEFS,
  CAMERA_DEFS,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  CAMERA_RANGE,
  CAMERA_HALF_ANGLE,
  LOOT_CASE,
  LOOT_CENTER,
  EXIT_DOOR,
  ROOM,
  moveCircle,
  circlesTouch,
  inVisionCone,
  angleTo,
  angleDiff,
  dist,
  distanceToLoot,
} from './level.js';

export const PLAYER_SPEED = 185;
export const PLAYER_RADIUS = 14;
export const GUARD_RADIUS = 15;
export const CHASE_SPEED = 96;
export const CHASE_ALARM = 40;
export const LOSE_SIGHT_SECONDS = 2.5;
export const ALARM_DECAY = 8;
export const LOCKPICK_SECONDS = 2.5;
export const LOCKPICK_RANGE = 80;
export const SMOKE_RADIUS = 95;
export const SMOKE_SECONDS = 4;
export const COIN_RANGE = 300;
export const COIN_HEARING = 420;
export const EMP_RANGE = 340;
export const EMP_SECONDS = 6;
export const SMASH_ALARM = 35;

export function newGame() {
  return {
    phase: 'start', // start | play | won | lost
    time: 0,
    alarm: 0,
    alarmPeak: 0,
    loseReason: '',
    player: { x: PLAYER_START.x, y: PLAYER_START.y, r: PLAYER_RADIUS, facing: -Math.PI / 2 },
    guards: GUARD_DEFS.map((def) => ({
      name: def.name,
      color: def.color,
      x: def.waypoints[0].x,
      y: def.waypoints[0].y,
      r: GUARD_RADIUS,
      waypoints: def.waypoints,
      wp: 1,
      speed: def.speed,
      facing: angleTo(def.waypoints[0].x, def.waypoints[0].y, def.waypoints[1].x, def.waypoints[1].y),
      mode: 'patrol', // patrol | suspicious | chase | investigate
      loseSight: 0,
      lookTimer: 0,
      lookDir: 0,
      investigate: null,
      frozen: false,
    })),
    cameras: CAMERA_DEFS.map((def) => ({
      x: def.x,
      y: def.y,
      baseAngle: def.baseAngle,
      sweep: def.sweep,
      phase: def.phase,
      disabledUntil: 0,
      facing: def.baseAngle,
    })),
    tools: { smoke: 3, coin: 4, emp: 2 },
    smokes: [],
    coins: [],
    lockpick: { progress: 0, active: false },
    loot: { open: false, taken: false, smashed: false },
    score: null,
    // transient per-frame input echo, used by the renderer for hints
    lastCoinAt: null,
  };
}

export function canSeeGuard(guard, state) {
  return inVisionCone(
    guard.x, guard.y, guard.facing,
    VISION_RANGE, VISION_HALF_ANGLE,
    state.player.x, state.player.y,
    state.smokes,
  );
}

export function canSeeCamera(camera, state) {
  if (state.time < camera.disabledUntil) return false;
  return inVisionCone(
    camera.x, camera.y, camera.facing,
    CAMERA_RANGE, CAMERA_HALF_ANGLE,
    state.player.x, state.player.y,
    state.smokes,
  );
}

function moveToward(e, tx, ty, speed, dt) {
  const d = dist(e.x, e.y, tx, ty);
  if (d < 0.5) return true;
  const step = Math.min(d, speed * dt);
  const nx = e.x + ((tx - e.x) / d) * step;
  const ny = e.y + ((ty - e.y) / d) * step;
  const moved = moveCircle(e.x, e.y, e.r, nx - e.x, ny - e.y);
  e.x = moved.x;
  e.y = moved.y;
  e.facing = angleTo(e.x, e.y, tx, ty);
  return d <= step + 0.5;
}

function patrolStep(guard, dt) {
  const target = guard.waypoints[guard.wp];
  const arrived = moveToward(guard, target.x, target.y, guard.speed, dt);
  if (arrived) guard.wp = (guard.wp + 1) % guard.waypoints.length;
}

function updateGuard(guard, state, dt) {
  if (guard.frozen) return;
  const sees = canSeeGuard(guard, state);

  if (sees) {
    guard.loseSight = 0;
    state.alarm = Math.min(100, state.alarm + 45 * dt);
    if (state.alarm > CHASE_ALARM) {
      guard.mode = 'chase';
    } else if (guard.mode === 'patrol') {
      guard.mode = 'suspicious';
    }
  } else if (guard.mode === 'chase' || guard.mode === 'suspicious') {
    guard.loseSight += dt;
    if (guard.loseSight >= LOSE_SIGHT_SECONDS) {
      guard.mode = 'suspicious';
      guard.lookTimer = 1.6;
      guard.lookDir = guard.name === 'Sable' ? -1 : 1;
      guard.loseSight = 0;
    }
  }

  if (guard.mode === 'chase') {
    moveToward(guard, state.player.x, state.player.y, CHASE_SPEED, dt);
    if (circlesTouch(guard.x, guard.y, guard.r, state.player.x, state.player.y, state.player.r)) {
      state.alarm = 100;
    }
  } else if (guard.mode === 'investigate' && guard.investigate) {
    const arrived = moveToward(guard, guard.investigate.x, guard.investigate.y, guard.speed * 1.25, dt);
    if (arrived) {
      guard.mode = 'suspicious';
      guard.lookTimer = 1.6;
      guard.lookDir = guard.name === 'Ivo' ? -1 : 1;
      guard.investigate = null;
    }
  } else if (guard.mode === 'suspicious') {
    if (guard.lookTimer > 0) {
      guard.lookTimer -= dt;
      guard.facing += guard.lookDir * dt * 1.8;
    } else {
      guard.mode = 'patrol';
    }
  } else {
    patrolStep(guard, dt);
  }
}

function updateCameras(state, dt) {
  for (const cam of state.cameras) {
    cam.facing = cam.baseAngle + Math.sin(state.time * 0.7 + cam.phase) * cam.sweep;
    if (state.time < cam.disabledUntil) continue;
    if (canSeeCamera(cam, state)) {
      state.alarm = Math.min(100, state.alarm + 30 * dt);
    }
  }
}

// --- tools ---------------------------------------------------------------

export function throwCoin(state, x, y) {
  if (state.phase !== 'play' || state.tools.coin <= 0) return false;
  if (dist(state.player.x, state.player.y, x, y) > COIN_RANGE) return false;
  state.tools.coin -= 1;
  state.coins.push({ x, y, t: state.time });
  state.lastCoinAt = { x, y, t: state.time };
  let best = null;
  let bestD = Infinity;
  for (const g of state.guards) {
    const d = dist(g.x, g.y, x, y);
    if (d < COIN_HEARING && d < bestD) {
      best = g;
      bestD = d;
    }
  }
  if (best) {
    best.mode = 'investigate';
    best.investigate = { x, y };
    best.loseSight = 0;
  }
  return true;
}

export function useSmoke(state) {
  if (state.phase !== 'play' || state.tools.smoke <= 0) return false;
  state.tools.smoke -= 1;
  state.smokes.push({ x: state.player.x, y: state.player.y, r: SMOKE_RADIUS, until: state.time + SMOKE_SECONDS });
  return true;
}

export function useEmp(state) {
  if (state.phase !== 'play' || state.tools.emp <= 0) return false;
  state.tools.emp -= 1;
  for (const cam of state.cameras) {
    if (dist(state.player.x, state.player.y, cam.x, cam.y) <= EMP_RANGE) {
      cam.disabledUntil = state.time + EMP_SECONDS;
    }
  }
  return true;
}

export function smashCase(state) {
  if (state.phase !== 'play' || state.loot.open) return false;
  if (distanceToLoot(state.player.x, state.player.y) > LOCKPICK_RANGE) return false;
  state.loot.open = true;
  state.loot.smashed = true;
  state.alarm = Math.min(100, state.alarm + SMASH_ALARM);
  for (const g of state.guards) {
    g.mode = 'investigate';
    g.investigate = { x: LOOT_CENTER.x, y: LOOT_CENTER.y };
    g.loseSight = 0;
  }
  return true;
}

// --- scoring ---------------------------------------------------------------

export function unusedTools(state) {
  return state.tools.smoke + state.tools.coin + state.tools.emp;
}

export function scoreGame(state) {
  const raw =
    10000 -
    15 * state.time -
    20 * state.alarmPeak +
    150 * unusedTools(state) +
    (state.loot.smashed ? 0 : 500);
  return Math.max(0, Math.round(raw));
}

export function scoreBreakdown(state) {
  return [
    { label: 'Base score', value: 10000 },
    { label: `Time ${state.time.toFixed(1)}s  (−15/s)`, value: -Math.round(15 * state.time) },
    { label: `Peak alarm ${Math.round(state.alarmPeak)}%  (−20/%)`, value: -Math.round(20 * state.alarmPeak) },
    { label: `Unused tools ×${unusedTools(state)}  (+150 each)`, value: 150 * unusedTools(state) },
    { label: state.loot.smashed ? 'Glass smashed  (+0)' : 'Glass never smashed  (+500)', value: state.loot.smashed ? 0 : 500 },
  ];
}

// --- main update -----------------------------------------------------------

// input: { up, down, left, right, lockpick, smash, smoke, emp, restart }
export function update(state, input, dt) {
  if (state.phase === 'start') {
    return;
  }
  if (state.phase === 'won' || state.phase === 'lost') {
    if (input.restart) {
      const fresh = newGame();
      fresh.phase = 'play';
      Object.assign(state, fresh);
    }
    return;
  }

  state.time += dt;

  // --- player movement (axis-separated, walls slide) ---
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    const moved = moveCircle(
      state.player.x, state.player.y, state.player.r,
      (mx / len) * PLAYER_SPEED * dt,
      (my / len) * PLAYER_SPEED * dt,
    );
    state.player.x = moved.x;
    state.player.y = moved.y;
    state.player.facing = Math.atan2(my, mx);
  }

  // --- tools (edge-triggered flags set by the input layer) ---
  if (input.smoke) useSmoke(state);
  if (input.emp) useEmp(state);
  if (input.smash) smashCase(state);

  // --- lockpick: hold F near the case, 2.5 s, silent; moving cancels ---
  const nearLoot = distanceToLoot(state.player.x, state.player.y) <= LOCKPICK_RANGE;
  if (!state.loot.open && nearLoot && input.lockpick && !moving) {
    state.lockpick.active = true;
    state.lockpick.progress += dt / LOCKPICK_SECONDS;
    if (state.lockpick.progress >= 1) {
      state.lockpick.progress = 1;
      state.loot.open = true;
    }
  } else {
    state.lockpick.active = false;
    if (moving) state.lockpick.progress = 0;
  }

  // --- take the Star: touch the open case (reach its glass) ---
  if (state.loot.open && !state.loot.taken) {
    if (distanceToLoot(state.player.x, state.player.y) <= state.player.r + 4) {
      state.loot.taken = true;
    }
  }

  // --- smoke clouds expire ---
  state.smokes = state.smokes.filter((s) => state.time < s.until);

  // --- guards and cameras ---
  let anyoneSees = false;
  for (const g of state.guards) {
    if (canSeeGuard(g, state)) anyoneSees = true;
    updateGuard(g, state, dt);
  }
  updateCameras(state, dt);
  for (const cam of state.cameras) {
    if (state.time < cam.disabledUntil) continue;
    if (canSeeCamera(cam, state)) anyoneSees = true;
  }

  // --- alarm decay when nobody sees the thief ---
  if (!anyoneSees) {
    state.alarm = Math.max(0, state.alarm - ALARM_DECAY * dt);
  }
  state.alarmPeak = Math.max(state.alarmPeak, state.alarm);

  // --- caught ---
  if (state.alarm >= 100) {
    state.phase = 'lost';
    state.loseReason = 'The alarm hit 100% — the gallery is locked down and the guards have you.';
    return;
  }

  // --- win: Star in hand, reach the exit door ---
  if (state.loot.taken) {
    const p = state.player;
    if (
      p.x >= EXIT_DOOR.x - p.r && p.x <= EXIT_DOOR.x + EXIT_DOOR.w + p.r &&
      p.y + p.r >= EXIT_DOOR.y
    ) {
      state.phase = 'won';
      state.score = scoreGame(state);
    }
  }

  void ROOM;
}
