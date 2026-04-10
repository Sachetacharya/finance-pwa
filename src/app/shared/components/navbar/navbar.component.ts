import { Component, inject, output, input, signal, computed, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { PwaService } from '../../../core/services/pwa.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AccountService } from '../../../core/services/account.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { LockScrollDirective } from '../../directives/lock-scroll.directive';
import { NgIcon } from '@ng-icons/core';
import { Expense, ALL_CATEGORY_LABELS } from '../../../core/models/expense.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CurrencyFormatPipe, ConfirmDialogComponent, LockScrollDirective, NgIcon],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  sidebarOpen = input<boolean>(false);
  toggleSidebar = output<void>();

  readonly auth = inject(AuthService);
  readonly pwa = inject(PwaService);
  readonly accountService = inject(AccountService);
  private readonly expenseService = inject(ExpenseService);
  private readonly router = inject(Router);
  readonly showBalances = signal(false);
  readonly showLogoutConfirm = signal(false);
  readonly showSearch = signal(false);
  readonly searchQuery = signal('');

  readonly searchResults = computed((): Expense[] => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q || q.length < 2) return [];
    const labels = this.accountService.paymentLabels();
    return this.expenseService.expenses()
      .filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.notes ?? '').toLowerCase().includes(q) ||
        (ALL_CATEGORY_LABELS[e.category] ?? '').toLowerCase().includes(q) ||
        (labels[e.paymentMethod] ?? '').toLowerCase().includes(q)
      )
      .slice(0, 8);
  });

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') this.closeSearch();
      return;
    }
    if (e.key === '/' || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      this.openSearch();
    }
  }

  openSearch(): void {
    this.showSearch.set(true);
    this.searchQuery.set('');
    setTimeout(() => document.querySelector<HTMLInputElement>('.global-search__input')?.focus(), 50);
  }

  closeSearch(): void {
    this.showSearch.set(false);
    this.searchQuery.set('');
  }

  goToResult(expense: Expense): void {
    this.closeSearch();
    this.router.navigate(['/expenses'], { queryParams: { search: expense.title } });
  }

  toggleBalances(): void {
    this.showBalances.update(v => !v);
  }

  confirmLogout(): void {
    this.showLogoutConfirm.set(true);
  }

  onLogout(): void {
    this.showLogoutConfirm.set(false);
    this.auth.logout();
  }
}
