// Valide le générateur : unicité, coupable non livré, temps. Usage : npm run check:engine
import { DIFFICULTIES, generate } from '../src/app/core/engine/generator';
import { culprit, solve } from '../src/app/core/engine/solver';
import { THEME_LIST } from '../src/app/core/data/deduction-themes';

const N = +(process.argv[2] ?? 8);
for (const d of DIFFICULTIES) {
  let ok = 0, fail = 0, clues = 0, maxMs = 0, total = 0;
  for (const t of THEME_LIST) {
    for (let s = 0; s < N; s++) {
      const t0 = Date.now();
      const c = generate({ themeId: t.id, difficulty: d.id, seed: `chk-${s}` });
      const ms = Date.now() - t0; total += ms; maxMs = Math.max(maxMs, ms);
      if (!c) { fail++; continue; }
      const sols = solve(c, 2);
      if (sols.length !== 1 || !culprit(c, sols[0])) { fail++; console.log('INVALIDE', c.id); continue; }
      ok++; clues += c.clues.length;
    }
  }
  const runs = ok + fail;
  console.log(`${d.label.padEnd(14)} ${d.size}x${d.size}  ${ok}/${runs} ok  ~${(clues / Math.max(ok, 1)).toFixed(1)} indices  moy ${(total / runs).toFixed(0)}ms  max ${maxMs}ms`);
}
