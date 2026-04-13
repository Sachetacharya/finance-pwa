import { Component, input, output, contentChild, TemplateRef, OnInit, OnDestroy, inject, ViewEncapsulation, Type } from '@angular/core';
import { NgTemplateOutlet, NgComponentOutlet } from '@angular/common';
import { Subscription } from 'rxjs';
import { CELL_REGISTRY } from './cell-registry';
import { TableColumn, TableActionEvent, resolve } from './types';
import { TableActionService } from './table-action.service';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgTemplateOutlet, NgComponentOutlet],
  providers: [TableActionService],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DataTableComponent implements OnInit, OnDestroy {
  private readonly actionService = inject(TableActionService);
  private actionSub?: Subscription;

  columns = input.required<TableColumn[]>();
  data = input.required<any[]>();
  trackBy = input<string>('id');
  sortField = input<string>('');
  sortDir = input<string>('desc');
  emptyMessage = input<string>('No data found');
  minWidth = input<string>('600px');
  rowClass = input<(row: any) => string>();

  sortChange = output<string>();
  action = output<TableActionEvent>();
  rowTpl = contentChild<TemplateRef<unknown>>('rowTpl');

  ngOnInit(): void {
    this.actionSub = this.actionService.action$.subscribe(e => this.action.emit(e));
  }

  ngOnDestroy(): void {
    this.actionSub?.unsubscribe();
  }

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

  trackByFn(_: number, item: any): unknown {
    return item[this.trackBy()];
  }

  getCellComponent(cellName: string): Type<unknown> {
    return CELL_REGISTRY[cellName] ?? CELL_REGISTRY['text'];
  }

  getCellInputs(row: any, col: TableColumn): any {
    return { value: resolve(row, col.key), row, column: col };
  }
}
