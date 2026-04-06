import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/login/login.component').then(m => m.LoginComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./pages/expenses/expenses.component').then(m => m.ExpensesComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
