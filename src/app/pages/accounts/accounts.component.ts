import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { ExpenseService } from '../../core/services/expense.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';
import { NgIcon } from '@ng-icons/core';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent, CurrencyFormatPipe, PrivacyMaskPipe, LockScrollDirective, NgIcon],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent {
  readonly accountService = inject(AccountService);
  private readonly expenseService = inject(ExpenseService);
  private readonly notification = inject(NotificationService);

  readonly showAddForm = signal(false);
  readonly showTransferForm = signal(false);
  readonly editingAccountId = signal<string | null>(null);
  readonly deletingAccountId = signal<string | null>(null);

  // Add account fields
  newName = '';
  newType: 'bank' | 'wallet' = 'bank';
  newBalance = 0;
  newColor = '#6366f1';

  // Edit account fields
  editName = '';
  editBalance = 0;
  editColor = '#6366f1';
  editReservedAmount = 0;
  editReservedNote = '';

  // Transfer fields
  transferFrom = '';
  transferTo = '';
  transferAmount: number | null = null;
  transferDate = new Date().toISOString().split('T')[0];
  transferNotes = '';
  includeCharge = this.loadChargePref().enabled;
  chargeAmount = this.loadChargePref().amount;

  private loadChargePref(): { enabled: boolean; amount: number } {
    try {
      const raw = localStorage.getItem('fp_transfer_charge');
      if (raw) return { enabled: true, amount: 10, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { enabled: false, amount: 10 };
  }

  private saveChargePref(): void {
    try {
      localStorage.setItem('fp_transfer_charge', JSON.stringify({
        enabled: this.includeCharge,
        amount: this.chargeAmount,
      }));
    } catch { /* ignore */ }
  }

  /** All selectable account options (cash + user accounts) */
  get allAccounts(): { id: string; name: string; icon: string }[] {
    return [
      { id: 'cash', name: 'Cash', icon: 'lucideBanknote' },
      ...this.accountService.accounts().map(a => ({
        id: a.id,
        name: a.name,
        icon: a.type === 'bank' ? 'lucideLandmark' : 'lucideSmartphone',
      })),
    ];
  }

  get transferToOptions() {
    return this.allAccounts.filter(a => a.id !== this.transferFrom);
  }

  get sourceBalance(): number {
    if (!this.transferFrom) return 0;
    return this.accountService.accountBalances()[this.transferFrom] ?? 0;
  }

  get exceedsBalance(): boolean {
    if (!this.transferAmount) return false;
    const needed = this.transferAmount + (this.includeCharge ? (this.chargeAmount || 0) : 0);
    return needed > this.sourceBalance;
  }

  get canTransfer(): boolean {
    return !!this.transferFrom && !!this.transferTo
      && !!this.transferAmount && this.transferAmount > 0
      && this.transferFrom !== this.transferTo
      && !this.exceedsBalance;
  }

  openTransfer(prefillFrom = ''): void {
    this.transferFrom = prefillFrom;
    this.transferTo = '';
    this.transferAmount = null;
    this.transferDate = new Date().toISOString().split('T')[0];
    this.transferNotes = '';
    this.showTransferForm.set(true);
  }

  editCurrentBalance = 0;

  openEdit(id: string): void {
    const acc = this.accountService.accounts().find(a => a.id === id);
    if (!acc) return;
    this.editName = acc.name;
    this.editBalance = acc.initialBalance;
    this.editColor = acc.color ?? '#6366f1';
    this.editCurrentBalance = this.accountService.accountBalances()[id] ?? 0;
    this.editReservedAmount = acc.reservedAmount ?? 0;
    this.editReservedNote = acc.reservedNote ?? '';
    this.editingAccountId.set(id);
  }

  onSaveEdit(): void {
    const id = this.editingAccountId();
    if (!id || !this.editName.trim()) return;

    const currentBalance = this.accountService.accountBalances()[id] ?? 0;
    const diff = Math.round((this.editCurrentBalance - currentBalance) * 100) / 100;

    // Update name + color
    this.accountService.updateAccount(id, this.editName.trim(), this.editBalance, this.editColor);
    this.accountService.updateReserved(id, this.editReservedAmount, this.editReservedNote.trim());

    // Create balance adjustment record if balance changed
    if (diff !== 0) {
      const accName = this.editName.trim();
      if (diff > 0) {
        // Balance increased → income adjustment
        this.expenseService.addExpense({
          type: 'income',
          title: `Balance adjustment — ${accName}`,
          amount: diff,
          category: 'other-income',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: id,
          notes: `Corrected from ${Math.round(currentBalance)} to ${Math.round(this.editCurrentBalance)}`,
        });
      } else {
        // Balance decreased → expense adjustment
        this.expenseService.addExpense({
          type: 'expense',
          title: `Balance adjustment — ${accName}`,
          amount: Math.abs(diff),
          category: 'other',
          date: new Date().toISOString().split('T')[0],
          paymentMethod: id,
          notes: `Corrected from ${Math.round(currentBalance)} to ${Math.round(this.editCurrentBalance)}`,
        });
      }
      this.notification.success(`Balance adjusted by ${diff > 0 ? '+' : ''}${diff}`);
    } else {
      this.notification.success('Account updated');
    }

    this.editingAccountId.set(null);
  }

  onTransfer(): void {
    if (!this.canTransfer) return;
    this.accountService.transfer(
      this.transferFrom,
      this.transferTo,
      this.transferAmount!,
      this.transferDate,
      this.transferNotes || undefined,
    );

    // Optional: log the bank charge as a separate fees-charges expense from the source account
    if (this.includeCharge && this.chargeAmount > 0) {
      const fromLabel = this.accountService.getLabel(this.transferFrom);
      const toLabel = this.accountService.getLabel(this.transferTo);
      this.expenseService.addExpense({
        type: 'expense',
        title: 'Transfer charge',
        amount: this.chargeAmount,
        category: 'fees-charges',
        date: this.transferDate,
        paymentMethod: this.transferFrom,
        notes: `${fromLabel} → ${toLabel}`,
      });
    }
    this.saveChargePref();

    const from = this.accountService.getLabel(this.transferFrom);
    const to = this.accountService.getLabel(this.transferTo);
    this.notification.success(`Transferred to ${to} from ${from}`);
    this.showTransferForm.set(false);
  }

  onAdd(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.accountService.addAccount(name, this.newType, this.newBalance, this.newColor);
    this.notification.success(`${name} added`);
    this.newName = '';
    this.newBalance = 0;
    this.showAddForm.set(false);
  }

  onDelete(): void {
    const id = this.deletingAccountId();
    if (!id) return;
    const acc = this.accountService.accounts().find(a => a.id === id);
    this.accountService.deleteAccount(id);
    this.notification.success(`${acc?.name ?? 'Account'} deleted`);
    this.deletingAccountId.set(null);
  }
}
