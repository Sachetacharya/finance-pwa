import { Component, input, output, contentChild, TemplateRef, OnInit, OnDestroy, inject, ViewEncapsulation, Type, signal, computed } from '@angular/core';
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

  // ── Inputs ──
  columns = input.required<TableColumn[]>();
  data = input.required<any[]>();
  trackBy = input<string>('id');
  emptyMessage = input<string>('No data found');
  minWidth = input<string>('600px');
  showAllOnMobile = input<boolean>(true);
  rowClass = input<(row: any) => string>();
  pageSize = input<number>(0); // 0 = no pagination

  // ── Outputs ──
  action = output<TableActionEvent>();
  rowTpl = contentChild<TemplateRef<unknown>>('rowTpl');

  // ── Internal sort state ──
  readonly sortField = signal<string>('');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  // ── Internal pagination state ──
  readonly currentPage = signal(1);

  // ── Sorted data ──
  readonly sortedData = computed(() => {
    const items = [...this.data()];
    const field = this.sortField();
    const dir = this.sortDir();
    if (!field) return items;

    items.sort((a, b) => {
      const va = resolve(a, field) ?? '';
      const vb = resolve(b, field) ?? '';
      const sa = typeof va === 'string' ? va.toLowerCase() : va;
      const sb = typeof vb === 'string' ? vb.toLowerCase() : vb;
      if (sa < sb) return dir === 'asc' ? -1 : 1;
      if (sa > sb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return items;
  });

  // ── Paginated data ──
  readonly paginatedData = computed(() => {
    const ps = this.pageSize();
    if (!ps) return this.sortedData();
    const start = (this.currentPage() - 1) * ps;
    return this.sortedData().slice(start, start + ps);
  });

  readonly totalPages = computed(() => {
    const ps = this.pageSize();
    if (!ps) return 1;
    return Math.max(1, Math.ceil(this.sortedData().length / ps));
  });

  readonly totalItems = computed(() => this.sortedData().length);

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  readonly hasPagination = computed(() => this.pageSize() > 0 && this.totalPages() > 1);

  readonly paginationStart = computed(() => {
    const ps = this.pageSize();
    if (!ps) return 1;
    return (this.currentPage() - 1) * ps + 1;
  });

  readonly paginationEnd = computed(() => {
    const ps = this.pageSize();
    if (!ps) return this.totalItems();
    return Math.min(this.currentPage() * ps, this.totalItems());
  });

  // ── Lifecycle ──
  ngOnInit(): void {
    this.actionSub = this.actionService.action$.subscribe(e => this.action.emit(e));
  }

  ngOnDestroy(): void {
    this.actionSub?.unsubscribe();
  }

  // ── Sort ──
  getSortIcon(key: string): string {
    if (this.sortField() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  onSort(col: TableColumn): void {
    if (!col.sortable) return;
    if (this.sortField() === col.key) {
      this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(col.key);
      this.sortDir.set('desc');
    }
    this.currentPage.set(1);
  }

  // ── Pagination ──
  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  // ── Row ──
  getRowClass(row: any): string {
    const fn = this.rowClass();
    return fn ? fn(row) : '';
  }

  trackByFn(_: number, item: any): unknown {
    return item[this.trackBy()];
  }

  // ── Cells ──
  getCellComponent(cellName: string): Type<unknown> {
    return CELL_REGISTRY[cellName] ?? CELL_REGISTRY['text'];
  }

  getCellInputs(row: any, col: TableColumn): any {
    return { value: resolve(row, col.key), row, column: col };
  }
}
