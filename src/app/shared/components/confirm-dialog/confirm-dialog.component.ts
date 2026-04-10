import { Component, input, output } from '@angular/core';
import { LockScrollDirective } from '../../directives/lock-scroll.directive';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LockScrollDirective],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
})
export class ConfirmDialogComponent {
  title = input<string>('Confirm Action');
  message = input<string>('Are you sure you want to proceed?');
  confirmText = input<string>('Confirm');
  cancelText = input<string>('Cancel');
  danger = input<boolean>(false);

  confirmed = output<void>();
  cancelled = output<void>();
}
