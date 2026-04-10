import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { NotificationService, Toast } from '../../../core/services/notification.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  readonly notificationService = inject(NotificationService);

  dismiss(id: string): void {
    this.notificationService.dismiss(id);
  }

  trackById(_: number, toast: Toast): string {
    return toast.id;
  }

  getIcon(type: Toast['type']): string {
    switch (type) {
      case 'success': return 'lucideCheck';
      case 'error': return 'lucideX';
      case 'warning': return 'lucideAlertTriangle';
      default: return 'lucideInfo';
    }
  }
}
