import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../core/services/loan.service';
import { AccountService } from '../../core/services/account.service';
import { ExpenseService } from '../../core/services/expense.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';
import { LoanStatus } from '../../core/models/loan.model';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent, CurrencyFormatPipe, PrivacyMaskPipe, LockScrollDirective, NgIcon],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss',
})
export class LoansComponent {
  readonly loanService = inject(LoanService);
  readonly accountService = inject(AccountService);
  private readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);

  readonly showAddForm = signal(false);
  readonly showSplitForm = signal(false);
  readonly payingLoan = signal<LoanStatus | null>(null);
  readonly deletingLoanId = signal<string | null>(null);
  readonly activeTab = signal<'borrowed' | 'lent'>('borrowed');

  // Add loan form
  newTitle = '';
  newType: 'borrowed' | 'lent' = 'borrowed';
  newAmount: number | null = null;
  newAccount = '';
  newDate = new Date().toISOString().split('T')[0];
  newNotes = '';
  newAlreadyRecorded = false; // true = expense/income already in transactions

  // Payment form
  payFullAmount = true;
  payAmount: number | null = null;
  payDate = new Date().toISOString().split('T')[0];
  payNotes = '';

  get allAccounts() {
    return [
      { id: 'cash', name: 'Cash', icon: 'lucideBanknote' },
      ...this.accountService.accounts().map(a => ({
        id: a.id, name: a.name, icon: a.type === 'bank' ? 'lucideLandmark' : 'lucideSmartphone',
      })),
    ];
  }

  get filteredStatuses() {
    return this.loanService.loanStatuses().filter(s => s.loan.type === this.activeTab());
  }

  get canAddLoan(): boolean {
    return !!this.newTitle.trim() && !!this.newAmount && this.newAmount > 0 && !!this.newAccount;
  }

  get canPay(): boolean {
    const paying = this.payingLoan();
    if (!paying) return false;
    if (this.payFullAmount) return true;
    return !!this.payAmount && this.payAmount > 0 && this.payAmount <= paying.outstanding;
  }

  openAdd(type: 'borrowed' | 'lent'): void {
    this.newType = type;
    this.newTitle = '';
    this.newAmount = null;
    this.newAccount = '';
    this.newDate = new Date().toISOString().split('T')[0];
    this.newNotes = '';
    this.newAlreadyRecorded = false;
    this.showAddForm.set(true);
  }

  onAddLoan(): void {
    if (!this.canAddLoan) return;
    this.loanService.addLoan({
      title: this.newTitle.trim(),
      type: this.newType,
      amount: this.newAmount!,
      accountId: this.newAccount,
      date: this.newDate,
      notes: this.newNotes || undefined,
    }, this.newAlreadyRecorded);
    const label = this.newType === 'borrowed' ? 'Loan added' : 'Lent record added';
    this.notification.success(label);
    this.showAddForm.set(false);
  }

  openPayment(status: LoanStatus): void {
    this.payingLoan.set(status);
    this.payFullAmount = true;
    this.payAmount = null;
    this.payDate = new Date().toISOString().split('T')[0];
    this.payNotes = '';
  }

  togglePayFull(): void {
    this.payFullAmount = !this.payFullAmount;
    if (!this.payFullAmount) this.payAmount = null;
  }

  onPay(): void {
    const paying = this.payingLoan();
    if (!paying || !this.canPay) return;
    const amount = this.payFullAmount ? paying.outstanding : this.payAmount!;
    this.loanService.addPayment(
      paying.loan.id,
      amount,
      this.payDate,
      this.payNotes || undefined,
    );
    if (this.payFullAmount || paying.outstanding - amount <= 0) {
      this.notification.success('Loan fully resolved!');
    } else {
      this.notification.success('Payment recorded');
    }
    this.payingLoan.set(null);
  }

  // === Quick Split / Quick Expense+Loan ===
  splitMode: 'split' | 'fixed' = 'split';
  splitTitle = '';
  splitTotal: number | null = null;
  splitPeople = 2;
  splitPaidBy: 'me' | 'other' = 'other';
  splitOtherName = '';
  splitAccount = '';
  splitCategory = 'food';
  splitDate = new Date().toISOString().split('T')[0];
  splitAlreadyRecorded = false;

  get splitMyShare(): number {
    if (!this.splitTotal) return 0;
    if (this.splitMode === 'fixed') return this.splitTotal;
    return Math.round((this.splitTotal / this.splitPeople) * 100) / 100;
  }

  get splitLoanAmount(): number {
    if (!this.splitTotal) return 0;
    if (this.splitMode === 'fixed') return this.splitTotal;
    if (this.splitPaidBy === 'other') return this.splitMyShare;
    return Math.round((this.splitTotal - this.splitMyShare) * 100) / 100;
  }

  get canSplit(): boolean {
    return !!this.splitTitle.trim() && !!this.splitTotal && this.splitTotal > 0
      && !!this.splitOtherName.trim() && !!this.splitAccount
      && (this.splitMode === 'fixed' || this.splitPeople >= 2);
  }

  openSplit(): void {
    this.splitMode = 'split';
    this.splitTitle = '';
    this.splitTotal = null;
    this.splitPeople = 2;
    this.splitPaidBy = 'other';
    this.splitOtherName = '';
    this.splitAccount = '';
    this.splitCategory = 'food';
    this.splitDate = new Date().toISOString().split('T')[0];
    this.splitAlreadyRecorded = false;
    this.showSplitForm.set(true);
  }

  onSplit(): void {
    if (!this.canSplit) return;
    const myShare = this.splitMyShare;
    const otherName = this.splitOtherName.trim();
    const title = this.splitTitle.trim();
    const isFixed = this.splitMode === 'fixed';

    if (!this.splitAlreadyRecorded) {
      if (this.splitPaidBy === 'me') {
        // I paid the full bill → create expense for full amount
        this.expenseService.addExpense({
          type: 'expense',
          title,
          amount: this.splitTotal!,
          category: this.splitCategory as any,
          date: this.splitDate,
          paymentMethod: this.splitAccount,
          notes: isFixed
            ? `${otherName} owes me`
            : `Split with ${otherName} (${this.splitPeople} people, total ${this.splitTotal})`,
        });
      }
      // If other paid: no expense now — money hasn't left my account yet
    }

    // 2. Create the loan (skipExpense=true for splits — component handles expense above)
    if (this.splitPaidBy === 'other') {
      this.loanService.addLoan({
        title: `${isFixed ? '' : 'Split - '}${title} (${otherName})`,
        type: 'borrowed',
        amount: this.splitLoanAmount,
        accountId: this.splitAccount,
        date: this.splitDate,
        notes: `${otherName} paid`,
      }, true);
      this.notification.success(`Added. You owe ${otherName}.`);
    } else {
      this.loanService.addLoan({
        title: `${isFixed ? '' : 'Split - '}${title} (${otherName})`,
        type: 'lent',
        amount: this.splitLoanAmount,
        accountId: this.splitAccount,
        date: this.splitDate,
        notes: `I paid, ${otherName} owes`,
      }, true);
      this.notification.success(`Added. ${otherName} owes you.`);
    }

    this.showSplitForm.set(false);
  }

  onDelete(): void {
    const id = this.deletingLoanId();
    if (!id) return;
    this.loanService.removeLoan(id);
    this.notification.success('Loan removed');
    this.deletingLoanId.set(null);
  }
}
