import { Injectable, inject, signal, computed } from '@angular/core';
import { Loan, LoanPayment, LoanStatus } from '../models/loan.model';
import { ExpenseService } from './expense.service';

@Injectable({ providedIn: 'root' })
export class LoanService {
  private readonly expenseService = inject(ExpenseService);
  private readonly _loans = signal<Loan[]>(this.loadFromStorage());

  readonly loans = this._loans.asReadonly();
  readonly borrowedLoans = computed(() => this._loans().filter(l => l.type === 'borrowed'));
  readonly lentLoans = computed(() => this._loans().filter(l => l.type === 'lent'));

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

  readonly activeLoans = computed(() =>
    this.loanStatuses().filter(s => s.outstanding > 0)
  );

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
   * @param skipExpense true for quick split (component handles expense separately)
   */
  addLoan(data: Omit<Loan, 'id' | 'payments' | 'createdAt'>, skipExpense = false): Loan {
    const loan: Loan = {
      ...data,
      id: `loan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      payments: [],
      createdAt: new Date().toISOString(),
    };
    const updated = [...this._loans(), loan];
    this._loans.set(updated);
    this.persist(updated);

    if (!skipExpense) {
      if (data.type === 'borrowed') {
        // Money entered my account → income
        this.expenseService.addExpense({
          type: 'income',
          title: `Loan received — ${data.title}`,
          amount: data.amount,
          category: 'other-income',
          date: data.date,
          paymentMethod: data.accountId,
          notes: data.notes,
        });
      } else {
        // Money left my account → expense
        this.expenseService.addExpense({
          type: 'expense',
          title: `Lent — ${data.title}`,
          amount: data.amount,
          category: 'other',
          date: data.date,
          paymentMethod: data.accountId,
          notes: data.notes,
        });
      }
    }

    return loan;
  }

  addPayment(loanId: string, amount: number, date: string, notes?: string): void {
    const loan = this._loans().find(l => l.id === loanId);
    if (!loan) return;

    const payment: LoanPayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      amount,
      date,
      notes,
    };

    const updated = this._loans().map(l =>
      l.id === loanId ? { ...l, payments: [...l.payments, payment] } : l
    );
    this._loans.set(updated);
    this.persist(updated);

    // Payment = real money movement → always create expense/income
    if (loan.type === 'borrowed') {
      // Paying back → money leaves my account → expense
      this.expenseService.addExpense({
        type: 'expense',
        title: `Loan payment — ${loan.title}`,
        amount,
        category: 'other',
        date,
        paymentMethod: loan.accountId,
        notes,
      });
    } else {
      // Receiving repayment → money enters my account → income
      this.expenseService.addExpense({
        type: 'income',
        title: `Repayment received — ${loan.title}`,
        amount,
        category: 'other-income',
        date,
        paymentMethod: loan.accountId,
        notes,
      });
    }
  }

  updateLoan(id: string, title: string, amount: number, notes?: string): void {
    const updated = this._loans().map(l =>
      l.id === id ? { ...l, title, amount, notes } : l
    );
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
