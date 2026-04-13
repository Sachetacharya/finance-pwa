import { Component, input, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TableColumn, resolve } from '../types';

@Component({
  selector: 'dt-badge-cell',
  standalone: true,
  imports: [NgIcon],
  template: `
    <span class="dt-badge">
      @if (iconName()) { <ng-icon [name]="iconName()" size="14" /> }
      {{ value() }}
    </span>
  `,
})
export class BadgeCellComponent {
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();

  readonly iconName = computed(() => {
    const col = this.column();
    if (!col?.icon) return '';
    const r = this.row();
    return (resolve(r, col.icon) as string) ?? col.icon;
  });
}
