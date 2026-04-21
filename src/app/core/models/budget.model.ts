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

export interface BudgetSettings {
  overallLimit: number;      // total spending cap for the cycle (0 = disabled)
  savingsGoal: number;       // target savings for the cycle (0 = disabled)
  paydayDate: string;        // ISO date of next expected salary (empty = disabled)
  cycleStartDate: string;    // ISO date — budgets/goals count from this date (empty = use calendar month)
}

export interface PaydayStatus {
  paydayDate: string;
  daysUntilPayday: number;   // 0 if today or past
  totalBalance: number;      // sum of account balances
  dailyAllowance: number;    // totalBalance / max(daysUntilPayday, 1)
  spentToday: number;        // expenses recorded with date = today
  remainingToday: number;    // dailyAllowance - spentToday
}

export interface OverallStatus {
  limit: number;
  spent: number;
  percentage: number;
  remaining: number;
}

export interface SavingsStatus {
  goal: number;
  income: number;
  expenses: number;
  saved: number;          // income - expenses this month
  percentage: number;     // saved / goal
}
