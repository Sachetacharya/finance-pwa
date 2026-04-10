import { Injectable, inject, signal } from '@angular/core';
import { RecurringTransaction } from '../models/recurring.model';
import { ExpenseService } from './expense.service';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  private readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);
  private readonly _items = signal<RecurringTransaction[]>(this.loadFromStorage());

  readonly items = this._items.asReadonly();

  constructor() {
    this.processDue();
  }

  add(data: Omit<RecurringTransaction, 'id' | 'createdAt'>): RecurringTransaction {
    const item: RecurringTransaction = {
      ...data,
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...this._items(), item];
    this._items.set(updated);
    this.persist(updated);
    return item;
  }

  remove(id: string): void {
    const updated = this._items().filter(r => r.id !== id);
    this._items.set(updated);
    this.persist(updated);
  }

  toggleEnabled(id: string): void {
    const updated = this._items().map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    this._items.set(updated);
    this.persist(updated);
  }

  /** Process all due recurring transactions (called on app startup) */
  private processDue(): void {
    const today = new Date().toISOString().split('T')[0];
    let count = 0;
    const updated = this._items().map(item => {
      if (!item.enabled) return item;

      let nextDate = item.nextDate;
      // Create transactions for all missed dates up to today
      while (nextDate <= today) {
        this.expenseService.addExpense({
          type: item.type,
          title: item.title,
          amount: item.amount,
          category: item.category,
          date: nextDate,
          paymentMethod: item.paymentMethod,
          notes: item.notes ? `${item.notes} (recurring)` : '(recurring)',
        });
        count++;
        nextDate = this.advanceDate(nextDate, item.frequency);
      }

      return nextDate !== item.nextDate ? { ...item, nextDate } : item;
    });

    if (count > 0) {
      this._items.set(updated);
      this.persist(updated);
      this.notification.info(`${count} recurring transaction${count > 1 ? 's' : ''} created`);
    }
  }

  private advanceDate(dateStr: string, frequency: 'weekly' | 'monthly'): string {
    const d = new Date(dateStr + 'T00:00:00');
    if (frequency === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    return d.toISOString().split('T')[0];
  }

  private loadFromStorage(): RecurringTransaction[] {
    try {
      const stored = localStorage.getItem('fp_recurring');
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  }

  private persist(items: RecurringTransaction[]): void {
    try {
      localStorage.setItem('fp_recurring', JSON.stringify(items));
    } catch { /* ignore */ }
  }
}
