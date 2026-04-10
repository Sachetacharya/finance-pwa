export interface Account {
  id: string;
  name: string;
  type: 'bank' | 'wallet';
  initialBalance: number;
  createdAt: string;
}
