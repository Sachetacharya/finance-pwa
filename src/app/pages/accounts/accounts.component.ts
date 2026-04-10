import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../core/services/account.service';
import { BackupService } from '../../core/services/backup.service';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [FormsModule, ConfirmDialogComponent, CurrencyFormatPipe],
  templateUrl: './accounts.component.html',
  styleUrl: './accounts.component.scss',
})
export class AccountsComponent {
  readonly accountService = inject(AccountService);
  private readonly backup = inject(BackupService);
  private readonly notification = inject(NotificationService);

  readonly showAddForm = signal(false);
  readonly showTransferForm = signal(false);
  readonly deletingAccountId = signal<string | null>(null);

  // Add account fields
  newName = '';
  newType: 'bank' | 'wallet' = 'bank';
  newBalance = 0;

  // Transfer fields
  transferFrom = '';
  transferTo = '';
  transferAmount: number | null = null;
  transferDate = new Date().toISOString().split('T')[0];
  transferNotes = '';

  /** All selectable account options (cash + user accounts) */
  get allAccounts(): { id: string; name: string; icon: string }[] {
    return [
      { id: 'cash', name: 'Cash', icon: '💵' },
      ...this.accountService.accounts().map(a => ({
        id: a.id,
        name: a.name,
        icon: a.type === 'bank' ? '🏦' : '📱',
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
    return !!this.transferAmount && this.transferAmount > this.sourceBalance;
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

  onTransfer(): void {
    if (!this.canTransfer) return;
    this.accountService.transfer(
      this.transferFrom,
      this.transferTo,
      this.transferAmount!,
      this.transferDate,
      this.transferNotes || undefined,
    );
    const from = this.accountService.getLabel(this.transferFrom);
    const to = this.accountService.getLabel(this.transferTo);
    this.notification.success(`Transferred to ${to} from ${from}`);
    this.showTransferForm.set(false);
  }

  onAdd(): void {
    const name = this.newName.trim();
    if (!name) return;
    this.accountService.addAccount(name, this.newType, this.newBalance);
    this.notification.success(`${name} added`);
    this.newName = '';
    this.newBalance = 0;
    this.showAddForm.set(false);
  }

  onExportBackup(): void {
    this.backup.exportBackup();
    this.notification.success('Backup downloaded');
  }

  async onImportBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const result = await this.backup.importBackup(file);
    if (result.success) {
      this.notification.success(result.message);
      setTimeout(() => window.location.reload(), 1000);
    } else {
      this.notification.error(result.message);
    }
    input.value = ''; // reset so same file can be selected again
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
