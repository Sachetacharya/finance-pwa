import { Component, inject, output, input, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PwaService } from '../../../core/services/pwa.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AccountService } from '../../../core/services/account.service';
import { CurrencyFormatPipe } from '../../pipes/currency-format.pipe';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CurrencyFormatPipe, ConfirmDialogComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  sidebarOpen = input<boolean>(false);
  toggleSidebar = output<void>();

  readonly auth = inject(AuthService);
  readonly pwa = inject(PwaService);
  readonly accountService = inject(AccountService);
  readonly showBalances = signal(false);
  readonly showLogoutConfirm = signal(false);

  toggleBalances(): void {
    this.showBalances.update(v => !v);
  }

  confirmLogout(): void {
    this.showLogoutConfirm.set(true);
  }

  onLogout(): void {
    this.showLogoutConfirm.set(false);
    this.auth.logout();
  }
}
