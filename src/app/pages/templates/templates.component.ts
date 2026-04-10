import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TemplateService } from '../../core/services/template.service';
import { AccountService } from '../../core/services/account.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { ExpenseService } from '../../core/services/expense.service';
import { TransactionTemplate } from '../../core/models/template.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';
import { NgIcon } from '@ng-icons/core';
import {
  ExpenseCategory, IncomeSource, RecordCategory,
  CATEGORY_LABELS, INCOME_SOURCE_LABELS,
  ALL_CATEGORY_LABELS, ALL_CATEGORY_ICONS,
} from '../../core/models/expense.model';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [FormsModule, CurrencyFormatPipe, PrivacyMaskPipe, ConfirmDialogComponent, LockScrollDirective, NgIcon],
  templateUrl: './templates.component.html',
  styleUrl: './templates.component.scss',
})
export class TemplatesComponent {
  readonly templateService = inject(TemplateService);
  readonly accountService = inject(AccountService);
  private readonly notification = inject(NotificationService);

  private readonly expenseService = inject(ExpenseService);

  readonly showAddForm = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly usingTemplate = signal<TransactionTemplate | null>(null);
  useAmount: number | null = null;
  useAccount = '';

  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;
  readonly expenseCategories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];
  readonly incomeSources = Object.entries(INCOME_SOURCE_LABELS) as [IncomeSource, string][];

  // Form
  newName = '';
  newType: 'expense' | 'income' = 'expense';
  newTitle = '';
  newAmount: number | null = null;
  newCategory: RecordCategory | '' = '';
  newPayment = '';
  newNotes = '';

  get allAccounts() {
    return [
      { id: 'cash', name: 'Cash' },
      ...this.accountService.accounts().map(a => ({ id: a.id, name: a.name })),
    ];
  }

  get canAdd(): boolean {
    return !!this.newName.trim() && !!this.newTitle.trim()
      && !!this.newAmount && this.newAmount > 0
      && !!this.newCategory && !!this.newPayment;
  }

  openAdd(): void {
    this.newName = '';
    this.newType = 'expense';
    this.newTitle = '';
    this.newAmount = null;
    this.newCategory = '';
    this.newPayment = '';
    this.newNotes = '';
    this.showAddForm.set(true);
  }

  onAdd(): void {
    if (!this.canAdd) return;
    this.templateService.addTemplate({
      name: this.newName.trim(),
      type: this.newType,
      title: this.newTitle.trim(),
      amount: this.newAmount!,
      category: this.newCategory as RecordCategory,
      paymentMethod: this.newPayment,
      notes: this.newNotes || undefined,
    });
    this.notification.success('Template created');
    this.showAddForm.set(false);
  }

  onUse(id: string): void {
    const tpl = this.templateService.templates().find(t => t.id === id);
    if (!tpl) return;
    this.usingTemplate.set(tpl);
    this.useAmount = tpl.amount;
    this.useAccount = tpl.paymentMethod;
  }

  confirmUse(): void {
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
    this.notification.success('Transaction added');
    this.usingTemplate.set(null);
  }

  onDelete(): void {
    const id = this.deletingId();
    if (!id) return;
    this.templateService.removeTemplate(id);
    this.notification.success('Template removed');
    this.deletingId.set(null);
  }
}
