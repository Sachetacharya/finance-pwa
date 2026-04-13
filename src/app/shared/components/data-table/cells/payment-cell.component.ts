import { Component, input, inject } from '@angular/core';
import { AccountService } from '../../../../core/services/account.service';
import { TableColumn } from '../cell-registry';

@Component({
  selector: 'dt-payment-cell',
  standalone: true,
  template: `<span class="dt-payment" [style.color]="accountService.getColor($any(value()))">{{ accountService.getLabel(value()) }}</span>`,
})
export class PaymentCellComponent {
  readonly accountService = inject(AccountService);
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();
}
