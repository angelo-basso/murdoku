import { Routes } from '@angular/router';
import { customUnlockedGuard } from './core/guards';

export const routes: Routes = [
  { path: 'home', loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage) },
  { path: 'classique', loadComponent: () => import('./pages/classic/classic.page').then((m) => m.ClassicPage) },
  { path: 'sur-mesure', canActivate: [customUnlockedGuard], loadComponent: () => import('./pages/custom/custom.page').then((m) => m.CustomPage) },
  { path: 'reglages', loadComponent: () => import('./pages/settings/settings.page').then((m) => m.SettingsPage) },
  { path: 'boutique', loadComponent: () => import('./pages/shop/shop.page').then((m) => m.ShopPage) },
  { path: 'regles', loadComponent: () => import('./pages/rules/rules.page').then((m) => m.RulesPage) },
  { path: 'niveau/:id', loadComponent: () => import('./pages/deduction/deduction.page').then((m) => m.DeductionPage) },
  { path: 'deduction/gen/:code', canActivate: [customUnlockedGuard], loadComponent: () => import('./pages/deduction/deduction.page').then((m) => m.DeductionPage) },
  { path: 'deduction/:caseId', loadComponent: () => import('./pages/deduction/deduction.page').then((m) => m.DeductionPage) },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
];
