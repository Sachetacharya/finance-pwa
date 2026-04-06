import { Component, inject, computed } from '@angular/core';
import { ExpenseService } from '../../core/services/expense.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import {
  CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS,
  INCOME_SOURCE_LABELS, INCOME_SOURCE_ICONS,
} from '../../core/models/expense.model';
import { formatCurrency } from '../../shared/utils/currency.utils';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [StatCardComponent, ChartComponent, CurrencyFormatPipe],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  readonly expenseService = inject(ExpenseService);
  readonly categoryLabels = CATEGORY_LABELS;
  readonly categoryIcons = CATEGORY_ICONS;
  readonly incomeSourceLabels = INCOME_SOURCE_LABELS;
  readonly incomeSourceIcons = INCOME_SOURCE_ICONS;

  readonly avgMonthlyExpense = computed(() => {
    const totals = this.expenseService.monthlyTotals();
    if (!totals.length) return 0;
    return totals.reduce((s, m) => s + m.total, 0) / totals.length;
  });

  readonly avgMonthlyIncome = computed(() => {
    const totals = this.expenseService.monthlyIncomeTotals();
    if (!totals.length) return 0;
    return totals.reduce((s, m) => s + m.total, 0) / totals.length;
  });

  readonly highestExpenseMonth = computed(() => {
    const totals = this.expenseService.monthlyTotals();
    if (!totals.length) return null;
    return totals.reduce((max, m) => m.total > max.total ? m : max);
  });

  readonly topCategory = computed(() => this.expenseService.categoryTotals()[0] ?? null);
  readonly topIncomeSource = computed(() => this.expenseService.incomeSourceTotals()[0] ?? null);

  // Monthly income vs expense grouped bar
  readonly monthlyCompareData = computed((): ChartConfiguration['data'] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expTotals = this.expenseService.monthlyTotals();
    const incTotals = this.expenseService.monthlyIncomeTotals();

    // Build unified sorted label list
    const keySet = new Set<string>([
      ...expTotals.map(m => `${m.year}-${months.indexOf(m.month)}`),
      ...incTotals.map(m => `${m.year}-${months.indexOf(m.month)}`),
    ]);
    const keys = Array.from(keySet).sort((a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return ay !== by ? ay - by : am - bm;
    });

    const expMap = new Map(expTotals.map(m => [`${m.year}-${months.indexOf(m.month)}`, m.total]));
    const incMap = new Map(incTotals.map(m => [`${m.year}-${months.indexOf(m.month)}`, m.total]));

    return {
      labels: keys.map(k => {
        const [y, m] = k.split('-').map(Number);
        return `${months[m]} ${y}`;
      }),
      datasets: [
        {
          label: 'Expenses',
          data: keys.map(k => expMap.get(k) ?? 0),
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderColor: '#ef4444',
          borderWidth: 2,
          borderRadius: 6,
        },
        {
          label: 'Income',
          data: keys.map(k => incMap.get(k) ?? 0),
          backgroundColor: 'rgba(34, 197, 94, 0.75)',
          borderColor: '#22c55e',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  });

  readonly categoryPieData = computed((): ChartConfiguration['data'] => {
    const cats = this.expenseService.categoryTotals();
    return {
      labels: cats.map(c => CATEGORY_LABELS[c.category]),
      datasets: [{
        data: cats.map(c => c.total),
        backgroundColor: cats.map(c => CATEGORY_COLORS[c.category]),
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 0,
      }],
    };
  });

  readonly incomeSourcePieData = computed((): ChartConfiguration['data'] => {
    const sources = this.expenseService.incomeSourceTotals();
    const colors = ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#bbf7d0', '#6ee7b7', '#34d399'];
    return {
      labels: sources.map(s => INCOME_SOURCE_LABELS[s.source]),
      datasets: [{
        data: sources.map(s => s.total),
        backgroundColor: sources.map((_, i) => colors[i % colors.length]),
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 0,
      }],
    };
  });

  readonly dailyLineData = computed((): ChartConfiguration['data'] => {
    const now = new Date();
    const labels: string[] = [];
    const expenseData: number[] = [];
    const incomeData: number[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRecords = this.expenseService.expenses().filter(e => e.date === dateStr);
      labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      expenseData.push(Math.round(dayRecords.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0) * 100) / 100);
      incomeData.push(Math.round(dayRecords.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0) * 100) / 100);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.06)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#ef4444',
          pointHoverRadius: 5,
        },
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.06)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointBackgroundColor: '#22c55e',
          pointHoverRadius: 5,
        },
      ],
    };
  });

  readonly paymentMethodData = computed((): ChartConfiguration['data'] => {
    const map = new Map<string, number>();
    this.expenseService.expenses().filter(e => e.type !== 'income').forEach(e => {
      map.set(e.paymentMethod, (map.get(e.paymentMethod) ?? 0) + e.amount);
    });
    const entries = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, Math.round(v * 100) / 100] as [string, number]);
    const labels: Record<string, string> = {
      cash: 'Cash', card: 'Card',
      'bank-siddhartha': 'Siddhartha Bank', 'bank-nabil': 'Nabil Bank',
      'bank-kumari': 'Kumari Bank', 'bank-global': 'Global IME Bank',
      esewa: 'eSewa', khalti: 'Khalti',
    };
    return {
      labels: entries.map(e => labels[e[0]] ?? e[0]),
      datasets: [{
        label: 'Amount Spent',
        data: entries.map(e => e[1]),
        backgroundColor: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6'],
        borderRadius: 6,
        borderWidth: 0,
      }],
    };
  });

  readonly barOptions: ChartConfiguration['options'] = {
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { callback: v => formatCurrency(Number(v)) } } },
  };

  readonly groupedBarOptions: ChartConfiguration['options'] = {
    plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, font: { size: 11 } } } },
    scales: { y: { beginAtZero: true, ticks: { callback: v => formatCurrency(Number(v)) } } },
  };

  readonly pieOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: { position: 'right', labels: { padding: 12, usePointStyle: true, font: { size: 11 } } },
    },
  };

  readonly lineOptions: ChartConfiguration['options'] = {
    plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, font: { size: 11 } } } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: v => formatCurrency(Number(v)) } },
      x: { ticks: { maxRotation: 45, font: { size: 10 } } },
    },
  };
}
