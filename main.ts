// main.ts — entrypoint for The Gilded Vault (make.fun best-heist-game
// bounty). Node 22, standard library only. Copies game/ and screenshots/
// from this repository to the output directory and writes dossier.json
// with buildDossier from vendor/makefun-game.ts.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)));
const outputDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = await buildDossier(repoRoot, caps);
writeFileSync(join(outputDir, 'dossier.json'), dossier, 'utf8');
