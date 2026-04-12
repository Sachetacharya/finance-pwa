import { Component, inject, signal, isDevMode } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { PwaService } from '../../core/services/pwa.service';
import { BackupService } from '../../core/services/backup.service';
import { NgIcon } from '@ng-icons/core';
import { FormsModule } from '@angular/forms';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIcon, FormsModule, LockScrollDirective],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly pwa = inject(PwaService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly notification = inject(NotificationService);
  private readonly backup = inject(BackupService);

  readonly appVersion = '1.0.0';
  readonly isChecking = signal(false);
  readonly isReloading = signal(false);
  readonly updateAvailable = signal(false);
  readonly lastChecked = signal<string | null>(null);
  readonly showEditProfile = signal(false);
  readonly showChangePassword = signal(false);

  // Edit profile fields
  editName = '';
  editEmail = '';

  // Change password fields
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  openEditProfile(): void {
    const user = this.auth.currentUser();
    this.editName = user?.name ?? '';
    this.editEmail = user?.email ?? '';
    this.showEditProfile.set(true);
  }

  onSaveProfile(): void {
    if (!this.editName.trim() || !this.editEmail.trim()) return;
    this.auth.updateProfile(this.editName.trim(), this.editEmail.trim());
    this.notification.success('Profile updated');
    this.showEditProfile.set(false);
  }

  openChangePassword(): void {
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.showChangePassword.set(true);
  }

  onChangePassword(): void {
    if (!this.currentPassword || !this.newPassword) return;
    if (this.newPassword !== this.confirmPassword) {
      this.notification.error('Passwords do not match');
      return;
    }
    if (this.newPassword.length < 4) {
      this.notification.error('Password must be at least 4 characters');
      return;
    }
    const success = this.auth.changePassword(this.currentPassword, this.newPassword);
    if (success) {
      this.notification.success('Password changed');
      this.showChangePassword.set(false);
    } else {
      this.notification.error('Current password is incorrect');
    }
  }

  async checkForUpdates(): Promise<void> {
    if (isDevMode() || !this.swUpdate.isEnabled) {
      this.notification.info('Updates only work in production builds');
      return;
    }

    this.isChecking.set(true);
    try {
      const hasUpdate = await this.swUpdate.checkForUpdate();
      this.lastChecked.set(new Date().toLocaleTimeString());
      if (hasUpdate) {
        this.updateAvailable.set(true);
        this.notification.success('New version available!');
      } else {
        this.notification.info('App is up to date');
      }
    } catch {
      this.notification.error('Failed to check for updates');
    } finally {
      this.isChecking.set(false);
    }
  }

  async forceReload(): Promise<void> {
    this.isReloading.set(true);
    this.notification.info('Clearing cache and reloading...');

    try {
      // Unregister service workers
      const registrations = await navigator.serviceWorker?.getRegistrations();
      if (registrations) {
        for (const reg of registrations) {
          await reg.unregister();
        }
      }

      // Clear all caches
      const cacheNames = await caches?.keys();
      if (cacheNames) {
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
    } catch {
      // proceed to reload even if cache clear fails
    }

    // Hard reload
    window.location.reload();
  }

  async applyUpdate(): Promise<void> {
    if (!this.swUpdate.isEnabled) return;
    this.isReloading.set(true);
    try {
      await this.swUpdate.activateUpdate();
      window.location.reload();
    } catch {
      // fallback to force reload
      this.forceReload();
    }
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
    input.value = '';
  }
}
