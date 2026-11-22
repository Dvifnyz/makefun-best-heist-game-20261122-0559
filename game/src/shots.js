// shots.js — deterministic frozen scenes for the four screenshots. Each
// scene is a fully posed game state: the renderer draws it exactly as a
// plain page load, with no update step running, so every render of the
// same scene is the same frame.

import { newGame } from './entities.js';
import { LOOT_CENTER } from './level.js';

function base(time) {
  const state = newGame();
  state.phase = 'play';
  state.time = time;
  return state;
}

function placeGuard(state, index, x, y, facing, mode) {
  const g = state.guards[index];
  g.x = x;
  g.y = y;
  g.facing = facing;
  g.mode = mode;
  if (mode === 'suspicious') {
    g.lookTimer = 1.6;
    g.lookDir = 1;
  }
  return g;
}

function setCamera(state, index, facing, disabledUntil = 0) {
  const cam = state.cameras[index];
  cam.facing = facing;
  cam.disabledUntil = disabledUntil;
  return cam;
}

// 1-cover: the thief mid-gallery on the carpet, alarm 12, patrols sweeping.
export function shotCover() {
  const state = base(23.4);
  state.alarm = 12;
  state.alarmPeak = 12;
  state.player.x = 640;
  state.player.y = 430;
  state.player.facing = -Math.PI / 2;
  placeGuard(state, 0, 200, 380, Math.PI / 2, 'patrol'); // Mara, southbound
  placeGuard(state, 1, 1080, 300, -Math.PI / 2, 'patrol'); // Ivo, northbound
  placeGuard(state, 2, 640, 300, Math.PI, 'patrol'); // Sable, westbound
  setCamera(state, 0, 1.1);
  setCamera(state, 1, 2.0);
  return state;
}

// 2-cone: the thief at a cone edge behind cover and smoke, guard
// suspicious, alarm 34. Mara faces east; the smoke disc between her and
// the thief blocks her line of sight.
export function shotCone() {
  const state = base(41.8);
  state.alarm = 34;
  state.alarmPeak = 34;
  state.player.x = 430;
  state.player.y = 300;
  state.player.facing = Math.PI;
  placeGuard(state, 0, 250, 300, 0, 'suspicious'); // Mara, staring into smoke
  placeGuard(state, 1, 980, 470, Math.PI / 2, 'patrol');
  placeGuard(state, 2, 700, 470, 0, 'patrol');
  state.smokes.push({ x: 340, y: 300, r: 95, until: 45.0 });
  setCamera(state, 0, 1.4);
  setCamera(state, 1, 1.7);
  return state;
}

// 3-loot: lockpick 60% at the glass case, alarm 55, Sable closing in.
export function shotLoot() {
  const state = base(58.2);
  state.alarm = 55;
  state.alarmPeak = 55;
  state.player.x = 640;
  state.player.y = 245;
  state.player.facing = -Math.PI / 2;
  state.lockpick.active = true;
  state.lockpick.progress = 0.6;
  state.tools.smoke = 2;
  state.tools.coin = 3;
  placeGuard(state, 0, 420, 200, 0, 'patrol');
  placeGuard(state, 1, 860, 200, Math.PI, 'patrol');
  placeGuard(state, 2, 560, 330, -Math.PI / 2, 'suspicious'); // Sable, alerted
  setCamera(state, 0, 0.9);
  setCamera(state, 1, 2.2);
  return state;
}

// 4-getaway: the Star is taken, alarm 78, guards chasing, smoke cover,
// the thief sprinting for the exit door.
export function shotEscape() {
  const state = base(74.6);
  state.alarm = 78;
  state.alarmPeak = 78;
  state.loot.open = true;
  state.loot.taken = true;
  state.tools.smoke = 1;
  state.tools.coin = 2;
  state.tools.emp = 1;
  state.player.x = 640;
  state.player.y = 600;
  state.player.facing = Math.PI / 2;
  placeGuard(state, 0, 560, 520, Math.PI / 2, 'chase');
  placeGuard(state, 1, 720, 540, Math.PI / 2, 'chase');
  placeGuard(state, 2, 640, 470, Math.PI / 2, 'chase');
  state.smokes.push({ x: 640, y: 520, r: 95, until: 78.0 });
  setCamera(state, 0, 1.2);
  setCamera(state, 1, 1.9);
  return state;
}

export function buildShot(name) {
  switch (name) {
    case 'cover':
      return shotCover();
    case 'cone':
      return shotCone();
    case 'loot':
      return shotLoot();
    case 'escape':
      return shotEscape();
    default:
      return null;
  }
}

export function shotNames() {
  return ['cover', 'cone', 'loot', 'escape'];
}

void LOOT_CENTER;
