import { Injectable, signal, computed } from '@angular/core';
import {
  Expense,
  ExpenseCategory,
  IncomeSource,
  ExpenseFilter,
  MonthlyTotal,
  CategoryTotal,
} from '../models/expense.model';

export interface IncomeSourceTotal {
  source: IncomeSource;
  total: number;
  percentage: number;
  count: number;
}

@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly _expenses = signal<Expense[]>(this.loadFromStorage());

  readonly expenses = this._expenses.asReadonly();

  readonly totalAmount = computed(() =>
    this._expenses().filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0)
  );

  readonly totalIncome = computed(() =>
    this._expenses().filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0)
  );

  readonly netBalance = computed(() => this.totalIncome() - this.totalAmount());

  readonly currentMonthExpenses = computed(() => {
    const now = new Date();
    return this._expenses().filter(e => {
      if (e.type !== 'expense') return false;
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  });

  readonly currentMonthIncome = computed(() => {
    const now = new Date();
    return this._expenses()
      .filter(e => {
        if (e.type !== 'income') return false;
        const d = new Date(e.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly currentMonthTotal = computed(() =>
    this.currentMonthExpenses().reduce((sum, e) => sum + e.amount, 0)
  );

  readonly previousMonthTotal = computed(() => {
    const now = new Date();
    const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const py = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return this._expenses()
      .filter(e => {
        if (e.type !== 'expense') return false;
        const d = new Date(e.date);
        return d.getMonth() === pm && d.getFullYear() === py;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  });

  readonly monthlyTotals = computed((): MonthlyTotal[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = new Map<string, MonthlyTotal>();
    this._expenses().filter(e => e.type === 'expense').forEach(expense => {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, { month: months[d.getMonth()], year: d.getFullYear(), total: 0, count: 0 });
      }
      const item = map.get(key)!;
      item.total = Math.round((item.total + expense.amount) * 100) / 100;
      item.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  });

  readonly categoryTotals = computed((): CategoryTotal[] => {
    const map = new Map<ExpenseCategory, { total: number; count: number }>();
    const expenseEntries = this._expenses().filter(e => e.type === 'expense');
    const grandTotal = expenseEntries.reduce((sum, e) => sum + e.amount, 0);
    expenseEntries.forEach(e => {
      const cat = e.category as ExpenseCategory;
      if (!map.has(cat)) map.set(cat, { total: 0, count: 0 });
      const item = map.get(cat)!;
      item.total += e.amount;
      item.count += 1;
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({
        category,
        total: Math.round(data.total * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 1000) / 10 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);
  });

  readonly monthlyIncomeTotals = computed((): MonthlyTotal[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const map = new Map<string, MonthlyTotal>();
    this._expenses().filter(e => e.type === 'income').forEach(expense => {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) {
        map.set(key, { month: months[d.getMonth()], year: d.getFullYear(), total: 0, count: 0 });
      }
      const item = map.get(key)!;
      item.total = Math.round((item.total + expense.amount) * 100) / 100;
      item.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  });

  readonly incomeSourceTotals = computed((): IncomeSourceTotal[] => {
    const map = new Map<IncomeSource, { total: number; count: number }>();
    const incomeEntries = this._expenses().filter(e => e.type === 'income');
    const grandTotal = incomeEntries.reduce((sum, e) => sum + e.amount, 0);
    incomeEntries.forEach(e => {
      const src = e.category as IncomeSource;
      if (!map.has(src)) map.set(src, { total: 0, count: 0 });
      const item = map.get(src)!;
      item.total += e.amount;
      item.count += 1;
    });
    return Array.from(map.entries())
      .map(([source, data]) => ({
        source,
        total: Math.round(data.total * 100) / 100,
        percentage: grandTotal > 0 ? Math.round((data.total / grandTotal) * 1000) / 10 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);
  });

  private loadFromStorage(): Expense[] {
    try {
      const stored = localStorage.getItem('fp_expenses');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old records that pre-date the type field
        const pmMigrate: Record<string, string> = {
          'card': 'deleted-account',
          'credit-card': 'deleted-account',
          'debit-card': 'deleted-account',
          'bank-siddhartha': 'deleted-account',
          'bank-nabil': 'deleted-account',
          'bank-kumari': 'deleted-account',
          'bank-global': 'deleted-account',
          'bank-transfer': 'deleted-account',
          'esewa': 'deleted-account',
          'khalti': 'deleted-account',
          'digital-wallet': 'deleted-account',
        };
        const catMigrate: Record<string, string> = { rental: 'return-pay', business: 'other-income' };
        return parsed.map((e: Expense) => ({
          ...e,
          type: e.type === 'income' ? 'income' : e.type === 'transfer' ? 'transfer' : 'expense',
          paymentMethod: pmMigrate[e.paymentMethod] ?? e.paymentMethod,
          category: catMigrate[e.category] ?? e.category,
        }));
      }
    } catch { /* ignore */ }
    localStorage.setItem('fp_expenses', JSON.stringify([]));
    return [];
  }

  private persist(expenses: Expense[]): void {
    try {
      localStorage.setItem('fp_expenses', JSON.stringify(expenses));
    } catch { /* ignore quota errors */ }
  }

  getFilteredExpenses(filter: ExpenseFilter): Expense[] {
    return this._expenses().filter(e => {
      if (filter.type && e.type !== filter.type) return false;
      if (filter.search) {
        const s = filter.search.toLowerCase();
        if (!e.title.toLowerCase().includes(s) && !e.notes?.toLowerCase().includes(s)) return false;
      }
      if (filter.category && e.category !== filter.category) return false;
      if (filter.paymentMethod && e.paymentMethod !== filter.paymentMethod) return false;
      if (filter.startDate && e.date < filter.startDate) return false;
      if (filter.endDate && e.date > filter.endDate) return false;
      if (filter.minAmount !== undefined && e.amount < filter.minAmount) return false;
      if (filter.maxAmount !== undefined && e.amount > filter.maxAmount) return false;
      return true;
    });
  }

  addExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense {
    const expense: Expense = {
      ...data,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [expense, ...this._expenses()];
    this._expenses.set(updated);
    this.persist(updated);
    return expense;
  }

  updateExpense(id: string, data: Partial<Omit<Expense, 'id' | 'createdAt'>>): Expense | null {
    const list = this._expenses();
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) return null;
    const updated = [...list];
    updated[idx] = { ...updated[idx], ...data, updatedAt: new Date().toISOString() };
    this._expenses.set(updated);
    this.persist(updated);
    return updated[idx];
  }

  deleteExpense(id: string): boolean {
    const list = this._expenses();
    const filtered = list.filter(e => e.id !== id);
    if (filtered.length === list.length) return false;
    this._expenses.set(filtered);
    this.persist(filtered);
    return true;
  }

  getExpenseById(id: string): Expense | undefined {
    return this._expenses().find(e => e.id === id);
  }

  migratePaymentMethod(from: string, to: string): void {
    const list = this._expenses();
    const updated = list.map(e =>
      e.paymentMethod === from ? { ...e, paymentMethod: to, updatedAt: new Date().toISOString() } : e
    );
    this._expenses.set(updated);
    this.persist(updated);
  }

  resetData(): void {
    this._expenses.set([]);
    this.persist([]);
  }
}
