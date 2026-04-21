export type ExpenseCategory =
  | 'food' | 'travel-transport' | 'shopping' | 'bills'
  | 'housing' | 'personal' | 'loans-debt' | 'fees-charges'
  | 'investment' | 'other';

export type IncomeSource =
  | 'salary' | 'investment' | 'return-pay' | 'other-income';

export type RecordCategory = ExpenseCategory | IncomeSource | 'transfer';

export interface Expense {
  id: string;
  type: 'expense' | 'income' | 'transfer';
  title: string;
  amount: number;
  category: RecordCategory;
  date: string;
  paymentMethod: string; // 'cash' | account id | 'deleted-account'
  toAccount?: string;    // destination account for transfers
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseFilter {
  search?: string;
  type?: 'expense' | 'income' | 'transfer' | '';
  category?: RecordCategory | '';
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface MonthlyTotal {
  month: string;
  year: number;
  total: number;
  count: number;
}

export interface CategoryTotal {
  category: ExpenseCategory;
  total: number;
  percentage: number;
  count: number;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Food & Dining',
  'travel-transport': 'Travel & Transport',
  shopping: 'Shopping',
  bills: 'Bills & Recharge',
  housing: 'Housing & Rent',
  personal: 'Personal Care',
  'loans-debt': 'Loans & Debt',
  'fees-charges': 'Fees & Charges',
  investment: 'Investment',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: 'lucideUtensilsCrossed',
  'travel-transport': 'lucideCar',
  shopping: 'lucideShoppingBag',
  bills: 'lucideZap',
  housing: 'lucideHome',
  personal: 'lucideUser',
  'loans-debt': 'lucideHandshake',
  'fees-charges': 'lucideBanknote',
  investment: 'lucideTrendingUp',
  other: 'lucidePackage',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#FF6384',
  'travel-transport': '#36A2EB',
  shopping: '#4BC0C0',
  bills: '#FF9F40',
  housing: '#C9CBCF',
  personal: '#FFCE56',
  'loans-debt': '#9966FF',
  'fees-charges': '#FF6384',
  investment: '#10B981',
  other: '#94A3B8',
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Salary',
  investment: 'Investment',
  'return-pay': 'Return Pay',
  'other-income': 'Other Income',
};

export const INCOME_SOURCE_ICONS: Record<IncomeSource, string> = {
  salary: 'lucideBriefcase',
  investment: 'lucideTrendingUp',
  'return-pay': 'lucideRefreshCw',
  'other-income': 'lucideCircleDollarSign',
};

export const ALL_CATEGORY_LABELS: Record<RecordCategory, string> = {
  ...CATEGORY_LABELS,
  ...INCOME_SOURCE_LABELS,
  transfer: 'Transfer',
};

export const ALL_CATEGORY_ICONS: Record<RecordCategory, string> = {
  ...CATEGORY_ICONS,
  ...INCOME_SOURCE_ICONS,
  transfer: 'lucideArrowRightLeft',
};
