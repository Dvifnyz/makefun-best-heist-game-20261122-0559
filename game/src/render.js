// render.js — draws the whole gallery: floor, carpet, walls, ropes,
// cases, vision cones, cameras, figures, the Star, the HUD and overlays.
// All art is procedural canvas drawing; there are no image assets.

import {
  CANVAS_W,
  CANVAS_H,
  ROOM,
  ROOM_RIGHT,
  ROOM_BOTTOM,
  CARPET,
  EXIT_DOOR,
  LOOT_CASE,
  LOOT_CENTER,
  PILLARS,
  DISPLAY_CASES,
  ROPES,
  VISION_RANGE,
  VISION_HALF_ANGLE,
  CAMERA_RANGE,
  CAMERA_HALF_ANGLE,
} from './level.js';
import { scoreBreakdown } from './entities.js';

const GOLD = '#c9a227';
const GOLD_DIM = '#8a6d1f';
const WALL = '#2a2438';
const FLOOR_A = '#3a3348';
const FLOOR_B = '#342e42';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, facing, range, halfAngle, color) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawFloor(ctx) {
  // Gallery floor: dark marble checker with a soft vignette.
  for (let ty = 0; ty < 8; ty++) {
    for (let tx = 0; tx < 16; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(ROOM.x + tx * 76, ROOM.y + ty * 75.5, 76, 75.5);
    }
  }
  ctx.strokeStyle = 'rgba(201,162,39,0.16)';
  ctx.lineWidth = 1;
  for (let tx = 0; tx <= 16; tx++) {
    ctx.beginPath();
    ctx.moveTo(ROOM.x + tx * 76, ROOM.y);
    ctx.lineTo(ROOM.x + tx * 76, ROOM_BOTTOM);
    ctx.stroke();
  }
  for (let ty = 0; ty <= 8; ty++) {
    ctx.beginPath();
    ctx.moveTo(ROOM.x, ROOM.y + ty * 75.5);
    ctx.lineTo(ROOM_RIGHT, ROOM.y + ty * 75.5);
    ctx.stroke();
  }

  // Red carpet runner from the exit door to the loot case.
  ctx.fillStyle = '#7a1f2b';
  ctx.fillRect(CARPET.x, CARPET.y, CARPET.w, CARPET.h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 3;
  ctx.strokeRect(CARPET.x + 2, CARPET.y, CARPET.w - 4, CARPET.h);
  ctx.strokeStyle = 'rgba(201,162,39,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CARPET.x + 12, CARPET.y);
  ctx.lineTo(CARPET.x + 12, CARPET.y + CARPET.h);
  ctx.moveTo(CARPET.x + CARPET.w - 12, CARPET.y);
  ctx.lineTo(CARPET.x + CARPET.w - 12, CARPET.y + CARPET.h);
  ctx.stroke();

  // Walls: thick gold-trimmed border.
  ctx.fillStyle = WALL;
  ctx.fillRect(ROOM.x - 14, ROOM.y - 14, ROOM.w + 28, 14);
  ctx.fillRect(ROOM.x - 14, ROOM_BOTTOM, ROOM.w + 28, 14);
  ctx.fillRect(ROOM.x - 14, ROOM.y, 14, ROOM.h);
  ctx.fillRect(ROOM_RIGHT, ROOM.y, 14, ROOM.h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(ROOM.x - 14, ROOM.y - 14, ROOM.w + 28, ROOM.h + 28);

  // Exit door: glowing gap in the bottom wall.
  ctx.fillStyle = '#1d5c33';
  ctx.fillRect(EXIT_DOOR.x, EXIT_DOOR.y - 4, EXIT_DOOR.w, 12);
  ctx.strokeStyle = '#7ee2a0';
  ctx.lineWidth = 2;
  ctx.strokeRect(EXIT_DOOR.x, EXIT_DOOR.y - 4, EXIT_DOOR.w, 12);
  ctx.fillStyle = '#bff5d2';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', EXIT_DOOR.x + EXIT_DOOR.w / 2, EXIT_DOOR.y - 12);
}

function drawRopes(ctx) {
  for (const rope of ROPES) {
    const horizontal = rope.y1 === rope.y2;
    // Posts at both ends.
    for (const [px, py] of [[rope.x1, rope.y1], [rope.x2, rope.y2]]) {
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5c4a12';
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sagging velvet rope.
    ctx.strokeStyle = '#a4133c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(rope.x1, rope.y1);
    const mx = (rope.x1 + rope.x2) / 2;
    const my = (rope.y1 + rope.y2) / 2;
    const sag = horizontal ? 14 : 0;
    const sagX = horizontal ? 0 : 14;
    ctx.quadraticCurveTo(mx + sagX, my + sag, rope.x2, rope.y2);
    ctx.stroke();
  }
}

function drawCases(ctx, state) {
  for (const c of DISPLAY_CASES) {
    ctx.fillStyle = '#241f31';
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.strokeStyle = GOLD_DIM;
    ctx.lineWidth = 2;
    roundRect(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.stroke();
    // Glass top sheen.
    ctx.fillStyle = 'rgba(180,220,255,0.13)';
    roundRect(ctx, c.x + 5, c.y + 5, c.w - 10, c.h / 2 - 4, 4);
    ctx.fill();
    ctx.fillStyle = '#e8d9a0';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, c.x + c.w / 2, c.y + c.h / 2 + 4);
  }
  for (const p of PILLARS) {
    ctx.fillStyle = '#4a4030';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    ctx.fillStyle = 'rgba(255,235,170,0.16)';
    ctx.fillRect(p.x + 5, p.y + 5, 8, p.h - 10);
  }
}

function drawStar(ctx, x, y, scale, glow) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (glow) {
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
    g.addColorStop(0, 'rgba(140,240,255,0.55)');
    g.addColorStop(1, 'rgba(140,240,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, -16);
  ctx.lineTo(12, -4);
  ctx.lineTo(0, 16);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fillStyle = '#c9f6ff';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-12, -4);
  ctx.lineTo(12, -4);
  ctx.moveTo(0, -16);
  ctx.lineTo(0, 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawLootCase(ctx, state) {
  const c = LOOT_CASE;
  // Plinth.
  ctx.fillStyle = '#1c1826';
  roundRect(ctx, c.x - 6, c.y - 6, c.w + 12, c.h + 12, 8);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  roundRect(ctx, c.x - 6, c.y - 6, c.w + 12, c.h + 12, 8);
  ctx.stroke();
  // Glass.
  ctx.fillStyle = state.loot.open
    ? 'rgba(180,220,255,0.05)'
    : 'rgba(180,220,255,0.20)';
  roundRect(ctx, c.x, c.y, c.w, c.h, 4);
  ctx.fill();
  ctx.strokeStyle = state.loot.open ? 'rgba(255,255,255,0.35)' : 'rgba(220,240,255,0.8)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, c.x, c.y, c.w, c.h, 4);
  ctx.stroke();
  if (!state.loot.taken) {
    drawStar(ctx, LOOT_CENTER.x, LOOT_CENTER.y, 1, true);
  }
  ctx.fillStyle = '#e8d9a0';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THE MERIDIAN STAR', c.x + c.w / 2, c.y - 12);

  // Lockpick progress ring around the case.
  if (state.lockpick.active || (state.lockpick.progress > 0 && state.lockpick.progress < 1)) {
    const p = state.lockpick.progress;
    ctx.beginPath();
    ctx.arc(LOOT_CENTER.x, LOOT_CENTER.y, 52, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`LOCKPICK ${Math.round(p * 100)}%`, LOOT_CENTER.x, c.y - 30);
  }
}

function drawCones(ctx, state) {
  for (const cam of state.cameras) {
    if (state.time < cam.disabledUntil) continue;
    drawCone(ctx, cam.x, cam.y, cam.facing, CAMERA_RANGE, CAMERA_HALF_ANGLE, 'rgba(255,190,60,0.13)');
  }
  for (const g of state.guards) {
    const chasing = g.mode === 'chase';
    const color = chasing
      ? 'rgba(255,70,70,0.30)'
      : g.mode === 'suspicious' || g.mode === 'investigate'
        ? 'rgba(255,200,60,0.22)'
        : 'rgba(255,220,120,0.13)';
    drawCone(ctx, g.x, g.y, g.facing, VISION_RANGE, VISION_HALF_ANGLE, color);
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    const disabled = state.time < cam.disabledUntil;
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.fillStyle = disabled ? '#555' : '#222';
    ctx.fillRect(-9, -7, 18, 14);
    ctx.strokeStyle = disabled ? '#777' : '#ff5a5a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -7, 18, 14);
    ctx.rotate(cam.facing);
    ctx.fillStyle = disabled ? '#666' : '#ff5a5a';
    ctx.beginPath();
    ctx.arc(12, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (disabled) {
      ctx.fillStyle = '#9fb4d8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`EMP ${Math.ceil(cam.disabledUntil - state.time)}s`, cam.x, cam.y + 28);
    }
  }
}

function drawGuard(ctx, g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  // Body.
  ctx.fillStyle = g.color;
  ctx.beginPath();
  ctx.arc(0, 0, g.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0e0c14';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facing tick + torch dot.
  ctx.rotate(g.facing);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(g.r + 2, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(2, -2, g.r - 2, 4);
  ctx.restore();
  // Name tag.
  ctx.fillStyle = '#dfe6ff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(g.name.toUpperCase(), g.x, g.y - g.r - 6);
  // Mode tag.
  if (g.mode === 'chase') {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('!', g.x, g.y - g.r - 20);
  } else if (g.mode === 'suspicious') {
    ctx.fillStyle = '#ffd94d';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('?', g.x, g.y - g.r - 20);
  }
}

function drawPlayer(ctx, state) {
  const p = state.player;
  // Soft shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(p.x, p.y + p.r - 2, p.r, p.r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(p.x, p.y);
  // Hooded thief: dark cloak, pale mask stripe, gold clasp.
  ctx.fillStyle = '#17141f';
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(p.facing);
  ctx.fillStyle = '#e8e4d8';
  ctx.fillRect(2, -5, 8, 10);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(11, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (state.loot.taken) {
    drawStar(ctx, p.x, p.y - p.r - 14, 0.7, false);
  }
}

function drawSmoke(ctx, state) {
  for (const s of state.smokes) {
    const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(200,205,215,0.55)');
    g.addColorStop(1, 'rgba(200,205,215,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,225,235,0.8)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SMOKE', s.x, s.y);
  }
}

function drawCoins(ctx, state) {
  for (const c of state.coins) {
    if (state.time - c.t > 3) continue;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function alarmColor(alarm) {
  if (alarm < 35) return '#4ade80';
  if (alarm < 70) return '#fbbf24';
  return '#ef4444';
}

function alarmLabel(alarm) {
  if (alarm < 35) return 'UNDETECTED';
  if (alarm < 70) return 'SUSPICIOUS';
  return 'HUNTED';
}

function drawHud(ctx, state) {
  // Strip.
  ctx.fillStyle = '#14101f';
  ctx.fillRect(0, 0, CANVAS_W, 84);
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 84);
  ctx.lineTo(CANVAS_W, 84);
  ctx.stroke();

  // Left: title + objective.
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('THE GILDED VAULT', 24, 32);
  ctx.fillStyle = '#c9c2d8';
  ctx.font = '14px sans-serif';
  const objective = state.loot.taken
    ? 'Star secured — reach the EXIT door!'
    : state.loot.open
      ? 'Case open — grab the Meridian Star!'
      : 'Steal the Meridian Star, then escape.';
  ctx.fillText(objective, 24, 58);

  // Centre: alarm meter.
  const bx = 480;
  const by = 26;
  const bw = 320;
  ctx.fillStyle = '#c9c2d8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM', bx + bw / 2, by - 6);
  ctx.fillStyle = '#241f31';
  roundRect(ctx, bx, by, bw, 20, 5);
  ctx.fill();
  ctx.fillStyle = alarmColor(state.alarm);
  const w = Math.max(0, Math.min(1, state.alarm / 100)) * bw;
  if (w > 0) {
    roundRect(ctx, bx, by, w, 20, 5);
    ctx.fill();
  }
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, by, bw, 20, 5);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`${Math.round(state.alarm)}%  ·  ${alarmLabel(state.alarm)}`, bx + bw / 2, by + 38);

  // Right: timer, tools, loot.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 16px sans-serif';
  const mm = String(Math.floor(state.time / 60)).padStart(2, '0');
  const ss = String(Math.floor(state.time % 60)).padStart(2, '0');
  ctx.fillText(`⏱ ${mm}:${ss}`, 1256, 28);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#c9c2d8';
  ctx.fillText(
    `Smoke ×${state.tools.smoke}   Coin ×${state.tools.coin}   EMP ×${state.tools.emp}`,
    1256,
    52,
  );
  ctx.fillStyle = state.loot.taken ? '#7ee2a0' : '#e8d9a0';
  ctx.fillText(state.loot.taken ? '★ STAR SECURED' : state.loot.open ? '◇ CASE OPEN' : '◇ STAR IN CASE', 1256, 74);

  // Bottom hint.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(201,194,216,0.75)';
  ctx.font = '12px sans-serif';
  ctx.fillText(
    'WASD / arrows — move    ·    Click — throw a coin    ·    Q — smoke    ·    E — EMP    ·    Hold F — lockpick    ·    G — smash glass    ·    R — restart',
    CANVAS_W / 2,
    CANVAS_H - 8,
  );
}

function drawOverlay(ctx, state) {
  ctx.fillStyle = 'rgba(10,8,16,0.82)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  if (state.phase === 'start') {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('THE GILDED VAULT', CANVAS_W / 2, 200);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '20px sans-serif';
    ctx.fillText('One night. One gallery. One diamond — the Meridian Star.', CANVAS_W / 2, 250);
    ctx.fillStyle = '#c9c2d8';
    ctx.font = '16px sans-serif';
    ctx.fillText('Slip past Mara, Ivo and Sable, dodge the sweeping cameras,', CANVAS_W / 2, 300);
    ctx.fillText('pick the glass case — or smash it and run — then vanish through the exit.', CANVAS_W / 2, 326);
    ctx.fillStyle = '#e8d9a0';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('WASD move · Click throws a coin · Q smoke · E EMP · Hold F lockpick · G smash', CANVAS_W / 2, 390);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Click anywhere to begin the heist', CANVAS_W / 2, 460);
  } else if (state.phase === 'won') {
    ctx.fillStyle = '#7ee2a0';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('CLEAN GETAWAY!', CANVAS_W / 2, 180);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '20px sans-serif';
    ctx.fillText('The Meridian Star is yours. The gallery never knew you were there.', CANVAS_W / 2, 228);
    const rows = scoreBreakdown(state);
    ctx.font = '17px sans-serif';
    let y = 290;
    for (const row of rows) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#c9c2d8';
      ctx.fillText(row.label, 440, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = row.value >= 0 ? '#7ee2a0' : '#ff8a8a';
      ctx.fillText(row.value >= 0 ? `+${row.value}` : `${row.value}`, 840, y);
      y += 30;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`SCORE  ${state.score}`, CANVAS_W / 2, y + 22);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px sans-serif';
    ctx.fillText('Press R to run it again', CANVAS_W / 2, y + 64);
  } else if (state.phase === 'lost') {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('CAUGHT!', CANVAS_W / 2, 220);
    ctx.fillStyle = '#e8e4d8';
    ctx.font = '20px sans-serif';
    ctx.fillText(state.loseReason, CANVAS_W / 2, 280);
    ctx.fillStyle = '#c9c2d8';
    ctx.font = '17px sans-serif';
    ctx.fillText(`You lasted ${state.time.toFixed(1)}s · peak alarm ${Math.round(state.alarmPeak)}%`, CANVAS_W / 2, 330);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Press R to try again', CANVAS_W / 2, 400);
  }
}

export function render(ctx, state) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawFloor(ctx);
  drawRopes(ctx);
  drawCases(ctx, state);
  drawCones(ctx, state);
  drawLootCase(ctx, state);
  drawCameras(ctx, state);
  drawSmoke(ctx, state);
  drawCoins(ctx, state);
  for (const g of state.guards) drawGuard(ctx, g);
  drawPlayer(ctx, state);
  drawHud(ctx, state);
  if (state.phase !== 'play') drawOverlay(ctx, state);
}
