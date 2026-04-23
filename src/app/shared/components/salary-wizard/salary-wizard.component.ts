import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { LockScrollDirective } from '../../directives/lock-scroll.directive';
import { AccountService } from '../../../core/services/account.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { BudgetService } from '../../../core/services/budget.service';
import { NotificationService } from '../../../core/services/notification.service';

type AllocationKind = 'expense' | 'transfer';

interface AllocationRow {
  id: string;
  label: string;
  kind: AllocationKind;      // 'expense' = logs as expense; 'transfer' = moves between accounts
  toAccountId: string;       // transfer dest ('' = keep in salary account); ignored for expense
  category?: string;         // only used when kind === 'expense'
  amount: number;
  reservedNote?: string;     // if set on a transfer, bumps the destination's reservedAmount
  compulsory?: boolean;      // locked monthly obligation — shown with a badge
}

@Component({
  selector: 'app-salary-wizard',
  standalone: true,
  imports: [FormsModule, NgIcon, CurrencyFormatPipe, LockScrollDirective],
  templateUrl: './salary-wizard.component.html',
  styleUrl: './salary-wizard.component.scss',
})
export class SalaryWizardComponent {
  salaryAccountId = input<string>('');
  closed = output<void>();

  private readonly accountService = inject(AccountService);
  private readonly expenseService = inject(ExpenseService);
  private readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);

  salaryAmount = 95200;
  executionDate = this.localDateStr(new Date());
  nextPaydayDate = '';

  private localDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  readonly allocations = signal<AllocationRow[]>([]);

  readonly accounts = computed(() =>
    this.accountService.accounts().map(a => ({ id: a.id, name: a.name, type: a.type }))
  );

  readonly totalAllocated = computed(() =>
    this.allocations().reduce((s, a) => s + (Number(a.amount) || 0), 0)
  );

  readonly remaining = computed(() =>
    Math.round((this.salaryAmount - this.totalAllocated()) * 100) / 100
  );

  ngOnInit(): void {
    // Suggested next payday = ~30 days from execution
    const next = new Date(this.executionDate);
    next.setDate(next.getDate() + 30);
    this.nextPaydayDate = this.localDateStr(next);

    // Default allocation template — user can edit any row
    const acc = this.accountService.accounts();
    const global = acc.find(a => a.name.toLowerCase().includes('global'));

    this.allocations.set([
      // ── Compulsory monthly obligations (expenses) ──
      { id: 'ghar',      label: 'Ghar (send to parents)',  kind: 'expense',  toAccountId: '', category: 'housing',  amount: 20000, compulsory: true },
      { id: 'rent-pay',  label: 'Rent (landlord)',         kind: 'expense',  toAccountId: '', category: 'housing',  amount: 10000, compulsory: true },
      { id: 'gym',       label: 'Gym',                     kind: 'expense',  toAccountId: '', category: 'personal', amount: 3000,  compulsory: true },
      // ── Account transfers ──
      { id: 'emergency', label: 'Emergency fund (locked)', kind: 'transfer', toAccountId: global?.id ?? '',     amount: 10000, reservedNote: 'Emergency fund' },
      { id: 'savings',   label: 'Savings goal',            kind: 'transfer', toAccountId: global?.id ?? '',     amount: 17000, reservedNote: 'Savings' },
      { id: 'investment',label: 'Investment',              kind: 'transfer', toAccountId: global?.id ?? '',     amount: 5000 },
      // ── Keep the rest in salary account for the cycle ──
      { id: 'budget',    label: 'Remaining for the month', kind: 'transfer', toAccountId: '',                   amount: 30200 },
    ]);
  }

  addAllocation(): void {
    this.allocations.update(list => [...list, {
      id: `custom-${Date.now()}`,
      label: 'Custom allocation',
      kind: 'transfer',
      toAccountId: '',
      amount: 0,
    }]);
  }

  removeAllocation(id: string): void {
    this.allocations.update(list => list.filter(a => a.id !== id));
  }

  /** Patch a single field of a row through the signal so computed totals refresh */
  updateRow(id: string, patch: Partial<AllocationRow>): void {
    this.allocations.update(list => list.map(a => a.id === id ? { ...a, ...patch } : a));
  }

  execute(): void {
    const salaryId = this.salaryAccountId();
    if (!salaryId) {
      this.notification.error('No salary account selected');
      return;
    }
    if (this.remaining() < -0.5) {
      this.notification.error('Allocations exceed salary amount');
      return;
    }

    // 1. Record salary as income
    this.expenseService.addExpense({
      type: 'income',
      title: 'Monthly salary',
      amount: this.salaryAmount,
      category: 'salary',
      date: this.executionDate,
      paymentMethod: salaryId,
    });

    // 2. Execute expenses, transfers, and reserved bumps
    let expenses = 0, transfers = 0;
    for (const a of this.allocations()) {
      const amt = Number(a.amount) || 0;
      if (amt <= 0) continue;

      if (a.kind === 'expense') {
        this.expenseService.addExpense({
          type: 'expense',
          title: a.label,
          amount: amt,
          category: (a.category as any) ?? 'other',
          date: this.executionDate,
          paymentMethod: salaryId,
        });
        expenses++;
        continue;
      }

      // kind === 'transfer'
      if (!a.toAccountId) continue; // keeps money in salary account

      this.accountService.transfer(salaryId, a.toAccountId, amt, this.executionDate, a.label);
      transfers++;

      if (a.reservedNote) {
        const acc = this.accountService.accounts().find(x => x.id === a.toAccountId);
        const current = acc?.reservedAmount ?? 0;
        this.accountService.updateReserved(a.toAccountId, current + amt, a.reservedNote);
      }
    }

    // 3. Roll the budget cycle forward
    if (this.nextPaydayDate) {
      this.budgetService.setPaydayDate(this.nextPaydayDate);
    }
    this.budgetService.setCycleStartDate(this.executionDate);

    this.notification.success(`Salary processed — ${expenses} expense${expenses === 1 ? '' : 's'} + ${transfers} transfer${transfers === 1 ? '' : 's'}`);
    this.closed.emit();
  }
}
