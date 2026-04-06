import { Component, input, output, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  Expense,
  ExpenseCategory,
  IncomeSource,
  PaymentMethod,
  CATEGORY_LABELS,
  INCOME_SOURCE_LABELS,
} from '../../../core/models/expense.model';

@Component({
  selector: 'app-expense-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './expense-form.component.html',
  styleUrl: './expense-form.component.scss',
})
export class ExpenseFormComponent implements OnInit {
  expense = input<Expense | null>(null);
  saved = output<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>();
  cancelled = output<void>();

  private readonly fb = inject(FormBuilder);

  readonly isSubmitting = signal(false);
  readonly entryType = signal<'expense' | 'income'>('expense');
  readonly paymentGroup = signal<'cash' | 'card' | 'bank' | 'wallet' | ''>('');

  readonly categories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];
  readonly incomeSources = Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][];

  readonly bankOptions: [PaymentMethod, string][] = [
    ['bank-siddhartha', 'Siddhartha Bank'],
    ['bank-nabil', 'Nabil Bank'],
    ['bank-kumari', 'Kumari Bank'],
    ['bank-global', 'Global IME Bank'],
  ];

  readonly walletOptions: [PaymentMethod, string][] = [
    ['esewa', 'eSewa'],
    ['khalti', 'Khalti'],
  ];

  readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: ['', Validators.required],
    date: ['', Validators.required],
    paymentMethod: ['' as PaymentMethod | '', Validators.required],
    notes: [''],
  });

  ngOnInit(): void {
    const exp = this.expense();
    if (exp) {
      this.entryType.set(exp.type ?? 'expense');
      const pm = exp.paymentMethod as string;
      if (pm === 'cash' || pm === 'card') {
        this.paymentGroup.set(pm);
      } else if (pm.startsWith('bank-')) {
        this.paymentGroup.set('bank');
      } else if (pm === 'esewa' || pm === 'khalti') {
        this.paymentGroup.set('wallet');
      }
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

  setType(type: 'expense' | 'income'): void {
    this.entryType.set(type);
    this.form.get('category')?.setValue('');
  }

  setPaymentGroup(group: 'cash' | 'card' | 'bank' | 'wallet' | ''): void {
    this.paymentGroup.set(group);
    if (group === 'cash' || group === 'card') {
      this.form.get('paymentMethod')?.setValue(group as PaymentMethod);
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
      paymentMethod: val.paymentMethod as PaymentMethod,
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
