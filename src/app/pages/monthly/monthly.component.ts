import { Component, inject, signal, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { ExpenseService } from '../../core/services/expense.service';
import { AccountService } from '../../core/services/account.service';
import {
  Expense, ExpenseCategory, IncomeSource,
  CATEGORY_LABELS, INCOME_SOURCE_LABELS,
  ALL_CATEGORY_LABELS, ALL_CATEGORY_ICONS,
} from '../../core/models/expense.model';

@Component({
  selector: 'app-monthly',
  standalone: true,
  imports: [NgIcon, CurrencyFormatPipe, PrivacyMaskPipe],
  templateUrl: './monthly.component.html',
  styleUrl: './monthly.component.scss',
})
export class MonthlyComponent {
  private readonly exp = inject(ExpenseService);
  readonly accountService = inject(AccountService);
  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;

  // Current selected month
  readonly selectedYear = signal(new Date().getFullYear());
  readonly selectedMonth = signal(new Date().getMonth()); // 0-indexed

  readonly monthLabel = computed(() => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[this.selectedMonth()]} ${this.selectedYear()}`;
  });

  prevMonth(): void {
    if (this.selectedMonth() === 0) {
      this.selectedMonth.set(11);
      this.selectedYear.update(y => y - 1);
    } else {
      this.selectedMonth.update(m => m - 1);
    }
  }

  nextMonth(): void {
    if (this.selectedMonth() === 11) {
      this.selectedMonth.set(0);
      this.selectedYear.update(y => y + 1);
    } else {
      this.selectedMonth.update(m => m + 1);
    }
  }

  // Filtered transactions for selected month
  private readonly monthTransactions = computed(() => {
    const m = this.selectedMonth();
    const y = this.selectedYear();
    return this.exp.expenses().filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m && d.getFullYear() === y && e.type !== 'transfer';
    });
  });

  readonly monthIncome = computed(() =>
    this.monthTransactions().filter(e => e.type === 'income')
      .sort((a, b) => a.date.localeCompare(b.date))
  );

  readonly monthExpenses = computed(() =>
    this.monthTransactions().filter(e => e.type === 'expense')
      .sort((a, b) => a.date.localeCompare(b.date))
  );

  readonly totalIncome = computed(() =>
    Math.round(this.monthIncome().reduce((s, e) => s + e.amount, 0) * 100) / 100
  );

  readonly totalExpense = computed(() =>
    Math.round(this.monthExpenses().reduce((s, e) => s + e.amount, 0) * 100) / 100
  );

  readonly savings = computed(() =>
    Math.round((this.totalIncome() - this.totalExpense()) * 100) / 100
  );

  readonly savingsRate = computed(() =>
    this.totalIncome() > 0 ? Math.round((this.savings() / this.totalIncome()) * 1000) / 10 : 0
  );

  // Expenses grouped by category
  readonly expensesByCategory = computed(() => {
    const map = new Map<string, { label: string; icon: string; items: Expense[]; total: number }>();
    this.monthExpenses().forEach(e => {
      if (!map.has(e.category)) {
        map.set(e.category, {
          label: ALL_CATEGORY_LABELS[e.category] ?? e.category,
          icon: ALL_CATEGORY_ICONS[e.category] ?? 'lucidePackage',
          items: [],
          total: 0,
        });
      }
      const group = map.get(e.category)!;
      group.items.push(e);
      group.total += e.amount;
    });
    return Array.from(map.values())
      .map(g => ({ ...g, total: Math.round(g.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);
  });

  // Account breakdown for this month
  readonly accountBreakdown = computed(() => {
    const map = new Map<string, { income: number; expense: number }>();
    this.monthTransactions().forEach(e => {
      if (!map.has(e.paymentMethod)) map.set(e.paymentMethod, { income: 0, expense: 0 });
      const entry = map.get(e.paymentMethod)!;
      if (e.type === 'income') entry.income += e.amount;
      else entry.expense += e.amount;
    });
    return Array.from(map.entries()).map(([id, data]) => ({
      id,
      label: this.accountService.getLabel(id),
      color: this.accountService.getColor(id),
      income: Math.round(data.income * 100) / 100,
      expense: Math.round(data.expense * 100) / 100,
      net: Math.round((data.income - data.expense) * 100) / 100,
    })).sort((a, b) => b.expense - a.expense);
  });

  readonly hasData = computed(() => this.monthTransactions().length > 0);
}
