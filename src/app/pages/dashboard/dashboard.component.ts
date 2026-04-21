import { Component, inject, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ExpenseService } from '../../core/services/expense.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { BudgetService } from '../../core/services/budget.service';
import { TemplateService } from '../../core/services/template.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { ExpenseFormComponent } from '../../shared/components/expense-form/expense-form.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { NgIcon } from '@ng-icons/core';
import { FormsModule } from '@angular/forms';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { PrivacyService } from '../../core/services/privacy.service';
import { AccountService } from '../../core/services/account.service';
import { TransactionTemplate } from '../../core/models/template.model';
import { Expense, CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_ICONS, ALL_CATEGORY_LABELS, ALL_CATEGORY_ICONS } from '../../core/models/expense.model';
import { formatCurrency } from '../../shared/utils/currency.utils';
import { ChartConfiguration } from 'chart.js';
import { DashboardQuickAddComponent } from './dashboard-quick-add/dashboard-quick-add.component';
import { SalaryWizardComponent } from '../../shared/components/salary-wizard/salary-wizard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, StatCardComponent, ChartComponent, ExpenseFormComponent, CurrencyFormatPipe, PrivacyMaskPipe, NgIcon, FormsModule, LockScrollDirective, DashboardQuickAddComponent, SalaryWizardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  readonly expenseService = inject(ExpenseService);
  readonly auth = inject(AuthService);
  readonly budgetService = inject(BudgetService);
  readonly templateService = inject(TemplateService);
  readonly accountService = inject(AccountService);
  private readonly notification = inject(NotificationService);
  private readonly fmt = inject(CurrencyFormatPipe);

  readonly privacy = inject(PrivacyService);
  readonly showAddForm = signal(false);
  readonly showSalaryWizard = signal(false);
  readonly usingTemplate = signal<TransactionTemplate | null>(null);

  /** Best-guess salary account: looks for "kumari" or "salary" in account names, falls back to the first account */
  readonly salaryAccountId = computed((): string => {
    const accs = this.accountService.accounts();
    const match = accs.find(a =>
      a.name.toLowerCase().includes('kumari') ||
      a.name.toLowerCase().includes('salary')
    );
    return match?.id ?? accs[0]?.id ?? '';
  });
  useAmount: number | null = null;
  useAccount = '';

  get allAccounts() {
    return [
      { id: 'cash', name: 'Cash' },
      ...this.accountService.accounts().map(a => ({ id: a.id, name: a.name })),
    ];
  }

  readonly monthChangePct = computed(() => {
    const prev = this.expenseService.previousMonthTotal();
    const curr = this.expenseService.currentMonthTotal();
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  });

  readonly totalRemaining = computed(() => {
    const balances = this.accountService.accountBalances();
    return Object.values(balances).reduce((sum, b) => sum + b, 0);
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

  quickUseTemplate(id: string): void {
    this.templateService.useTemplate(id);
    this.notification.success('Added');
  }

  openUseTemplate(id: string): void {
    const tpl = this.templateService.templates().find(t => t.id === id);
    if (!tpl) return;
    this.usingTemplate.set(tpl);
    this.useAmount = tpl.amount;
    this.useAccount = tpl.paymentMethod;
  }

  confirmUseTemplate(): void {
    const tpl = this.usingTemplate();
    if (!tpl || !this.useAmount || !this.useAccount) return;
    this.expenseService.addExpense({
      type: tpl.type,
      title: tpl.title,
      amount: this.useAmount,
      category: tpl.category,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: this.useAccount,
      notes: tpl.notes,
    });
    this.notification.success('Added from template');
    this.usingTemplate.set(null);
  }

  onAddExpense(data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): void {
    this.expenseService.addExpense(data);
    this.showAddForm.set(false);
    this.notification.success(`${data.type === 'income' ? 'Income' : 'Expense'} added successfully! ✓`);
  }
}
