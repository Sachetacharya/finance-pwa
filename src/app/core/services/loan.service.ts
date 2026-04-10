import { Injectable, signal, computed } from '@angular/core';
import { Loan, LoanPayment, LoanStatus } from '../models/loan.model';

@Injectable({ providedIn: 'root' })
export class LoanService {
  private readonly _loans = signal<Loan[]>(this.loadFromStorage());

  readonly loans = this._loans.asReadonly();
  readonly borrowedLoans = computed(() => this._loans().filter(l => l.type === 'borrowed'));
  readonly lentLoans = computed(() => this._loans().filter(l => l.type === 'lent'));

  /** Status for every loan with outstanding calculation */
  readonly loanStatuses = computed((): LoanStatus[] =>
    this._loans().map(loan => {
      const totalPaid = loan.payments.reduce((s, p) => s + p.amount, 0);
      const outstanding = Math.round((loan.amount - totalPaid) * 100) / 100;
      const percentage = loan.amount > 0
        ? Math.round((totalPaid / loan.amount) * 1000) / 10
        : 0;
      return { loan, totalPaid, outstanding, percentage };
    })
  );

  /** Only active (not fully resolved) loans */
  readonly activeLoans = computed(() =>
    this.loanStatuses().filter(s => s.outstanding > 0)
  );

  /** Summary totals */
  readonly totalBorrowedOutstanding = computed(() =>
    this.loanStatuses()
      .filter(s => s.loan.type === 'borrowed' && s.outstanding > 0)
      .reduce((s, l) => s + l.outstanding, 0)
  );

  readonly totalLentOutstanding = computed(() =>
    this.loanStatuses()
      .filter(s => s.loan.type === 'lent' && s.outstanding > 0)
      .reduce((s, l) => s + l.outstanding, 0)
  );

  /**
   * Balance impact per account from loans.
   * Borrowed: +principal, -payments (net = +outstanding)
   * Lent: -principal, +payments (net = -outstanding)
   */
  getBalanceImpact(): Record<string, number> {
    const impact: Record<string, number> = {};
    for (const loan of this._loans()) {
      const totalPaid = loan.payments.reduce((s, p) => s + p.amount, 0);
      if (loan.type === 'borrowed') {
        // Got money into account, payments take money out
        impact[loan.accountId] = (impact[loan.accountId] ?? 0) + loan.amount - totalPaid;
      } else {
        // Gave money from account, payments bring money back
        impact[loan.accountId] = (impact[loan.accountId] ?? 0) - loan.amount + totalPaid;
      }
    }
    return impact;
  }

  addLoan(data: Omit<Loan, 'id' | 'payments' | 'createdAt'>): Loan {
    const loan: Loan = {
      ...data,
      id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      payments: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...this._loans(), loan];
    this._loans.set(updated);
    this.persist(updated);
    return loan;
  }

  addPayment(loanId: string, amount: number, date: string, notes?: string): void {
    const updated = this._loans().map(l => {
      if (l.id !== loanId) return l;
      const payment: LoanPayment = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        amount,
        date,
        notes,
      };
      return { ...l, payments: [...l.payments, payment] };
    });
    this._loans.set(updated);
    this.persist(updated);
  }

  removeLoan(id: string): void {
    const updated = this._loans().filter(l => l.id !== id);
    this._loans.set(updated);
    this.persist(updated);
  }

  private loadFromStorage(): Loan[] {
    try {
      const stored = localStorage.getItem('fp_loans');
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  }

  private persist(loans: Loan[]): void {
    try {
      localStorage.setItem('fp_loans', JSON.stringify(loans));
    } catch { /* ignore */ }
  }
}
