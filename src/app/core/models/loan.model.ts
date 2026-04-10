export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface Loan {
  id: string;
  title: string;         // e.g. "Home Loan - Siddhartha", "Lent to Ram"
  type: 'borrowed' | 'lent';  // borrowed = got money, lent = gave money
  amount: number;         // principal
  accountId: string;      // which account the money went to/from
  date: string;
  notes?: string;
  payments: LoanPayment[];
  fromSplit?: boolean;  // true = created from quick split (no initial money flow)
  createdAt: string;
}

export interface LoanStatus {
  loan: Loan;
  totalPaid: number;
  outstanding: number;    // positive = still owes
  percentage: number;     // 0-100 — how much resolved
}
