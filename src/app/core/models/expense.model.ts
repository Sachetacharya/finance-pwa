export type ExpenseCategory =
  | 'food' | 'transport' | 'entertainment' | 'shopping'
  | 'health' | 'utilities' | 'housing' | 'education'
  | 'travel' | 'personal' | 'other';

export type IncomeSource =
  | 'salary' | 'freelance' | 'investment' | 'return-pay' | 'gift' | 'other-income';

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
  transport: 'Transportation',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  health: 'Health & Medical',
  utilities: 'Utilities',
  housing: 'Housing & Rent',
  education: 'Education',
  travel: 'Travel',
  personal: 'Personal Care',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  food: 'lucideUtensilsCrossed',
  transport: 'lucideCar',
  entertainment: 'lucideFilm',
  shopping: 'lucideShoppingBag',
  health: 'lucideHeart',
  utilities: 'lucideZap',
  housing: 'lucideHome',
  education: 'lucideBookOpen',
  travel: 'lucidePlane',
  personal: 'lucideUser',
  other: 'lucidePackage',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#FF6384',
  transport: '#36A2EB',
  entertainment: '#FFCE56',
  shopping: '#4BC0C0',
  health: '#9966FF',
  utilities: '#FF9F40',
  housing: '#C9CBCF',
  education: '#4BC0C0',
  travel: '#36A2EB',
  personal: '#FFCE56',
  other: '#FF6384',
};

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  investment: 'Investment',
  'return-pay': 'Return Pay',
  gift: 'Gift',
  'other-income': 'Other Income',
};

export const INCOME_SOURCE_ICONS: Record<IncomeSource, string> = {
  salary: 'lucideBriefcase',
  freelance: 'lucideLaptop',
  investment: 'lucideTrendingUp',
  'return-pay': 'lucideRefreshCw',
  gift: 'lucideGift',
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
