import { ErrorHandler, Injectable, inject, NgZone } from '@angular/core';
import { NotificationService } from './notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly zone = inject(NgZone);
  private readonly notification = inject(NotificationService);

  handleError(error: unknown): void {
    const message = this.extractMessage(error);
    console.error('[GlobalErrorHandler]', error);
    this.zone.run(() => {
      this.notification.error(message);
    });
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unexpected error occurred.';
  }
}
