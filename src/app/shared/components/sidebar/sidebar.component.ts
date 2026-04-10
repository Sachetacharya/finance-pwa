import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { ThemeService } from '../../../core/services/theme.service';

interface NavItem {
  path: string;
  label: string;
  icon: string; // lucide icon name
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, NgIcon],
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
    { path: '/dashboard', label: 'Dashboard', icon: 'lucideLayoutDashboard' },
    { path: '/expenses', label: 'Expenses', icon: 'lucideReceipt' },
    { path: '/analytics', label: 'Analytics', icon: 'lucideBarChart3' },
    { path: '/templates', label: 'Templates', icon: 'lucideZap' },
    { path: '/recurring', label: 'Recurring', icon: 'lucideRepeat' },
    { path: '/budgets', label: 'Budgets', icon: 'lucideTarget' },
    { path: '/loans', label: 'Loans', icon: 'lucideHandshake' },
    { path: '/accounts', label: 'Accounts', icon: 'lucideLandmark' },
  ];

  onNavClick(): void {
    if (window.innerWidth < 768) this.closed.emit();
  }
}
