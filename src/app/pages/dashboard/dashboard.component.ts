import { Component, inject, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ExpenseService } from '../../core/services/expense.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { BudgetService } from '../../core/services/budget.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { ExpenseFormComponent } from '../../shared/components/expense-form/expense-form.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { NgIcon } from '@ng-icons/core';
import { Expense, CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS, ALL_CATEGORY_LABELS, ALL_CATEGORY_ICONS } from '../../core/models/expense.model';
import { formatCurrency } from '../../shared/utils/currency.utils';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, StatCardComponent, ChartComponent, ExpenseFormComponent, CurrencyFormatPipe, NgIcon],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly expenseService = inject(ExpenseService);
  readonly auth = inject(AuthService);
  readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);
  private readonly fmt = inject(CurrencyFormatPipe);

  readonly showAddForm = signal(false);

  readonly monthChangePct = computed(() => {
    const prev = this.expenseService.previousMonthTotal();
    const curr = this.expenseService.currentMonthTotal();
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  });

  readonly recentExpenses = computed(() => this.expenseService.expenses().slice(0, 8));

  readonly pieChartData = computed((): ChartConfiguration['data'] => {
    const cats = this.expenseService.categoryTotals().slice(0, 7);
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

  readonly barChartData = computed((): ChartConfiguration['data'] => {
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

  readonly pieOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: { position: 'bottom', labels: { padding: 14, usePointStyle: true, font: { size: 11 } } },
      tooltip: { callbacks: { label: ctx => ` ${formatCurrency(ctx.raw as number)} (${ctx.label})` } },
    },
  };

  readonly barOptions: ChartConfiguration['options'] = {
    plugins: { legend: { display: true, position: 'top', labels: { usePointStyle: true, font: { size: 11 } } } },
    scales: { y: { beginAtZero: true, ticks: { callback: v => formatCurrency(Number(v)) } } },
  };

  readonly categoryLabels = CATEGORY_LABELS;
  readonly categoryIcons = CATEGORY_ICONS;
  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;

  onAddExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): void {
    this.expenseService.addExpense(data);
    this.showAddForm.set(false);
    this.notification.success(`${data.type === 'income' ? 'Income' : 'Expense'} added successfully! ✓`);
  }
}
