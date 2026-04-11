export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'wallet';
  initialBalance: number;
  color: string; // hex color e.g. '#6366f1'
  createdAt: string;
}
