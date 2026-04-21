import { Injectable, inject, signal } from '@angular/core';
import { TransactionTemplate } from '../models/template.model';
import { ExpenseService } from './expense.service';

@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly expenseService = inject(ExpenseService);
  private readonly _templates = signal<TransactionTemplate[]>(this.loadFromStorage());

  readonly templates = this._templates.asReadonly();

  addTemplate(data: Omit<TransactionTemplate, 'id' | 'createdAt'>): TransactionTemplate {
    const template: TransactionTemplate = {
      ...data,
      id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...this._templates(), template];
    this._templates.set(updated);
    this.persist(updated);
    return template;
  }

  removeTemplate(id: string): void {
    const updated = this._templates().filter(t => t.id !== id);
    this._templates.set(updated);
    this.persist(updated);
  }

  /** Use a template to instantly create a transaction for today */
  useTemplate(id: string): void {
    const tpl = this._templates().find(t => t.id === id);
    if (!tpl) return;
    this.expenseService.addExpense({
      type: tpl.type,
      title: tpl.title,
      amount: tpl.amount,
      category: tpl.category,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: tpl.paymentMethod,
      notes: tpl.notes,
    });
  }

  private loadFromStorage(): TransactionTemplate[] {
    try {
      const stored = localStorage.getItem('fp_templates');
      if (stored) {
        const catMigrate: Record<string, string> = {
          transport: 'travel-transport',
          travel: 'travel-transport',
          utilities: 'bills',
          entertainment: 'other',
          education: 'other',
          health: 'personal',
          freelance: 'other-income',
          gift: 'other-income',
        };
        return JSON.parse(stored).map((t: TransactionTemplate) => ({
          ...t,
          category: (catMigrate[t.category as string] ?? t.category) as any,
        }));
      }
    } catch { /* ignore */ }
    return [];
  }

  private persist(templates: TransactionTemplate[]): void {
    try {
      localStorage.setItem('fp_templates', JSON.stringify(templates));
    } catch { /* ignore */ }
  }
}
