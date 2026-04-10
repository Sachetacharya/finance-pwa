import { Injectable, inject, signal, computed } from '@angular/core';
import { Account } from '../models/account.model';
import { ExpenseService } from './expense.service';
import { LoanService } from './loan.service';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly expenseService = inject(ExpenseService);
  private readonly loanService = inject(LoanService);
  private readonly _accounts = signal<Account[]>(this.loadFromStorage());

  readonly accounts = this._accounts.asReadonly();

  readonly bankAccounts = computed(() => this._accounts().filter(a => a.type === 'bank'));
  readonly walletAccounts = computed(() => this._accounts().filter(a => a.type === 'wallet'));

  /** Label lookup: account id → display name (includes cash + deleted-account) */
  readonly paymentLabels = computed(() => {
    const map: Record<string, string> = { cash: 'Cash', 'deleted-account': 'Deleted Account' };
    for (const acc of this._accounts()) {
      map[acc.id] = acc.name;
    }
    return map;
  });

  /** Balance for every account + cash, keyed by id */
  readonly accountBalances = computed(() => {
    const all = this.expenseService.expenses();
    const balances: Record<string, number> = {};

    const adjust = (id: string, delta: number) => {
      balances[id] = (balances[id] ?? 0) + delta;
    };

    // Seed initial balances
    balances['cash'] = 0;
    for (const acc of this._accounts()) {
      balances[acc.id] = acc.initialBalance;
    }

    for (const e of all) {
      if (e.type === 'transfer') {
        // Source loses, destination gains
        adjust(e.paymentMethod, -e.amount);
        if (e.toAccount) adjust(e.toAccount, e.amount);
      } else if (e.type === 'income') {
        adjust(e.paymentMethod, e.amount);
      } else {
        adjust(e.paymentMethod, -e.amount);
      }
    }

    // Add loan impact (borrowed adds money, lent removes money)
    const loanImpact = this.loanService.getBalanceImpact();
    for (const [id, amount] of Object.entries(loanImpact)) {
      balances[id] = (balances[id] ?? 0) + amount;
    }

    // Round all
    for (const k of Object.keys(balances)) {
      balances[k] = Math.round(balances[k] * 100) / 100;
    }

    return balances;
  });

  addAccount(name: string, type: 'bank' | 'wallet', initialBalance: number): Account {
    const account: Account = {
      id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      type,
      initialBalance,
      createdAt: new Date().toISOString(),
    };
    const updated = [...this._accounts(), account];
    this._accounts.set(updated);
    this.persist(updated);
    return account;
  }

  transfer(fromId: string, toId: string, amount: number, date: string, notes?: string): void {
    const fromLabel = this.getLabel(fromId);
    const toLabel = this.getLabel(toId);
    this.expenseService.addExpense({
      type: 'transfer',
      title: `${fromLabel} → ${toLabel}`,
      amount,
      category: 'transfer',
      date,
      paymentMethod: fromId,
      toAccount: toId,
      notes,
    });
  }

  deleteAccount(id: string): void {
    // Migrate all transactions for this account to 'deleted-account'
    this.expenseService.migratePaymentMethod(id, 'deleted-account');
    const updated = this._accounts().filter(a => a.id !== id);
    this._accounts.set(updated);
    this.persist(updated);
  }

  getLabel(paymentMethod: string): string {
    return this.paymentLabels()[paymentMethod] ?? paymentMethod;
  }

  private loadFromStorage(): Account[] {
    try {
      const stored = localStorage.getItem('fp_accounts');
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  }

  private persist(accounts: Account[]): void {
    try {
      localStorage.setItem('fp_accounts', JSON.stringify(accounts));
    } catch { /* ignore quota errors */ }
  }
}
