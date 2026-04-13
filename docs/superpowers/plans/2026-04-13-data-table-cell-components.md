# Data Table Cell Components — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace verbose table row templates with a cell component registry so consumers only need column config, not templates.

**Architecture:** 7 cell components (text, amount, date, badge, progress, payment, actions) registered in a map. DataTableComponent uses `NgComponentOutlet` to dynamically render the right cell per column. A `TableActionService` forwards action events from cells to the parent. Backward-compatible `#rowTpl` still works.

**Tech Stack:** Angular 21 standalone components, signals, NgComponentOutlet, Lucide icons, CurrencyFormatPipe, PrivacyMaskPipe, AccountService.

---

### Task 1: Create TableColumn interface + cell-registry + TableActionService

**Files:**
- Create: `src/app/shared/components/data-table/cell-registry.ts`
- Create: `src/app/shared/components/data-table/table-action.service.ts`

- [ ] **Step 1: Create table-action.service.ts**

```typescript
// src/app/shared/components/data-table/table-action.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface TableActionEvent {
  type: string;
  row: any;
}

@Injectable()
export class TableActionService {
  private readonly _action$ = new Subject<TableActionEvent>();
  readonly action$ = this._action$.asObservable();

  emit(type: string, row: any): void {
    this._action$.next({ type, row });
  }
}
```

- [ ] **Step 2: Create cell-registry.ts with updated TableColumn interface**

```typescript
// src/app/shared/components/data-table/cell-registry.ts
import { Type } from '@angular/core';

export interface TableAction {
  type: string;
  icon: string;
  label: string;
  show?: (row: any) => boolean;
  class?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  cell?: string;            // 'text' | 'amount' | 'date' | 'badge' | 'progress' | 'payment' | 'actions'
  sortable?: boolean;
  hideOnMobile?: boolean;
  class?: string;
  actions?: TableAction[];
  icon?: string;            // for badge cell
  colorKey?: string;        // for payment cell
}

// Will be populated after cell components are created
export const CELL_REGISTRY: Record<string, Type<any>> = {};

export function resolve(obj: any, path: string): any {
  if (!path || !obj) return undefined;
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/shared/components/data-table/cell-registry.ts src/app/shared/components/data-table/table-action.service.ts
git commit -m "feat: add cell registry and table action service"
```

---

### Task 2: Create cell components (text, amount, date)

**Files:**
- Create: `src/app/shared/components/data-table/cells/text-cell.component.ts`
- Create: `src/app/shared/components/data-table/cells/amount-cell.component.ts`
- Create: `src/app/shared/components/data-table/cells/date-cell.component.ts`

- [ ] **Step 1: Create text-cell**

```typescript
// src/app/shared/components/data-table/cells/text-cell.component.ts
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
```

- [ ] **Step 2: Create amount-cell**

```typescript
// src/app/shared/components/data-table/cells/amount-cell.component.ts
import { Component, input } from '@angular/core';
import { CurrencyFormatPipe } from '../../../pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../../pipes/privacy-mask.pipe';
import { TableColumn } from '../cell-registry';

@Component({
  selector: 'dt-amount-cell',
  standalone: true,
  imports: [CurrencyFormatPipe, PrivacyMaskPipe],
  template: `<span class="dt-amount" [class]="column()?.class ?? ''">{{ value() | currencyFormat | privacyMask }}</span>`,
})
export class AmountCellComponent {
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();
}
```

- [ ] **Step 3: Create date-cell**

```typescript
// src/app/shared/components/data-table/cells/date-cell.component.ts
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
```

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/components/data-table/cells/
git commit -m "feat: add text, amount, date cell components"
```

---

### Task 3: Create cell components (badge, progress, payment, actions)

**Files:**
- Create: `src/app/shared/components/data-table/cells/badge-cell.component.ts`
- Create: `src/app/shared/components/data-table/cells/progress-cell.component.ts`
- Create: `src/app/shared/components/data-table/cells/payment-cell.component.ts`
- Create: `src/app/shared/components/data-table/cells/actions-cell.component.ts`

- [ ] **Step 1: Create badge-cell**

```typescript
// src/app/shared/components/data-table/cells/badge-cell.component.ts
import { Component, input, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TableColumn, resolve } from '../cell-registry';

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
    // icon can be a static name or a key path on the row
    const r = this.row();
    return resolve(r, col.icon) ?? col.icon;
  });
}
```

- [ ] **Step 2: Create progress-cell**

```typescript
// src/app/shared/components/data-table/cells/progress-cell.component.ts
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
```

- [ ] **Step 3: Create payment-cell**

```typescript
// src/app/shared/components/data-table/cells/payment-cell.component.ts
import { Component, input, inject } from '@angular/core';
import { AccountService } from '../../../../core/services/account.service';
import { TableColumn } from '../cell-registry';

@Component({
  selector: 'dt-payment-cell',
  standalone: true,
  template: `<span class="dt-payment" [style.color]="accountService.getColor(value())">{{ accountService.getLabel(value()) }}</span>`,
})
export class PaymentCellComponent {
  readonly accountService = inject(AccountService);
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();
}
```

- [ ] **Step 4: Create actions-cell**

```typescript
// src/app/shared/components/data-table/cells/actions-cell.component.ts
import { Component, input, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TableColumn } from '../cell-registry';
import { TableActionService } from '../table-action.service';

@Component({
  selector: 'dt-actions-cell',
  standalone: true,
  imports: [NgIcon],
  template: `
    <div class="dt-actions">
      @for (act of visibleActions; track act.type) {
        <button
          [class]="'dt-act ' + (act.class ?? '')"
          [title]="act.label"
          [attr.aria-label]="act.label"
          (click)="onAction(act.type)"
        >
          <ng-icon [name]="act.icon" size="14" />
        </button>
      }
    </div>
  `,
})
export class ActionsCellComponent {
  private readonly actionService = inject(TableActionService);
  value = input<any>();
  row = input<any>();
  column = input<TableColumn>();

  get visibleActions() {
    const actions = this.column()?.actions ?? [];
    const r = this.row();
    return actions.filter(a => !a.show || a.show(r));
  }

  onAction(type: string): void {
    this.actionService.emit(type, this.row());
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/components/data-table/cells/
git commit -m "feat: add badge, progress, payment, actions cell components"
```

---

### Task 4: Register cells and update DataTableComponent

**Files:**
- Modify: `src/app/shared/components/data-table/cell-registry.ts`
- Modify: `src/app/shared/components/data-table/data-table.component.ts`
- Modify: `src/app/shared/components/data-table/data-table.component.html`

- [ ] **Step 1: Register all cells in cell-registry.ts**

Add imports and populate `CELL_REGISTRY` at the bottom of `cell-registry.ts`:

```typescript
import { TextCellComponent } from './cells/text-cell.component';
import { AmountCellComponent } from './cells/amount-cell.component';
import { DateCellComponent } from './cells/date-cell.component';
import { BadgeCellComponent } from './cells/badge-cell.component';
import { ProgressCellComponent } from './cells/progress-cell.component';
import { PaymentCellComponent } from './cells/payment-cell.component';
import { ActionsCellComponent } from './cells/actions-cell.component';

export const CELL_REGISTRY: Record<string, Type<any>> = {
  text: TextCellComponent,
  amount: AmountCellComponent,
  date: DateCellComponent,
  badge: BadgeCellComponent,
  progress: ProgressCellComponent,
  payment: PaymentCellComponent,
  actions: ActionsCellComponent,
};
```

- [ ] **Step 2: Update data-table.component.ts**

Replace the full file:

```typescript
import { Component, input, output, contentChild, TemplateRef, OnInit, OnDestroy, inject, ViewEncapsulation } from '@angular/core';
import { NgTemplateOutlet, NgComponentOutlet } from '@angular/common';
import { Subscription } from 'rxjs';
import { TableColumn, CELL_REGISTRY, resolve } from './cell-registry';
import { TableActionService, TableActionEvent } from './table-action.service';

export { TableColumn, TableAction } from './cell-registry';
export { TableActionEvent } from './table-action.service';

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
  rowTpl = contentChild<TemplateRef<any>>('rowTpl');

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

  trackByFn(_: number, item: any): any {
    return item[this.trackBy()];
  }

  getCellComponent(cellName: string): any {
    return CELL_REGISTRY[cellName] ?? CELL_REGISTRY['text'];
  }

  getCellInputs(row: any, col: TableColumn): Record<string, any> {
    return { value: resolve(row, col.key), row, column: col };
  }

  resolve = resolve;
}
```

- [ ] **Step 3: Update data-table.component.html**

Replace the full template:

```html
<div class="table-wrap" [style.--table-min-width]="minWidth()">
  <table class="data-table">
    <thead>
      <tr>
        @for (col of columns(); track col.key) {
          <th
            [class.sortable]="col.sortable"
            [class.hide-mobile]="col.hideOnMobile"
            (click)="onSort(col)"
          >
            {{ col.label }}
            @if (col.sortable) { {{ getSortIcon(col.key) }} }
          </th>
        }
      </tr>
    </thead>
    <tbody>
      @if (rowTpl()) {
        @for (row of data(); track trackByFn($index, row)) {
          <tr [class]="getRowClass(row)">
            <ng-container *ngTemplateOutlet="rowTpl()!; context: { $implicit: row, index: $index }" />
          </tr>
        } @empty {
          <tr>
            <td [attr.colspan]="columns().length" class="empty-cell">{{ emptyMessage() }}</td>
          </tr>
        }
      } @else {
        @for (row of data(); track trackByFn($index, row)) {
          <tr [class]="getRowClass(row)">
            @for (col of columns(); track col.key) {
              <td [class]="col.class ?? ''" [class.hide-mobile]="col.hideOnMobile">
                <ng-container *ngComponentOutlet="getCellComponent(col.cell ?? 'text'); inputs: getCellInputs(row, col)" />
              </td>
            }
          </tr>
        } @empty {
          <tr>
            <td [attr.colspan]="columns().length" class="empty-cell">{{ emptyMessage() }}</td>
          </tr>
        }
      }
    </tbody>
  </table>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/app/shared/components/data-table/
git commit -m "feat: data-table renders cells via NgComponentOutlet registry"
```

---

### Task 5: Add dt-* global styles

**Files:**
- Modify: `src/styles.scss` — append dt-* styles

- [ ] **Step 1: Add dt-* styles to end of styles.scss**

```scss
/* -------------------------
   Data Table Cell Styles (global — used by NgComponentOutlet cells)
   ------------------------- */
.dt-text { font-weight: 600; }
.dt-date { font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; }
.dt-amount { font-family: 'DM Sans', sans-serif; font-weight: 700; }
.dt-income { color: var(--color-income) !important; }
.dt-expense { color: var(--color-expense) !important; }
.dt-bold { font-weight: 700; }
.dt-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--bg-secondary); padding: 4px 10px; border-radius: 20px;
  font-size: 0.75rem; font-weight: 600; white-space: nowrap; color: var(--text-secondary);
}
.dt-payment { font-size: 0.8rem; font-weight: 700; white-space: nowrap; }
.dt-progress {
  display: flex; align-items: center; gap: 6px;
  &__bar { width: 60px; height: 6px; background: var(--bg-secondary); border-radius: 6px; overflow: hidden; }
  &__fill { height: 100%; background: var(--primary); border-radius: 6px; transition: width 0.4s;
    &--done { background: var(--success); }
  }
  &__pct { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); min-width: 32px; }
}
.dt-actions { white-space: nowrap; display: flex; gap: 2px; }
.dt-act {
  background: none; border: none; cursor: pointer;
  padding: 6px; min-width: 30px; min-height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; color: var(--text-muted); transition: all 0.2s;
  &--pay:hover { color: var(--success); background: var(--success-light); }
  &--edit:hover { color: var(--primary); background: var(--primary-glow); }
  &--delete:hover { color: var(--danger); background: var(--danger-light); }
}
.dt-resolved { opacity: 0.5; }
```

- [ ] **Step 2: Commit**

```bash
git add src/styles.scss
git commit -m "feat: add dt-* global styles for cell components"
```

---

### Task 6: Replace loans table with config-only (zero template)

**Files:**
- Modify: `src/app/pages/loans/loans.component.ts`
- Modify: `src/app/pages/loans/loans.component.html`

- [ ] **Step 1: Update loans.component.ts — add column config + action handler**

Add after `viewMode` signal (around line 36):

```typescript
readonly loanColumns: TableColumn[] = [
  { key: 'loan.title', label: 'Title', cell: 'text', sortable: true, class: 'dt-bold' },
  { key: 'loan.amount', label: 'Amount', cell: 'amount', sortable: true },
  { key: 'totalPaid', label: 'Paid', cell: 'amount', sortable: true, class: 'dt-income' },
  { key: 'outstanding', label: 'Outstanding', cell: 'amount', sortable: true, class: 'dt-expense' },
  { key: 'percentage', label: 'Progress', cell: 'progress', sortable: true },
  { key: 'loan.accountId', label: 'Account', cell: 'payment', hideOnMobile: true },
  { key: 'loan.date', label: 'Date', cell: 'date', sortable: true, hideOnMobile: true },
  { key: 'actions', label: '', cell: 'actions', actions: [
    { type: 'pay', icon: 'lucideCheck', label: 'Pay', show: (s: any) => s.outstanding > 0, class: 'dt-act--pay' },
    { type: 'edit', icon: 'lucidePencil', label: 'Edit', class: 'dt-act--edit' },
    { type: 'delete', icon: 'lucideTrash2', label: 'Delete', class: 'dt-act--delete' },
  ]},
];
loanRowClass = (s: any) => s.outstanding <= 0 ? 'dt-resolved' : '';

onTableAction(event: { type: string; row: any }): void {
  switch (event.type) {
    case 'pay': this.openPayment(event.row); break;
    case 'edit': this.openEditLoan(event.row.loan); break;
    case 'delete': this.deletingLoanId.set(event.row.loan.id); break;
  }
}
```

Update imports to include `TableColumn` from data-table:

```typescript
import { DataTableComponent, TableColumn } from '../../shared/components/data-table/data-table.component';
```

- [ ] **Step 2: Update loans.component.html — remove #rowTpl**

Replace the table view section (lines 120-167) with:

```html
<!-- Table View -->
@if (viewMode() === 'table') {
  <app-data-table
    [columns]="loanColumns"
    [data]="sortedStatuses()"
    trackBy="loan"
    [sortField]="tableSortField()"
    [sortDir]="tableSortDir()"
    [rowClass]="loanRowClass"
    minWidth="650px"
    [emptyMessage]="'No ' + (activeTab() === 'borrowed' ? 'loans' : 'lent records')"
    (sortChange)="tableSort($event)"
    (action)="onTableAction($event)"
  />
}
```

Zero template. 11 lines instead of 47.

- [ ] **Step 3: Build and verify**

Run: `cd D:/finance-pwa && npx ng build`
Expected: Build passes with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/loans/
git commit -m "feat: loans table uses cell registry — zero template"
```

---

### Task 7: Verify backward compatibility (expenses #rowTpl)

**Files:**
- Verify: `src/app/pages/expenses/expenses.component.html` — #rowTpl still works

- [ ] **Step 1: Build full app**

Run: `cd D:/finance-pwa && npx ng build`
Expected: Build passes. Expenses table with #rowTpl renders correctly alongside loans config-only table.

- [ ] **Step 2: Clean up old lt-* styles from styles.scss**

Remove the old `lt-*` styles from `styles.scss` since loans now uses `dt-*` from cell components. Keep `et-*` styles for expenses (still uses template).

- [ ] **Step 3: Commit**

```bash
git add src/styles.scss
git commit -m "chore: remove old lt-* styles, replaced by dt-* cell components"
```
