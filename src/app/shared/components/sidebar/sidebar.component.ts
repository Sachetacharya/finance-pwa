import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  isOpen = input<boolean>(false);
  closed = output<void>();
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }

  readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/expenses', label: 'Expenses', icon: '💳' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
    { path: '/recurring', label: 'Recurring', icon: '🔄' },
    { path: '/budgets', label: 'Budgets', icon: '📋' },
    { path: '/loans', label: 'Loans', icon: '🤝' },
    { path: '/accounts', label: 'Accounts', icon: '🏦' },
  ];

  onNavClick(): void {
    if (window.innerWidth < 768) this.closed.emit();
  }
}
