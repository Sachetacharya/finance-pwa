import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../core/services/loan.service';
import { AccountService } from '../../core/services/account.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';
import { LoanStatus } from '../../core/models/loan.model';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-loans',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent, CurrencyFormatPipe, LockScrollDirective, NgIcon],
  templateUrl: './loans.component.html',
  styleUrl: './loans.component.scss',
})
export class LoansComponent {
  readonly loanService = inject(LoanService);
  readonly accountService = inject(AccountService);
  private readonly notification = inject(NotificationService);

  readonly showAddForm = signal(false);
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

  // Payment form
  payAmount: number | null = null;
  payDate = new Date().toISOString().split('T')[0];
  payNotes = '';

  get allAccounts() {
    return [
      { id: 'cash', name: 'Cash', icon: '💵' },
      ...this.accountService.accounts().map(a => ({
        id: a.id, name: a.name, icon: a.type === 'bank' ? '🏦' : '📱',
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
    return !!this.payAmount && this.payAmount > 0 && !!paying && this.payAmount <= paying.outstanding;
  }

  openAdd(type: 'borrowed' | 'lent'): void {
    this.newType = type;
    this.newTitle = '';
    this.newAmount = null;
    this.newAccount = '';
    this.newDate = new Date().toISOString().split('T')[0];
    this.newNotes = '';
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
    });
    const label = this.newType === 'borrowed' ? 'Loan added' : 'Lent record added';
    this.notification.success(label);
    this.showAddForm.set(false);
  }

  openPayment(status: LoanStatus): void {
    this.payingLoan.set(status);
    this.payAmount = null;
    this.payDate = new Date().toISOString().split('T')[0];
    this.payNotes = '';
  }

  payFull(): void {
    const outstanding = this.payingLoan()?.outstanding;
    if (outstanding) this.payAmount = outstanding;
  }

  onPay(): void {
    const paying = this.payingLoan();
    if (!paying || !this.canPay) return;
    this.loanService.addPayment(
      paying.loan.id,
      this.payAmount!,
      this.payDate,
      this.payNotes || undefined,
    );
    const remaining = paying.outstanding - this.payAmount!;
    if (remaining <= 0) {
      this.notification.success('Loan fully resolved!');
    } else {
      this.notification.success('Payment recorded');
    }
    this.payingLoan.set(null);
  }

  onDelete(): void {
    const id = this.deletingLoanId();
    if (!id) return;
    this.loanService.removeLoan(id);
    this.notification.success('Loan removed');
    this.deletingLoanId.set(null);
  }
}
