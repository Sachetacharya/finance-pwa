import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { LockScrollDirective } from '../../directives/lock-scroll.directive';
import { AccountService } from '../../../core/services/account.service';
import { ExpenseService } from '../../../core/services/expense.service';
import { BudgetService } from '../../../core/services/budget.service';
import { NotificationService } from '../../../core/services/notification.service';
import {
  WizardConfigService, SalaryAllocationConfig, AccountHint,
} from '../../../core/services/wizard-config.service';

type AllocationKind = 'expense' | 'transfer';

interface AllocationRow {
  id: string;
  label: string;
  kind: AllocationKind;
  toAccountId: string;       // runtime-resolved id ('' = keep in salary acct)
  accountHint?: AccountHint; // persisted hint, used to resolve id across devices
  category?: string;
  amount: number;
  reservedNote?: string;
  compulsory?: boolean;
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
  private readonly config = inject(WizardConfigService);

  salaryAmount = 0;
  executionDate = this.localDateStr(new Date());
  nextPaydayDate = '';
  private cycleDays = 30;

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
    const cfg = this.config.loadSalary();
    this.salaryAmount = cfg.salaryAmount;
    this.cycleDays = cfg.cycleDays;

    const next = new Date(this.executionDate);
    next.setDate(next.getDate() + this.cycleDays);
    this.nextPaydayDate = this.localDateStr(next);

    this.allocations.set(cfg.allocations.map(a => ({
      id: a.id,
      label: a.label,
      kind: a.kind,
      toAccountId: a.kind === 'transfer' ? this.resolveAccountId(a.accountHint) : '',
      accountHint: a.accountHint,
      category: a.category,
      amount: a.amount,
      reservedNote: a.reservedNote,
      compulsory: a.compulsory,
    })));
  }

  /** Resolve an account hint (e.g. "global") to an actual account id by name-substring match */
  private resolveAccountId(hint: AccountHint | undefined): string {
    if (!hint) return '';
    const match = this.accountService.accounts().find(a =>
      a.name.toLowerCase().includes(hint.toLowerCase())
    );
    return match?.id ?? '';
  }

  /** Reverse — turn an account id into a hint we can persist */
  private hintForAccountId(id: string): AccountHint | undefined {
    if (!id) return '';
    const acc = this.accountService.accounts().find(a => a.id === id);
    if (!acc) return '';
    const n = acc.name.toLowerCase();
    const known: AccountHint[] = ['kumari', 'siddhartha', 'nabil', 'global', 'esewa'];
    return known.find(h => n.includes(h)) ?? '';
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

      if (!a.toAccountId) continue;

      this.accountService.transfer(salaryId, a.toAccountId, amt, this.executionDate, a.label);
      transfers++;

      if (a.reservedNote) {
        const acc = this.accountService.accounts().find(x => x.id === a.toAccountId);
        const current = acc?.reservedAmount ?? 0;
        this.accountService.updateReserved(a.toAccountId, current + amt, a.reservedNote);
      }
    }

    // 3. Roll the budget cycle forward
    if (this.nextPaydayDate) this.budgetService.setPaydayDate(this.nextPaydayDate);
    this.budgetService.setCycleStartDate(this.executionDate);

    // 4. Persist the wizard config so next time it remembers the user's edits
    const persisted: SalaryAllocationConfig[] = this.allocations().map(a => ({
      id: a.id,
      label: a.label,
      kind: a.kind,
      // Always derive hint from the current destination — the user may have changed it in the UI
      accountHint: a.kind === 'transfer' ? (this.hintForAccountId(a.toAccountId) ?? '') : undefined,
      category: a.category as any,
      amount: a.amount,
      reservedNote: a.reservedNote,
      compulsory: a.compulsory,
    }));
    this.config.saveSalary({
      salaryAmount: this.salaryAmount,
      cycleDays: this.cycleDays,
      allocations: persisted,
    });

    this.notification.success(`Salary processed — ${expenses} expense${expenses === 1 ? '' : 's'} + ${transfers} transfer${transfers === 1 ? '' : 's'}`);
    this.closed.emit();
  }
}
