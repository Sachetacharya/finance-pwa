import { Component, inject, effect, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ThemeService } from './core/services/theme.service';
import { PwaService } from './core/services/pwa.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly themeService = inject(ThemeService);
  readonly pwaService = inject(PwaService);
  private readonly notification = inject(NotificationService);
  private readonly swUpdate = inject(SwUpdate);

  constructor() {
    // Online / offline notifications
    let initialized = false;
    effect(() => {
      const online = this.pwaService.isOnline();
      if (!initialized) { initialized = true; return; }
      if (online) {
        this.notification.success('Back online!');
      } else {
        this.notification.warning('You are offline. Some features may be limited.');
      }
    });

    // Service worker update notifications (production only)
    if (!isDevMode() && this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
        .subscribe(() => {
          this.notification.info('A new version is available. Refresh to update.');
        });
    }
  }
}
