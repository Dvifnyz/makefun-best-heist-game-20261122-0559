// main.js — boot, input, game loop, phases, frozen ?shot= scenes and the
// ?selftest=1 headless playability test for The Gilded Vault.

import { newGame, update, throwCoin } from './entities.js';
import { render } from './render.js';
import { buildShot } from './shots.js';
import { ensureAudio, setMuted, sfx } from './audio.js';
import { CANVAS_W, CANVAS_H } from './level.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const selftest = params.get('selftest') === '1';

// --- input -----------------------------------------------------------------

const keys = new Set();
const edge = { smoke: false, emp: false, smash: false, restart: false };
let muted = false;

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyQ') edge.smoke = true;
  if (e.code === 'KeyE') edge.emp = true;
  if (e.code === 'KeyG') edge.smash = true;
  if (e.code === 'KeyR') edge.restart = true;
  if (e.code === 'KeyM') {
    muted = !muted;
    setMuted(muted);
  }
  ensureAudio();
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

function readInput() {
  const held = (code) => keys.has(code);
  return {
    up: held('KeyW') || held('ArrowUp'),
    down: held('KeyS') || held('ArrowDown'),
    left: held('KeyA') || held('ArrowLeft'),
    right: held('KeyD') || held('ArrowRight'),
    lockpick: held('KeyF'),
    smoke: edge.smoke,
    emp: edge.emp,
    smash: edge.smash,
    restart: edge.restart,
  };
}

function clearEdge() {
  edge.smoke = false;
  edge.emp = false;
  edge.smash = false;
  edge.restart = false;
}

// --- self-test ---------------------------------------------------------------
// Headless playability proof (?selftest=1): park the guards frozen in a
// far corner, drive the thief with scripted input — walk up to the case,
// hold the lockpick 2.5 s, walk back down to the exit — then, in a second
// fresh game, put a guard facing a still player and confirm the alarm
// rises. The outcome goes into document.title.

function runSelfTest() {
  const dt = 1 / 60;
  const state = newGame();
  state.phase = 'play';
  for (const [i, g] of state.guards.entries()) {
    g.x = 110 + i * 30;
    g.y = 660;
    g.facing = -Math.PI / 2;
    g.frozen = true;
  }

  const input = {
    up: false, down: false, left: false, right: false,
    lockpick: false, smoke: false, emp: false, smash: false, restart: false,
  };
  let steps = 0;
  const maxSteps = 60 * 90;
  let phase = 'up';
  let movedPos = { x: state.player.x, y: state.player.y };
  while (state.phase === 'play' && steps < maxSteps) {
    input.up = false;
    input.down = false;
    input.lockpick = false;
    if (phase === 'up') {
      input.up = true;
      if (state.player.y <= 245) {
        movedPos = { x: state.player.x, y: state.player.y };
        phase = 'pick';
      }
    } else if (phase === 'pick') {
      input.lockpick = true;
      if (state.loot.open) phase = 'take';
    } else if (phase === 'take') {
      input.up = true;
      if (state.loot.taken) phase = 'down';
    } else {
      input.down = true;
    }
    update(state, input, dt);
    steps += 1;
  }

  // Spotted check: a guard facing a still player must raise the alarm.
  const seen = newGame();
  seen.phase = 'play';
  seen.player.x = 640;
  seen.player.y = 648;
  const watcher = seen.guards[0];
  watcher.x = 640;
  watcher.y = 450;
  watcher.facing = Math.PI / 2;
  watcher.frozen = false;
  for (const g of seen.guards.slice(1)) {
    g.x = 120;
    g.y = 660;
    g.frozen = true;
  }
  const idle = {
    up: false, down: false, left: false, right: false,
    lockpick: false, smoke: false, emp: false, smash: false, restart: false,
  };
  for (let i = 0; i < 30; i++) update(seen, idle, dt);

  const moved = `${Math.round(movedPos.x)},${Math.round(movedPos.y)}`;
  const pass =
    state.loot.open &&
    state.loot.taken &&
    state.phase === 'won' &&
    state.alarm < 5 &&
    seen.alarm > 10;
  const title =
    `SELFTEST ${pass ? 'PASS' : 'FAIL'} | moved=${moved} | ` +
    `lootOpen=${state.loot.open} | lootTaken=${state.loot.taken} ` +
    `won=${state.phase === 'won'} lost=${state.phase === 'lost'} ` +
    `alarm=${Math.round(state.alarm)} | spottedAlarm=${Math.round(seen.alarm)}`;
  document.title = title;
  console.log(title);
  return { state, title, pass };
}

// --- boot ------------------------------------------------------------------

function startGame(state) {
  state.phase = 'play';
  ensureAudio();
}

function bindClick(state) {
  canvas.addEventListener('click', (e) => {
    ensureAudio();
    if (state.phase === 'start') {
      startGame(state);
      return;
    }
    if (state.phase === 'won' || state.phase === 'lost') {
      const fresh = newGame();
      fresh.phase = 'play';
      Object.assign(state, fresh);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    if (throwCoin(state, x, y)) sfx.coin();
  });
}

function main() {
  if (selftest) {
    const { state } = runSelfTest();
    render(ctx, state);
    return;
  }

  if (shotName) {
    const state = buildShot(shotName);
    if (state) {
      document.title = `SHOT ${shotName}`;
      render(ctx, state);
      return;
    }
  }

  const state = newGame();
  bindClick(state);
  render(ctx, state);

  let last = performance.now();
  let prevAlarm = 0;
  let prevTaken = false;
  let prevPhase = state.phase;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const input = readInput();
    const beforeSmoke = state.tools.smoke;
    const beforeEmp = state.tools.emp;
    const beforeSmashed = state.loot.smashed;
    update(state, input, dt);
    clearEdge();

    // Sound cues on transitions only.
    if (state.tools.smoke < beforeSmoke) sfx.smoke();
    if (state.tools.emp < beforeEmp) sfx.emp();
    if (state.loot.smashed && !beforeSmashed) sfx.smash();
    if (state.loot.taken && !prevTaken) sfx.pickup();
    if (prevAlarm < 40 && state.alarm >= 40) sfx.spotted();
    if (state.phase === 'won' && prevPhase !== 'won') sfx.win();
    if (state.phase === 'lost' && prevPhase !== 'lost') sfx.lose();
    prevAlarm = state.alarm;
    prevTaken = state.loot.taken;
    prevPhase = state.phase;

    render(ctx, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main();
