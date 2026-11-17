// BLOOMWARD — make.fun best-game-01 entrypoint.
// Copies game/ and screenshots/ into the output directory and writes the
// dossier with the kit's buildDossier, exactly as the kit requires.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

mkdirSync(outDir, { recursive: true });
for (const name of ['game', 'screenshots']) {
  const src = join(repoRoot, name);
  if (existsSync(src)) cpSync(src, join(outDir, name), { recursive: true });
}

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
});
if (dossier.length < 1000) throw new Error('dossier suspiciously small: ' + dossier.length);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`bloomward dossier written: ${dossier.length} bytes -> ${outDir}`);
