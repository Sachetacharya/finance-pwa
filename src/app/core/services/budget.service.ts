import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { ExpenseCategory } from '../models/expense.model';
import { Budget, BudgetStatus, BudgetSettings, OverallStatus, SavingsStatus } from '../models/budget.model';
import { ExpenseService } from './expense.service';
import { NotificationService } from './notification.service';

const SETTINGS_KEY = 'fp_budget_settings';
const DEFAULT_SETTINGS: BudgetSettings = { overallLimit: 0, savingsGoal: 0 };

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);
  private readonly _budgets = signal<Budget[]>(this.loadFromStorage());
  private readonly _settings = signal<BudgetSettings>(this.loadSettings());
  private notifiedThisMonth = new Set<string>(); // track warnings already shown

  readonly budgets = this._budgets.asReadonly();
  readonly settings = this._settings.asReadonly();

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

  /** Current month totals (expense + income) used by overall/savings trackers */
  private readonly monthTotals = computed(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    let income = 0, expenses = 0;
    for (const e of this.expenseService.expenses()) {
      const d = new Date(e.date);
      if (d.getMonth() !== m || d.getFullYear() !== y) continue;
      if (e.type === 'expense') expenses += e.amount;
      else if (e.type === 'income') income += e.amount;
    }
    return {
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
    };
  });

  /** Overall monthly spending vs the overall cap */
  readonly overallStatus = computed((): OverallStatus | null => {
    const limit = this._settings().overallLimit;
    if (limit <= 0) return null;
    const spent = this.monthTotals().expenses;
    const percentage = Math.round((spent / limit) * 1000) / 10;
    return {
      limit,
      spent,
      percentage,
      remaining: Math.round((limit - spent) * 100) / 100,
    };
  });

  /** Monthly savings vs the savings goal */
  readonly savingsStatus = computed((): SavingsStatus | null => {
    const goal = this._settings().savingsGoal;
    if (goal <= 0) return null;
    const { income, expenses } = this.monthTotals();
    const saved = Math.round((income - expenses) * 100) / 100;
    const percentage = goal > 0 ? Math.round((saved / goal) * 1000) / 10 : 0;
    return { goal, income, expenses, saved, percentage };
  });

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

  setOverallLimit(limit: number): void {
    const next = { ...this._settings(), overallLimit: Math.max(0, limit || 0) };
    this._settings.set(next);
    this.persistSettings(next);
  }

  setSavingsGoal(goal: number): void {
    const next = { ...this._settings(), savingsGoal: Math.max(0, goal || 0) };
    this._settings.set(next);
    this.persistSettings(next);
  }

  private loadFromStorage(): Budget[] {
    try {
      const stored = localStorage.getItem('fp_budgets');
      if (stored) {
        const catMigrate: Record<string, string> = {
          transport: 'travel-transport',
          travel: 'travel-transport',
          utilities: 'bills',
          entertainment: 'other',
          education: 'other',
          health: 'personal',
        };
        const parsed: Budget[] = JSON.parse(stored);
        // Remap + merge duplicates (e.g. old "travel" + "transport" → single "travel-transport")
        const byCat = new Map<string, Budget>();
        for (const b of parsed) {
          const cat = (catMigrate[b.category as string] ?? b.category) as any;
          const existing = byCat.get(cat);
          if (existing) {
            byCat.set(cat, { ...existing, monthlyLimit: existing.monthlyLimit + b.monthlyLimit });
          } else {
            byCat.set(cat, { ...b, category: cat });
          }
        }
        return [...byCat.values()];
      }
    } catch { /* ignore */ }
    return [];
  }

  private persist(budgets: Budget[]): void {
    try {
      localStorage.setItem('fp_budgets', JSON.stringify(budgets));
    } catch { /* ignore */ }
  }

  private loadSettings(): BudgetSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return { ...DEFAULT_SETTINGS };
  }

  private persistSettings(settings: BudgetSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch { /* ignore */ }
  }
}
