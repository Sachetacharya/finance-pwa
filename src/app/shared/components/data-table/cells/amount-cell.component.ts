import { Component, input } from '@angular/core';
import { CurrencyFormatPipe } from '../../../pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../../pipes/privacy-mask.pipe';
import { TableColumn } from '../cell-registry';

@Component({
  selector: 'dt-amount-cell',
  standalone: true,
  imports: [CurrencyFormatPipe, PrivacyMaskPipe],
  template: `<span class="dt-amount" [class]="column()?.class ?? ''">{{ $any(value()) | currencyFormat | privacyMask }}</span>`,
})
export class AmountCellComponent {
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();
}
