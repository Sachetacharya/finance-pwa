export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'wallet';
  initialBalance: number;
  color: string; // hex color e.g. '#6366f1'
  createdAt: string;
  reservedAmount?: number;   // locked funds not available for daily spending
  reservedNote?: string;     // e.g. "Rent", "Emergency fund"
}
