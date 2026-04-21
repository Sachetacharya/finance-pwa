import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { LockScrollDirective } from '../../directives/lock-scroll.directive';
import { AccountService } from '../../../core/services/account.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { BudgetService } from '../../../core/services/budget.service';
import { NotificationService } from '../../../core/services/notification.service';

interface AllocationRow {
  id: string;
  label: string;
  toAccountId: string;       // '' = don't transfer, stays in salary account
  amount: number;
  reservedNote?: string;     // if set, bumps the destination account's reservedAmount
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
  executionDate = new Date().toISOString().split('T')[0];
  nextPaydayDate = '';

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
    this.nextPaydayDate = next.toISOString().split('T')[0];

    // Default allocation template — user can edit any row
    const acc = this.accountService.accounts();
    const nabil = acc.find(a => a.name.toLowerCase().includes('nabil'));
    const siddhartha = acc.find(a => a.name.toLowerCase().includes('siddhartha'));
    const global = acc.find(a => a.name.toLowerCase().includes('global'));

    this.allocations.set([
      { id: 'rent',      label: 'Top up rent reserve',     toAccountId: nabil?.id ?? '',      amount: 10000, reservedNote: 'Rent (self)' },
      { id: 'minbal',    label: 'Bank min balance top-up', toAccountId: siddhartha?.id ?? '', amount: 2000  },
      { id: 'emergency', label: 'Emergency fund (locked)', toAccountId: global?.id ?? '',     amount: 10000, reservedNote: 'Emergency fund' },
      { id: 'savings',   label: 'Savings goal',            toAccountId: global?.id ?? '',     amount: 15000, reservedNote: 'Savings' },
      { id: 'investment',label: 'Investment',              toAccountId: global?.id ?? '',     amount: 5000 },
      { id: 'budget',    label: 'Leave in salary account for month', toAccountId: '',        amount: 53200 },
    ]);
  }

  addAllocation(): void {
    this.allocations.update(list => [...list, {
      id: `custom-${Date.now()}`,
      label: 'Custom allocation',
      toAccountId: '',
      amount: 0,
    }]);
  }

  removeAllocation(id: string): void {
    this.allocations.update(list => list.filter(a => a.id !== id));
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

    // 2. Execute transfers + reserved bumps
    let transfers = 0;
    for (const a of this.allocations()) {
      const amt = Number(a.amount) || 0;
      if (amt <= 0) continue;
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

    this.notification.success(`Salary processed — ${transfers} transfer${transfers === 1 ? '' : 's'} done`);
    this.closed.emit();
  }
}
