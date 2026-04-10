import { RecordCategory } from './expense.model';

export interface RecurringTransaction {
  id: string;
  title: string;
  type: 'expense' | 'income';
  amount: number;
  category: RecordCategory;
  paymentMethod: string;
  frequency: 'weekly' | 'monthly';
  nextDate: string; // YYYY-MM-DD — next date this should fire
  enabled: boolean;
  notes?: string;
  createdAt: string;
}
