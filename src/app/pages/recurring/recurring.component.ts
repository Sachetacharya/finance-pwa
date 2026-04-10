import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecurringService } from '../../core/services/recurring.service';
import { AccountService } from '../../core/services/account.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  ExpenseCategory, IncomeSource, RecordCategory,
  CATEGORY_LABELS, INCOME_SOURCE_LABELS,
  ALL_CATEGORY_LABELS, ALL_CATEGORY_ICONS,
} from '../../core/models/expense.model';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [FormsModule, CurrencyFormatPipe, ConfirmDialogComponent, LockScrollDirective],
  templateUrl: './recurring.component.html',
  styleUrl: './recurring.component.scss',
})
export class RecurringComponent {
  readonly recurringService = inject(RecurringService);
  readonly accountService = inject(AccountService);
  private readonly notification = inject(NotificationService);

  readonly showAddForm = signal(false);
  readonly deletingId = signal<string | null>(null);

  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;
  readonly expenseCategories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];
  readonly incomeSources = Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][];

  // Form fields
  newType: 'expense' | 'income' = 'expense';
  newTitle = '';
  newAmount: number | null = null;
  newCategory: RecordCategory | '' = '';
  newPayment = '';
  newFrequency: 'weekly' | 'monthly' = 'monthly';
  newStartDate = new Date().toISOString().split('T')[0];
  newNotes = '';

  get allAccounts() {
    return [
      { id: 'cash', name: 'Cash', icon: '💵' },
      ...this.accountService.accounts().map(a => ({
        id: a.id, name: a.name, icon: a.type === 'bank' ? '🏦' : '📱',
      })),
    ];
  }

  get canAdd(): boolean {
    return !!this.newTitle.trim() && !!this.newAmount && this.newAmount > 0
      && !!this.newCategory && !!this.newPayment && !!this.newStartDate;
  }

  onAdd(): void {
    if (!this.canAdd) return;
    this.recurringService.add({
      type: this.newType,
      title: this.newTitle.trim(),
      amount: this.newAmount!,
      category: this.newCategory as RecordCategory,
      paymentMethod: this.newPayment,
      frequency: this.newFrequency,
      nextDate: this.newStartDate,
      enabled: true,
      notes: this.newNotes || undefined,
    });
    this.notification.success('Recurring transaction added');
    this.resetForm();
    this.showAddForm.set(false);
  }

  onDelete(): void {
    const id = this.deletingId();
    if (!id) return;
    this.recurringService.remove(id);
    this.notification.success('Recurring transaction removed');
    this.deletingId.set(null);
  }

  onToggle(id: string): void {
    this.recurringService.toggleEnabled(id);
  }

  private resetForm(): void {
    this.newType = 'expense';
    this.newTitle = '';
    this.newAmount = null;
    this.newCategory = '';
    this.newPayment = '';
    this.newFrequency = 'monthly';
    this.newStartDate = new Date().toISOString().split('T')[0];
    this.newNotes = '';
  }
}
