import { Component, input, computed } from '@angular/core';
import { TableColumn } from '../cell-registry';

@Component({
  selector: 'dt-progress-cell',
  standalone: true,
  template: `
    <div class="dt-progress">
      <div class="dt-progress__bar">
        <div class="dt-progress__fill" [class.dt-progress__fill--done]="pct() >= 100" [style.width.%]="pct() > 100 ? 100 : pct()"></div>
      </div>
      <span class="dt-progress__pct">{{ pct() }}%</span>
    </div>
  `,
})
export class ProgressCellComponent {
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();

  readonly pct = computed(() => Number(this.value()) || 0);
}
