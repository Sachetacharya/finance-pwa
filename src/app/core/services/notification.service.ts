import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  show(message: string, type: ToastType = 'info', duration = 4000): void {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this._toasts.update(list => [...list, { id, message, type, duration }]);
    if (duration > 0) setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string): void { this.show(message, 'success'); }
  error(message: string): void { this.show(message, 'error', 6000); }
  warning(message: string): void { this.show(message, 'warning', 5000); }
  info(message: string): void { this.show(message, 'info'); }

  dismiss(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }
}
