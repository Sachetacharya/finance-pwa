import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Expense,
  ExpenseCategory,
  IncomeSource,
  CATEGORY_LABELS,
  INCOME_SOURCE_LABELS,
} from '../../../core/models/expense.model';
import { AccountService } from '../../../core/services/account.service';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { LockScrollDirective } from '../../directives/lock-scroll.directive';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyFormatPipe, LockScrollDirective, NgIcon],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.scss',
})
export class ExpenseFormComponent implements OnInit {
  expense = input<Expense | null>(null);
  saved = output<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>();
  cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  readonly accountService = inject(AccountService);
  readonly currencyPipe = inject(CurrencyFormatPipe);

  readonly isSubmitting = signal(false);
  readonly entryType = signal<'expense' | 'income' | 'transfer'>('expense');
  readonly paymentGroup = signal<'cash' | 'bank' | 'wallet' | ''>('');

  readonly categories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];
  readonly incomeSources = Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][];

  get selectedBalance(): number | null {
    const pm = this.form.get('paymentMethod')?.value;
    if (!pm) return null;
    return this.accountService.accountBalances()[pm] ?? null;
  }

  get exceedsBalance(): boolean {
    if (this.entryType() !== 'expense' && this.entryType() !== 'transfer') return false;
    const bal = this.selectedBalance;
    const amt = this.form.get('amount')?.value;
    if (bal === null || !amt) return false;
    return amt > bal;
  }

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    date: ['', Validators.required],
    paymentMethod: ['', Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    const exp = this.expense();
    if (exp) {
      this.entryType.set(exp.type === 'income' ? 'income' : exp.type === 'transfer' ? 'transfer' : 'expense');
      this.resolvePaymentGroup(exp.paymentMethod);
      this.form.patchValue({
        title: exp.title,
        amount: exp.amount,
        category: exp.category,
        date: exp.date,
        paymentMethod: exp.paymentMethod,
        notes: exp.notes ?? '',
      });
    } else {
      this.form.patchValue({ date: new Date().toISOString().split('T')[0] });
    }
  }

  private resolvePaymentGroup(pm: string): void {
    if (pm === 'cash') {
      this.paymentGroup.set('cash');
    } else {
      const acc = this.accountService.accounts().find(a => a.id === pm);
      if (acc) {
        this.paymentGroup.set(acc.type === 'bank' ? 'bank' : 'wallet');
      }
    }
  }

  setType(type: 'expense' | 'income'): void {
    this.entryType.set(type);
    this.form.get('category')?.setValue('');
  }

  setPaymentGroup(group: 'cash' | 'bank' | 'wallet' | ''): void {
    this.paymentGroup.set(group);
    if (group === 'cash') {
      this.form.get('paymentMethod')?.setValue('cash');
    } else {
      this.form.get('paymentMethod')?.setValue('');
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const val = this.form.value;
    this.saved.emit({
      type: this.entryType(),
      title: val.title!,
      amount: val.amount!,
      category: val.category as ExpenseCategory | IncomeSource,
      date: val.date!,
      paymentMethod: val.paymentMethod!,
      toAccount: this.expense()?.toAccount,
      notes: val.notes || undefined,
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  getError(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl?.errors) return '';
    if (ctrl.errors['required']) return 'This field is required';
    if (ctrl.errors['min']) return 'Amount must be greater than 0';
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} characters`;
    if (ctrl.errors['maxlength']) return `Maximum ${ctrl.errors['maxlength'].requiredLength} characters`;
    return 'Invalid value';
  }
}
