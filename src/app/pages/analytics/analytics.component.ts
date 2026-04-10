import { Component, inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExpenseService } from '../../core/services/expense.service';
import { AccountService } from '../../core/services/account.service';
import { BudgetService } from '../../core/services/budget.service';
import { LoanService } from '../../core/services/loan.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { NgIcon } from '@ng-icons/core';
import {
  CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS,
  INCOME_SOURCE_LABELS, INCOME_SOURCE_ICONS,
} from '../../core/models/expense.model';
import { formatCurrency } from '../../shared/utils/currency.utils';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [StatCardComponent, ChartComponent, CurrencyFormatPipe, NgIcon, FormsModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss',
})
export class AnalyticsComponent {
  readonly expenseService = inject(ExpenseService);
  private readonly accountService = inject(AccountService);
  readonly budgetService = inject(BudgetService);
  readonly loanService = inject(LoanService);
  readonly categoryLabels = CATEGORY_LABELS;
  readonly categoryIcons = CATEGORY_ICONS;
  readonly incomeSourceLabels = INCOME_SOURCE_LABELS;
  readonly incomeSourceIcons = INCOME_SOURCE_ICONS;

  readonly hasExpenses = computed(() => this.expenseService.expenses().some(e => e.type === 'expense'));
  readonly hasIncome = computed(() => this.expenseService.expenses().some(e => e.type === 'income'));
  readonly hasAnyData = computed(() => this.expenseService.expenses().some(e => e.type !== 'transfer'));

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

  // Spending by day of week
  readonly spendingByDayData = computed((): ChartConfiguration['data'] => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const totals = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    this.expenseService.expenses().filter(e => e.type === 'expense').forEach(e => {
      const day = new Date(e.date).getDay();
      totals[day] += e.amount;
      counts[day]++;
    });

    const maxTotal = Math.max(...totals);
    return {
      labels: days,
      datasets: [{
        label: 'Total Spent',
        data: totals.map(t => Math.round(t * 100) / 100),
        backgroundColor: totals.map(t => t === maxTotal && t > 0
          ? 'rgba(239, 68, 68, 0.8)' : 'rgba(99, 102, 241, 0.6)'),
        borderRadius: 6,
        borderWidth: 0,
      }],
    };
  });

  // Peak spending day
  readonly peakDay = computed(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const totals = new Array(7).fill(0);
    this.expenseService.expenses().filter(e => e.type === 'expense').forEach(e => {
      totals[new Date(e.date).getDay()] += e.amount;
    });
    const maxIdx = totals.indexOf(Math.max(...totals));
    return { day: days[maxIdx], amount: Math.round(totals[maxIdx] * 100) / 100 };
  });

  // Spending by time of day (using createdAt timestamp)
  readonly spendingByTimeData = computed((): ChartConfiguration['data'] => {
    const slots = ['Morning (6-12)', 'Afternoon (12-17)', 'Evening (17-21)', 'Night (21-6)'];
    const totals = [0, 0, 0, 0];
    const counts = [0, 0, 0, 0];

    this.expenseService.expenses().filter(e => e.type === 'expense').forEach(e => {
      const hour = new Date(e.createdAt).getHours();
      let slot: number;
      if (hour >= 6 && hour < 12) slot = 0;
      else if (hour >= 12 && hour < 17) slot = 1;
      else if (hour >= 17 && hour < 21) slot = 2;
      else slot = 3;
      totals[slot] += e.amount;
      counts[slot]++;
    });

    return {
      labels: slots,
      datasets: [{
        label: 'Amount',
        data: totals.map(t => Math.round(t * 100) / 100),
        backgroundColor: ['#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'],
        borderRadius: 6,
        borderWidth: 0,
      }],
    };
  });

  // Peak spending time
  readonly peakTime = computed(() => {
    const slots = ['Morning', 'Afternoon', 'Evening', 'Night'];
    const totals = [0, 0, 0, 0];
    this.expenseService.expenses().filter(e => e.type === 'expense').forEach(e => {
      const hour = new Date(e.createdAt).getHours();
      if (hour >= 6 && hour < 12) totals[0] += e.amount;
      else if (hour >= 12 && hour < 17) totals[1] += e.amount;
      else if (hour >= 17 && hour < 21) totals[2] += e.amount;
      else totals[3] += e.amount;
    });
    const maxIdx = totals.indexOf(Math.max(...totals));
    return { time: slots[maxIdx], amount: Math.round(totals[maxIdx] * 100) / 100 };
  });

  // Savings rate = (income - expense) / income * 100
  readonly savingsRate = computed(() => {
    const income = this.expenseService.totalIncome();
    const expense = this.expenseService.totalAmount();
    if (income === 0) return 0;
    return Math.round(((income - expense) / income) * 1000) / 10;
  });

  // Total transactions count
  readonly totalTransactions = computed(() =>
    this.expenseService.expenses().filter(e => e.type !== 'transfer').length
  );

  // Average transaction size
  readonly avgTransactionSize = computed(() => {
    const txns = this.expenseService.expenses().filter(e => e.type === 'expense');
    if (!txns.length) return 0;
    return Math.round(txns.reduce((s, e) => s + e.amount, 0) / txns.length);
  });

  // Biggest single expense
  readonly biggestExpense = computed(() => {
    const expenses = this.expenseService.expenses().filter(e => e.type === 'expense');
    if (!expenses.length) return null;
    return expenses.reduce((max, e) => e.amount > max.amount ? e : max);
  });

  // Week-over-week spending comparison
  readonly weeklyComparison = computed(() => {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);

    const thisWeekStr = thisWeekStart.toISOString().split('T')[0];
    const lastWeekStr = lastWeekStart.toISOString().split('T')[0];
    const todayStr = now.toISOString().split('T')[0];

    const thisWeek = this.expenseService.expenses()
      .filter(e => e.type === 'expense' && e.date >= thisWeekStr && e.date <= todayStr)
      .reduce((s, e) => s + e.amount, 0);
    const lastWeek = this.expenseService.expenses()
      .filter(e => e.type === 'expense' && e.date >= lastWeekStr && e.date < thisWeekStr)
      .reduce((s, e) => s + e.amount, 0);

    return { thisWeek, lastWeek, change: lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 1000) / 10 : 0 };
  });

  // Monthly savings trend (income - expense per month)
  readonly monthlySavingsData = computed((): ChartConfiguration['data'] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expTotals = this.expenseService.monthlyTotals();
    const incTotals = this.expenseService.monthlyIncomeTotals();

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

    const savings = keys.map(k => Math.round(((incMap.get(k) ?? 0) - (expMap.get(k) ?? 0)) * 100) / 100);

    return {
      labels: keys.map(k => {
        const [y, m] = k.split('-').map(Number);
        return `${months[m]} ${y}`;
      }),
      datasets: [{
        label: 'Savings',
        data: savings,
        backgroundColor: savings.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'),
        borderColor: savings.map(v => v >= 0 ? '#10b981' : '#ef4444'),
        borderWidth: 2,
        borderRadius: 6,
      }],
    };
  });

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
      const dayRecords = this.expenseService.expenses().filter(e => e.date === dateStr && e.type !== 'transfer');
      labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
      expenseData.push(Math.round(dayRecords.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0) * 100) / 100);
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
    this.expenseService.expenses().filter(e => e.type === 'expense').forEach(e => {
      map.set(e.paymentMethod, (map.get(e.paymentMethod) ?? 0) + e.amount);
    });
    const entries = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => [k, Math.round(v * 100) / 100] as [string, number]);
    const labels = this.accountService.paymentLabels();
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

  sortByAmount = (a: any, b: any) => b.amount - a.amount;

  // Spending by category over time (stacked bar)
  readonly categoryOverTimeData = computed((): ChartConfiguration['data'] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expenses = this.expenseService.expenses().filter(e => e.type === 'expense');
    const catSet = new Set<string>();
    const monthMap = new Map<string, Map<string, number>>();

    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      catSet.add(e.category);
      if (!monthMap.has(key)) monthMap.set(key, new Map());
      const cats = monthMap.get(key)!;
      cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
    });

    const keys = Array.from(monthMap.keys()).sort((a, b) => {
      const [ay, am] = a.split('-').map(Number);
      const [by, bm] = b.split('-').map(Number);
      return ay !== by ? ay - by : am - bm;
    }).slice(-6); // last 6 months

    const labels = keys.map(k => {
      const [y, m] = k.split('-').map(Number);
      return `${months[m]} ${y}`;
    });

    const colors = Object.values(CATEGORY_COLORS);
    const datasets = Array.from(catSet).map((cat, i) => ({
      label: CATEGORY_LABELS[cat as keyof typeof CATEGORY_LABELS] ?? cat,
      data: keys.map(k => Math.round((monthMap.get(k)?.get(cat) ?? 0) * 100) / 100),
      backgroundColor: colors[i % colors.length],
      borderRadius: 4,
      borderWidth: 0,
    }));

    return { labels, datasets };
  });

  readonly stackedBarOptions: ChartConfiguration['options'] = {
    plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, font: { size: 10 }, padding: 10 } } },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { callback: v => formatCurrency(Number(v)) } },
    },
  };

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
