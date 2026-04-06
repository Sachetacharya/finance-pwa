import { Injectable } from '@angular/core';
import { Expense, ALL_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '../models/expense.model';
import { formatCurrency } from '../../shared/utils/currency.utils';

@Injectable({ providedIn: 'root' })
export class ExportService {
  exportToCSV(expenses: Expense[], filename = 'expenses'): void {
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Notes'];
    const rows = expenses.map(e => [
      e.date,
      `"${e.title.replace(/"/g, '""')}"`,
      ALL_CATEGORY_LABELS[e.category],
      e.amount.toFixed(2),
      PAYMENT_METHOD_LABELS[e.paymentMethod],
      `"${(e.notes ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportToPrint(expenses: Expense[]): void {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const rows = expenses
      .map(
        e => `<tr>
        <td>${e.date}</td>
        <td>${e.title}</td>
        <td>${ALL_CATEGORY_LABELS[e.category]}</td>
        <td>${formatCurrency(e.amount)}</td>
        <td>${PAYMENT_METHOD_LABELS[e.paymentMethod]}</td>
        <td>${e.notes ?? '—'}</td>
      </tr>`
      )
      .join('');

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Expense Report</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    h1 { color: #6366f1; margin-bottom: 4px; }
    p { color: #64748b; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #6366f1; color: white; padding: 10px 12px; text-align: left; font-size: 0.8rem; }
    td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
    tr:nth-child(even) td { background: #f8fafc; }
    .total { font-weight: bold; font-size: 1rem; margin-top: 16px; color: #1e293b; }
  </style>
</head>
<body>
  <h1>💰 Expense Report</h1>
  <p>Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
  <table>
    <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th>Payment</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="total">Total: ${formatCurrency(total)} (${expenses.length} transactions)</p>
</body>
</html>`);
    win.document.close();
    win.print();
  }
}
