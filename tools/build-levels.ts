// Génère et fige les niveaux prédéfinis (20 par difficulté). Usage : npm run levels
import { writeFileSync } from 'node:fs';
import { DIFFICULTIES, generate } from '../src/app/core/engine/generator';
import { culprit, solve } from '../src/app/core/engine/solver';
import { THEME_LIST } from '../src/app/core/data/deduction-themes';
import { DeductionCase } from '../src/app/core/models/deduction.models';

const PER_DIFF = 20;
const out: { id: string; difficulty: string; index: number; theme: string; case: DeductionCase }[] = [];
for (const d of DIFFICULTIES) {
  for (let i = 1; i <= PER_DIFF; i++) {
    const theme = THEME_LIST[(i - 1) % THEME_LIST.length];
    let c: DeductionCase | null = null;
    for (let v = 0; !c && v < 20; v++) c = generate({ themeId: theme.id, difficulty: d.id, seed: `lvl-${d.code}-${i}-${v}` });
    if (!c) throw new Error(`échec ${d.id} #${i}`);
    const sols = solve(c, 2);
    if (sols.length !== 1 || !culprit(c, sols[0])) throw new Error(`invalide ${d.id} #${i}`);
    const id = `${d.id}-${String(i).padStart(2, '0')}`;
    c.id = id; delete c.share;
    c.title = `${theme.name} · ${d.label}`;
    out.push({ id, difficulty: d.id, index: i, theme: theme.id, case: c });
  }
  console.log(`${d.label}: ${PER_DIFF} niveaux`);
}
const body = `// Fichier généré par tools/build-levels.ts — ne pas modifier à la main.
import { LevelDef } from '../models/deduction.models';

export const LEVELS: LevelDef[] = ${JSON.stringify(out)} as LevelDef[];
`;
writeFileSync('src/app/core/data/levels.data.ts', body);
console.log(`→ src/app/core/data/levels.data.ts (${(body.length / 1024).toFixed(0)} Ko)`);
