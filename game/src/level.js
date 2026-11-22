// level.js — the Meridian Gallery: room geometry, solids, routes, cameras,
// collision, line-of-sight and angle helpers. No game state lives here,
// only the fixed shape of the room.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;

// HUD strip occupies y 0..84; the gallery floor is y 96..700.
export const ROOM = { x: 32, y: 96, w: 1216, h: 604 };
export const ROOM_RIGHT = ROOM.x + ROOM.w; // 1248
export const ROOM_BOTTOM = ROOM.y + ROOM.h; // 700

// Red carpet runner from the exit door up to the loot case.
export const CARPET = { x: 600, y: 168, w: 80, h: 524 };

// Exit door at the bottom centre of the room.
export const EXIT_DOOR = { x: 600, y: 692, w: 80, h: 8 };

// The Meridian Star in its glass case, centre-top.
export const LOOT_CASE = { x: 600, y: 168, w: 84, h: 58 };
export const LOOT_CENTER = { x: LOOT_CASE.x + LOOT_CASE.w / 2, y: LOOT_CASE.y + LOOT_CASE.h / 2 };

// Cover: blocks movement AND sight. Pillars are 46x46, display cases vary.
export const PILLARS = [
  { x: 300, y: 220, w: 46, h: 46 },
  { x: 934, y: 220, w: 46, h: 46 },
  { x: 300, y: 520, w: 46, h: 46 },
  { x: 934, y: 520, w: 46, h: 46 },
];

export const DISPLAY_CASES = [
  { name: 'JADE', x: 180, y: 300, w: 120, h: 60 },
  { name: 'GOLD', x: 980, y: 300, w: 120, h: 60 },
  { name: 'SILK', x: 430, y: 430, w: 110, h: 54 },
  { name: 'IVORY', x: 740, y: 430, w: 110, h: 54 },
];

// Every solid rectangle: pillars, display cases and the glass loot case's
// plinth is NOT solid to sight (glass), but the case body blocks movement.
export function solids() {
  return [...PILLARS, ...DISPLAY_CASES, { ...LOOT_CASE }];
}

// Rectangles that block sight: pillars and display cases only. The glass
// loot case never blocks a sight line.
export function sightBlockers() {
  return [...PILLARS, ...DISPLAY_CASES];
}

// Velvet rope runs: decoration only, no collision.
export const ROPES = [
  { x1: 520, y1: 260, x2: 760, y2: 260 },
  { x1: 520, y1: 560, x2: 760, y2: 560 },
  { x1: 120, y1: 400, x2: 120, y2: 620 },
  { x1: 1160, y1: 400, x2: 1160, y2: 620 },
];

export const PLAYER_START = { x: 640, y: 648 };

export const GUARD_DEFS = [
  {
    name: 'Mara',
    color: '#5b8dd9',
    waypoints: [
      { x: 200, y: 180 },
      { x: 200, y: 560 },
      { x: 420, y: 560 },
      { x: 420, y: 180 },
    ],
    speed: 56,
  },
  {
    name: 'Ivo',
    color: '#d95b7a',
    waypoints: [
      { x: 1080, y: 180 },
      { x: 1080, y: 560 },
      { x: 860, y: 560 },
      { x: 860, y: 180 },
    ],
    speed: 56,
  },
  {
    name: 'Sable',
    color: '#8a5bd9',
    waypoints: [
      { x: 520, y: 300 },
      { x: 760, y: 300 },
      { x: 760, y: 470 },
      { x: 520, y: 470 },
    ],
    speed: 66,
  },
];

export const CAMERA_DEFS = [
  { x: 60, y: 112, baseAngle: Math.PI / 2, sweep: 0.9, phase: 0 },
  { x: 1220, y: 112, baseAngle: Math.PI / 2, sweep: 0.9, phase: Math.PI },
];

export const VISION_RANGE = 235;
export const VISION_HALF_ANGLE = (76 * Math.PI) / 180 / 2;
export const CAMERA_RANGE = 265;
export const CAMERA_HALF_ANGLE = (60 * Math.PI) / 180 / 2;

// --- angle helpers -------------------------------------------------------

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// --- collision -----------------------------------------------------------

// Axis-separated circle-vs-rect movement: slide along walls instead of
// sticking. Returns the new position after moving (dx, dy) from (x, y).
export function moveCircle(x, y, r, dx, dy) {
  const rects = solids();
  let nx = x + dx;
  for (const rect of rects) {
    if (circleHitsRect(nx, y, r, rect)) nx = x;
  }
  // Room walls.
  nx = Math.max(ROOM.x + r, Math.min(ROOM_RIGHT - r, nx));
  let ny = y + dy;
  for (const rect of rects) {
    if (circleHitsRect(nx, ny, r, rect)) ny = y;
  }
  ny = Math.max(ROOM.y + r, Math.min(ROOM_BOTTOM - r, ny));
  return { x: nx, y: ny };
}

export function circleHitsRect(cx, cy, r, rect) {
  const qx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const qy = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - qx;
  const dy = cy - qy;
  return dx * dx + dy * dy < r * r;
}

export function circlesTouch(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy < rr * rr;
}

// --- line of sight -------------------------------------------------------

// Sample the segment every 8 px. Blocked by pillars / display cases.
// Smoke blocks only when the sampled point falls inside a smoke disc.
// The glass loot case never blocks.
export function lineOfSight(x1, y1, x2, y2, smokes = []) {
  const blockers = sightBlockers();
  const d = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + (x2 - x1) * t;
    const py = y1 + (y2 - y1) * t;
    for (const b of blockers) {
      if (pointInRect(px, py, b)) return false;
    }
    for (const s of smokes) {
      if (Math.hypot(px - s.x, py - s.y) < s.r) return false;
    }
  }
  return true;
}

// Is (tx, ty) inside the vision cone of an observer at (ox, oy) facing
// `facing`, with the given range and half-angle, with a clear sight line?
export function inVisionCone(ox, oy, facing, range, halfAngle, tx, ty, smokes = []) {
  const d = dist(ox, oy, tx, ty);
  if (d > range) return false;
  if (d < 1) return true;
  const a = angleTo(ox, oy, tx, ty);
  if (Math.abs(angleDiff(a, facing)) > halfAngle) return false;
  return lineOfSight(ox, oy, tx, ty, smokes);
}

// Distance from the player to the loot case (edge to centre).
export function distanceToLoot(px, py) {
  const qx = Math.max(LOOT_CASE.x, Math.min(px, LOOT_CASE.x + LOOT_CASE.w));
  const qy = Math.max(LOOT_CASE.y, Math.min(py, LOOT_CASE.y + LOOT_CASE.h));
  return Math.hypot(px - qx, py - qy);
}
