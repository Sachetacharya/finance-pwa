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
import { ExpensesFiltersComponent } from './expenses-filters/expenses-filters.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { TableColumn } from '../../shared/components/data-table/cell-registry';
import {
  Expense,
  ExpenseFilter,
  ExpenseCategory,
  IncomeSource,
  CATEGORY_LABELS,
  INCOME_SOURCE_LABELS,
  ALL_CATEGORY_LABELS,
  ALL_CATEGORY_ICONS,
} from '../../core/models/expense.model';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [FormsModule, ExpenseFormComponent, ConfirmDialogComponent, CurrencyFormatPipe, PrivacyMaskPipe, NgIcon, ExpensesFiltersComponent, DataTableComponent],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent {
  readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);
  private readonly exportService = inject(ExportService);

  getCategoryIcon(cat: string): string { return (this.allCategoryIcons as any)[cat] ?? 'lucidePackage'; }
  getCategoryLabel(cat: string): string { return (this.allCategoryLabels as any)[cat] ?? cat; }

  expenseRowClass = (e: any) => {
    if (e.type === 'income') return 'et-row--income';
    if (e.type === 'transfer') return 'et-row--transfer';
    return 'et-row--expense';
  };

  readonly expenseColumns: TableColumn[] = [
    { key: 'date', label: 'Date', cell: 'date', sortable: true },
    { key: 'title', label: 'Title', cell: 'text', sortable: true, class: 'dt-bold' },
    { key: 'categoryLabel', label: 'Category', cell: 'badge', sortable: true, hideOnMobile: true, icon: 'categoryIcon' },
    { key: 'amount', label: 'Amount', cell: 'amount', sortable: true },
    { key: 'paymentMethod', label: 'Payment', cell: 'payment', sortable: true, hideOnMobile: true },
    { key: 'notes', label: 'Notes', cell: 'text', hideOnMobile: true, class: 'dt-date' },
    { key: 'actions', label: '', cell: 'actions', actions: [
      { type: 'edit', icon: 'lucidePencil', label: 'Edit', class: 'dt-act--edit' },
      { type: 'delete', icon: 'lucideTrash2', label: 'Delete', class: 'dt-act--delete' },
    ]},
  ];

  /** Data enriched with category icon/label for badge cell */
  readonly enrichedExpenses = computed(() =>
    this.filteredExpenses().map(e => ({
      ...e,
      categoryIcon: this.getCategoryIcon(e.category),
      categoryLabel: this.getCategoryLabel(e.category),
    }))
  );

  onExpenseAction(event: { type: string; row: any }): void {
    switch (event.type) {
      case 'edit': this.editingExpense.set(event.row); break;
      case 'delete': this.deletingExpenseId.set(event.row.id); break;
    }
  }

  readonly filter = signal<ExpenseFilter>({ search: '', type: '', category: '', paymentMethod: '' });

  readonly showAddForm = signal(false);
  readonly showFilters = signal(false);
  readonly editingExpense = signal<Expense | null>(null);
  readonly deletingExpenseId = signal<string | null>(null);

  readonly accountService = inject(AccountService);

  readonly categories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];
  readonly incomeSources = Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][];
  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;

  readonly activeFilterCount = computed(() => {
    const f = this.filter();
    return [f.search, f.type, f.category, f.paymentMethod, f.startDate, f.endDate,
      f.minAmount !== undefined, f.maxAmount !== undefined].filter(Boolean).length;
  });

  readonly filteredExpenses = computed(() => this.expenseService.getFilteredExpenses(this.filter()));

  readonly totalFiltered = computed(() => this.filteredExpenses().length);

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
    this.filteredExpenses().filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  );
  readonly totalIncome = computed(() =>
    this.filteredExpenses().filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  );

  onFilterChange(key: any, value: string): void {
    this.filter.update(f => ({ ...f, [key]: value }));
  }

  onAmountChange(key: any, value: any): void {
    this.filter.update(f => ({ ...f, [key]: value }));
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
    this.exportService.exportToCSV(this.filteredExpenses());
    this.notification.success('Expenses exported to CSV ✓');
  }

  exportPrint(): void {
    this.exportService.exportToPrint(this.filteredExpenses());
  }

  clearFilters(): void {
    this.filter.set({ search: '', type: '', category: '', paymentMethod: '', startDate: '', endDate: '', minAmount: undefined, maxAmount: undefined });
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
      case '/':
        e.preventDefault();
        document.querySelector<HTMLInputElement>('.search-input')?.focus();
        break;
    }
  }
}
