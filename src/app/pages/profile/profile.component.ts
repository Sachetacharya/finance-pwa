import { Component, inject, signal, isDevMode } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationService } from '../../core/services/notification.service';
import { PwaService } from '../../core/services/pwa.service';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  readonly pwa = inject(PwaService);
  private readonly swUpdate = inject(SwUpdate);
  private readonly notification = inject(NotificationService);

  readonly appVersion = '1.0.0';
  readonly isChecking = signal(false);
  readonly isReloading = signal(false);
  readonly updateAvailable = signal(false);
  readonly lastChecked = signal<string | null>(null);

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
}
