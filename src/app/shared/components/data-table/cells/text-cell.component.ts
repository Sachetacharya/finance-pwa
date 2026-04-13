import { Component, input } from '@angular/core';
import { TableColumn } from '../cell-registry';

@Component({
  selector: 'dt-text-cell',
  standalone: true,
  template: `<span class="dt-text" [class]="column()?.class ?? ''">{{ value() }}</span>`,
})
export class TextCellComponent {
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();
}
