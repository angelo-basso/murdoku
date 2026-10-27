import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'game/:caseId',
    loadComponent: () =>
      import('./pages/game/game.page').then((m) => m.GamePage),
  },
  {
    path: 'deduction/gen/:code',
    loadComponent: () =>
      import('./pages/deduction/deduction.page').then((m) => m.DeductionPage),
  },
  {
    path: 'deduction/:caseId',
    loadComponent: () =>
      import('./pages/deduction/deduction.page').then((m) => m.DeductionPage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
