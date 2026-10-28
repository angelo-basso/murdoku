import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DIFFICULTIES } from './engine/generator';
import { ProgressService } from './services/progress.service';

/** Le mode « sur mesure » s'ouvre une fois une difficulté entièrement terminée. */
export const customUnlockedGuard: CanActivateFn = async () => {
  const progress = inject(ProgressService);
  const router = inject(Router); // inject() doit précéder tout await
  await progress.load();
  return DIFFICULTIES.some((d) => progress.generatorUnlocked(d.id)) || router.parseUrl('/home');
};
