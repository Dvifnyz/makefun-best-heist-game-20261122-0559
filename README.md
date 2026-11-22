# The Gilded Vault — a top-down heist game

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Dvifnyz/makefun-best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Dvifnyz/makefun-best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

One night. One gallery. One diamond — the Meridian Star. **The Gilded
Vault** is a top-down 2D heist game written in vanilla JavaScript and
Canvas, with no assets and no network: every pixel is drawn procedurally
and every sound is a WebAudio bleep.

You are the thief crossing the Meridian Gallery. Three guards — Mara, Ivo
and Sable — patrol the wings with sweeping vision cones, two wall cameras
sweep the room, and an alarm meter decides whether you walk out rich or
get caught. Read the cones, pick your moment, and choose your tools:

- **WASD / arrows** — move (walls slide, cover blocks sight)
- **Click** — throw a coin to lure the nearest guard away (4 coins)
- **Q** — smoke cloud that blocks sight (3 charges)
- **E** — EMP that disables nearby cameras for 6 s (2 charges)
- **Hold F** — silently lockpick the glass case (2.5 s, moving cancels)
- **G** — smash the glass: instant, but +35 alarm and every guard comes
  running
- **R** — restart

Steal the Meridian Star, then reach the green EXIT door at the bottom of
the gallery. Your score rewards speed, a low peak alarm, unused tools and
glass left unbroken.

## Play it

Serve `game/` with any static HTTP server and open `index.html` in a
desktop browser:

```sh
python3 -m http.server 8080 --directory game
```

No build step, no dependencies, no network requests.

## How it is built

- `game/index.html` — the page: a fixed 1280×720 canvas, one module script.
- `game/src/main.js` — boot, input, game loop, phases, frozen screenshot
  scenes (`?shot=`) and the headless playability test (`?selftest=1`).
- `game/src/level.js` — the gallery: room, solids, ropes, patrol routes,
  cameras, collision, line-of-sight and angle helpers.
- `game/src/entities.js` — game state, guard and camera AI, tools, alarm,
  win/lose and scoring.
- `game/src/render.js` — floor, carpet, walls, ropes, cases, vision cones,
  cameras, figures, the Star, the HUD and overlays.
- `game/src/audio.js` — WebAudio bleeps, created on first gesture.
- `game/src/shots.js` — deterministic frozen scenes for the screenshots.
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/`
  to the output directory and writes `dossier.json` with `buildDossier`
  from `vendor/makefun-game.ts`.

## Entry

Built for the [make.fun best heist game bounty](https://make.fun/bounty/best-heist-game-20261122-0559).
Referral code: `b8pznreq`.

License: MIT — see [LICENSE](LICENSE).
