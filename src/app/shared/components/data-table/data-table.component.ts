import { Component, input, output, contentChild, TemplateRef, ViewEncapsulation } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  hideOnMobile?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DataTableComponent {
  columns = input.required<TableColumn[]>();
  data = input.required<any[]>();
  trackBy = input<string>('id');
  sortField = input<string>('');
  sortDir = input<string>('desc');
  emptyMessage = input<string>('No data found');
  minWidth = input<string>('600px');
  rowClass = input<(row: any) => string>();

  sortChange = output<string>();
  rowHeaderTpl = contentChild<TemplateRef<any>>('headerTpl');
  rowTpl = contentChild<TemplateRef<any>>('rowTpl');

  getSortIcon(key: string): string {
    if (this.sortField() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  onSort(col: TableColumn): void {
    if (col.sortable) this.sortChange.emit(col.key);
  }

  getRowClass(row: any): string {
    const fn = this.rowClass();
    return fn ? fn(row) : '';
  }

  trackByFn(_: number, item: any): any {
    return item[this.trackBy()];
  }
}
