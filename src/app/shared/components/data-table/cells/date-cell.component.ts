import { Component, input } from '@angular/core';
import { TableColumn } from '../cell-registry';

@Component({
  selector: 'dt-date-cell',
  standalone: true,
  template: `<span class="dt-date">{{ value() }}</span>`,
})
export class DateCellComponent {
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();
}
