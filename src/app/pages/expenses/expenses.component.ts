import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { NotificationService } from '../../core/services/notification.service';
import { ExportService } from '../../core/services/export.service';
import { ExpenseFormComponent } from '../../shared/components/expense-form/expense-form.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { NgIcon } from '@ng-icons/core';
import {
  Expense,
  ExpenseFilter,
  ExpenseCategory,
  IncomeSource,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  INCOME_SOURCE_LABELS,
  INCOME_SOURCE_ICONS,
  ALL_CATEGORY_LABELS,
  ALL_CATEGORY_ICONS,
} from '../../core/models/expense.model';
import { AccountService } from '../../core/services/account.service';

type SortField = 'date' | 'title' | 'category' | 'amount' | 'paymentMethod';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule, ExpenseFormComponent, ConfirmDialogComponent, CurrencyFormatPipe, PrivacyMaskPipe, NgIcon],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent {
  readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);
  private readonly exportService = inject(ExportService);

  readonly filter = signal<ExpenseFilter>({ search: '', type: '', category: '', paymentMethod: '' });
  readonly sortField = signal<SortField>('date');
  readonly sortDir = signal<SortDir>('desc');
  readonly currentPage = signal(1);
  readonly pageSize = 10;

  readonly showAddForm = signal(false);
  readonly showFilters = signal(false);
  readonly editingExpense = signal<Expense | null>(null);
  readonly deletingExpenseId = signal<string | null>(null);

  readonly accountService = inject(AccountService);

  readonly categories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];
  readonly incomeSources = Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][];
  readonly categoryLabels = CATEGORY_LABELS;
  readonly categoryIcons = CATEGORY_ICONS;
  readonly incomeSourceLabels = INCOME_SOURCE_LABELS;
  readonly incomeSourceIcons = INCOME_SOURCE_ICONS;
  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;

  readonly filteredCategories = computed(() =>
    this.filter().type === 'income' ? this.incomeSources : this.categories
  );

  readonly activeFilterCount = computed(() => {
    const f = this.filter();
    return [f.search, f.type, f.category, f.paymentMethod, f.startDate, f.endDate,
      f.minAmount !== undefined, f.maxAmount !== undefined].filter(Boolean).length;
  });

  readonly filteredSorted = computed(() => {
    const f = this.filter();
    let items = this.expenseService.getFilteredExpenses(f);

    const field = this.sortField();
    const dir = this.sortDir();
    items = [...items].sort((a, b) => {
      let va: string | number = a[field] as string | number;
      let vb: string | number = b[field] as string | number;
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredSorted().length / this.pageSize))
  );

  readonly paginatedExpenses = computed(() => {
    const page = this.currentPage();
    const start = (page - 1) * this.pageSize;
    return this.filteredSorted().slice(start, start + this.pageSize);
  });

  readonly totalFiltered = computed(() => this.filteredSorted().length);

  /** Statement mode: shows running balance when a specific account is selected */
  readonly isStatementMode = computed(() => !!this.filter().paymentMethod && this.filter().paymentMethod !== '');

  readonly statementBalances = computed((): Map<string, { before: number; after: number }> => {
    const pm = this.filter().paymentMethod;
    if (!pm) return new Map();

    // Get initial balance for this account
    const accounts = this.accountService.accounts();
    const acc = accounts.find(a => a.id === pm);
    const initialBalance = acc ? acc.initialBalance : 0; // cash = 0

    // Get ALL transactions affecting this account, sorted date ASC (chronological)
    const allExpenses = this.expenseService.expenses();
    const relevant = allExpenses
      .filter(e => e.paymentMethod === pm || e.toAccount === pm)
      .sort((a, b) => {
        const dateDiff = a.date.localeCompare(b.date);
        return dateDiff !== 0 ? dateDiff : a.createdAt.localeCompare(b.createdAt);
      });

    // Compute running balance
    let balance = initialBalance;
    const balanceMap = new Map<string, { before: number; after: number }>();

    for (const e of relevant) {
      const before = Math.round(balance * 100) / 100;
      if (e.type === 'transfer') {
        if (e.paymentMethod === pm) balance -= e.amount; // money left
        if (e.toAccount === pm) balance += e.amount;     // money came
      } else if (e.type === 'income') {
        balance += e.amount;
      } else {
        balance -= e.amount;
      }
      balanceMap.set(e.id, { before, after: Math.round(balance * 100) / 100 });
    }

    return balanceMap;
  });
  readonly totalAmount = computed(() =>
    this.filteredSorted().filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0)
  );
  readonly totalIncome = computed(() =>
    this.filteredSorted().filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  );

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  getPaginationEnd(): number {
    return Math.min(this.currentPage() * this.pageSize, this.totalFiltered());
  }

  onFilterChange(key: keyof ExpenseFilter, value: string): void {
    this.filter.update(f => ({ ...f, [key]: value }));
    this.currentPage.set(1);
  }

  onAmountChange(key: 'minAmount' | 'maxAmount', value: string): void {
    const num = value === '' ? undefined : Number(value);
    this.filter.update(f => ({ ...f, [key]: num }));
    this.currentPage.set(1);
  }

  sort(field: SortField): void {
    if (this.sortField() === field) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDir.set('desc');
    }
    this.currentPage.set(1);
  }

  getSortIcon(field: SortField): string {
    if (this.sortField() !== field) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  onSave(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): void {
    const editing = this.editingExpense();
    const label = data.type === 'income' ? 'Income' : 'Expense';
    if (editing) {
      this.expenseService.updateExpense(editing.id, data);
      this.notification.success(`${label} updated ✓`);
      this.editingExpense.set(null);
    } else {
      this.expenseService.addExpense(data);
      this.notification.success(`${label} added ✓`);
      this.showAddForm.set(false);
    }
  }

  onDelete(): void {
    const id = this.deletingExpenseId();
    if (!id) return;
    this.expenseService.deleteExpense(id);
    this.notification.success('Transaction deleted');
    this.deletingExpenseId.set(null);
  }

  exportCSV(): void {
    this.exportService.exportToCSV(this.filteredSorted());
    this.notification.success('Expenses exported to CSV ✓');
  }

  exportPrint(): void {
    this.exportService.exportToPrint(this.filteredSorted());
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    document.querySelector('.expenses-table-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  clearFilters(): void {
    this.filter.set({ search: '', type: '', category: '', paymentMethod: '', startDate: '', endDate: '', minAmount: undefined, maxAmount: undefined });
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    const f = this.filter();
    return !!(f.search || f.type || f.category || f.paymentMethod || f.startDate || f.endDate || f.minAmount !== undefined || f.maxAmount !== undefined);
  }

  // === Swipe to delete (mobile) ===
  readonly swipeOffset = signal<Record<string, number>>({});

  getSwipeX(id: string): number {
    return this.swipeOffset()[id] || 0;
  }
  private touchStartX = 0;
  private touchCurrentId = '';
  private readonly SWIPE_THRESHOLD = -80;

  onTouchStart(e: TouchEvent, id: string): void {
    this.touchStartX = e.touches[0].clientX;
    this.touchCurrentId = id;
  }

  onTouchMove(e: TouchEvent, id: string): void {
    if (id !== this.touchCurrentId) return;
    const dx = e.touches[0].clientX - this.touchStartX;
    if (dx > 0) return; // only allow left swipe
    this.swipeOffset.update(o => ({ ...o, [id]: Math.max(dx, -100) }));
  }

  onTouchEnd(id: string): void {
    const offset = this.swipeOffset()[id] ?? 0;
    if (offset <= this.SWIPE_THRESHOLD) {
      this.deletingExpenseId.set(id);
    }
    this.swipeOffset.update(o => ({ ...o, [id]: 0 }));
  }

  // === Keyboard shortcuts ===
  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    // Ignore when typing in inputs
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    switch (e.key) {
      case 'n':
      case 'N':
        e.preventDefault();
        this.showAddForm.set(true);
        break;
      case 'Escape':
        this.showAddForm.set(false);
        this.editingExpense.set(null);
        this.deletingExpenseId.set(null);
        this.showFilters.set(false);
        break;
      case 'ArrowLeft':
        if (this.currentPage() > 1) this.goToPage(this.currentPage() - 1);
        break;
      case 'ArrowRight':
        if (this.currentPage() < this.totalPages()) this.goToPage(this.currentPage() + 1);
        break;
      case '/':
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.search-input')?.focus();
        break;
    }
  }
}
