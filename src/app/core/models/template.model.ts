import { RecordCategory } from './expense.model';

export interface TransactionTemplate {
  id: string;
  name: string;          // e.g. "Morning Coffee", "Bus Fare"
  type: 'expense' | 'income';
  amount: number;
  category: RecordCategory;
  paymentMethod: string;
  title: string;          // pre-filled transaction title
  notes?: string;
  createdAt: string;
}
