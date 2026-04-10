import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { ExpenseCategory } from '../models/expense.model';
import { Budget, BudgetStatus } from '../models/budget.model';
import { ExpenseService } from './expense.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);
  private readonly _budgets = signal<Budget[]>(this.loadFromStorage());
  private notifiedThisMonth = new Set<string>(); // track warnings already shown

  readonly budgets = this._budgets.asReadonly();

  /** Current month spending per category vs budget limit */
  readonly budgetStatuses = computed((): BudgetStatus[] => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const monthExpenses = this.expenseService.expenses().filter(e => {
      if (e.type !== 'expense') return false;
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    return this._budgets().map(budget => {
      const spent = monthExpenses
        .filter(e => e.category === budget.category)
        .reduce((s, e) => s + e.amount, 0);
      const percentage = budget.monthlyLimit > 0
        ? Math.round((spent / budget.monthlyLimit) * 1000) / 10
        : 0;
      return {
        budget,
        spent: Math.round(spent * 100) / 100,
        percentage,
        remaining: Math.round((budget.monthlyLimit - spent) * 100) / 100,
      };
    }).sort((a, b) => b.percentage - a.percentage);
  });

  /** Budgets that are at or above 80% */
  readonly warningBudgets = computed(() =>
    this.budgetStatuses().filter(s => s.percentage >= 80)
  );

  constructor() {
    // Watch for budget threshold crossings and notify
    effect(() => {
      for (const status of this.budgetStatuses()) {
        const key = `${status.budget.id}-${status.percentage >= 100 ? '100' : '80'}`;
        if (status.percentage >= 100 && !this.notifiedThisMonth.has(key)) {
          this.notifiedThisMonth.add(key);
          this.notification.error(
            `Budget exceeded! ${status.budget.category} is at ${status.percentage}%`
          );
        } else if (status.percentage >= 80 && status.percentage < 100 && !this.notifiedThisMonth.has(key)) {
          this.notifiedThisMonth.add(key);
          this.notification.warning(
            `Budget warning: ${status.budget.category} is at ${status.percentage}%`
          );
        }
      }
    });
  }

  setBudget(category: ExpenseCategory, monthlyLimit: number): void {
    const existing = this._budgets().find(b => b.category === category);
    let updated: Budget[];
    if (existing) {
      updated = this._budgets().map(b =>
        b.id === existing.id ? { ...b, monthlyLimit } : b
      );
    } else {
      const budget: Budget = {
        id: `bgt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category,
        monthlyLimit,
        createdAt: new Date().toISOString(),
      };
      updated = [...this._budgets(), budget];
    }
    this._budgets.set(updated);
    this.persist(updated);
  }

  removeBudget(category: ExpenseCategory): void {
    const updated = this._budgets().filter(b => b.category !== category);
    this._budgets.set(updated);
    this.persist(updated);
  }

  getBudgetForCategory(category: ExpenseCategory): Budget | undefined {
    return this._budgets().find(b => b.category === category);
  }

  private loadFromStorage(): Budget[] {
    try {
      const stored = localStorage.getItem('fp_budgets');
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  }

  private persist(budgets: Budget[]): void {
    try {
      localStorage.setItem('fp_budgets', JSON.stringify(budgets));
    } catch { /* ignore */ }
  }
}
