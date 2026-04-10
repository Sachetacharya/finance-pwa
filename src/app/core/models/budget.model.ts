import { ExpenseCategory } from './expense.model';

export interface Budget {
  id: string;
  category: ExpenseCategory;
  monthlyLimit: number;
  createdAt: string;
}

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  percentage: number; // 0-100+
  remaining: number;
}
