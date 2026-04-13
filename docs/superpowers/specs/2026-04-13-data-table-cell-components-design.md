# Data Table Cell Components — Design Spec

## Problem
DataTableComponent requires verbose `#rowTpl` templates for every table. Common cell patterns (amount, date, badge, actions) are repeated across pages with slight variations.

## Solution
Built-in cell components registered in a map. Column config specifies `cell: 'amount'` and the DataTable renders the correct component via `NgComponentOutlet`. Full `row` object passed to every cell so any data is accessible.

## Architecture

```
shared/components/data-table/
├── data-table.component.ts
├── data-table.component.html
├── data-table.component.scss
├── cell-registry.ts
├── table-action.service.ts
└── cells/
    ├── text-cell.component.ts
    ├── amount-cell.component.ts
    ├── date-cell.component.ts
    ├── badge-cell.component.ts
    ├── progress-cell.component.ts
    ├── payment-cell.component.ts
    └── actions-cell.component.ts
```

## Column Interface

```typescript
interface TableColumn {
  key: string;              // dot-path: 'loan.title', 'outstanding'
  label: string;
  cell?: string;            // 'text' | 'amount' | 'date' | 'badge' | 'progress' | 'payment' | 'actions'
  sortable?: boolean;
  hideOnMobile?: boolean;
  class?: string;           // extra CSS class on <td>
  actions?: TableAction[];  // for 'actions' cell
  icon?: string;            // for 'badge' cell — icon key path or static name
  colorKey?: string;        // for 'payment' cell — key path to get color
}

interface TableAction {
  type: string;             // emitted in event: 'edit', 'delete', 'pay', etc.
  icon: string;             // lucide icon name
  label: string;            // tooltip/aria-label
  show?: (row: any) => boolean;  // conditionally show/hide
  class?: string;           // CSS class for hover color
}
```

## Cell Component Contract

Every cell component has 3 inputs:
- `value: any` — resolved from `row` using `col.key` (supports dot paths)
- `row: any` — the full row object (access any data)
- `column: TableColumn` — the column config (access actions, class, icon, etc.)

## Cell Registry

```typescript
const CELL_REGISTRY: Record<string, Type<any>> = {
  text: TextCellComponent,
  amount: AmountCellComponent,
  date: DateCellComponent,
  badge: BadgeCellComponent,
  progress: ProgressCellComponent,
  payment: PaymentCellComponent,
  actions: ActionsCellComponent,
};
```

## Cell Descriptions

| Cell | Template | Inputs used |
|------|----------|-------------|
| text | `{{ value }}` | value |
| amount | `{{ value \| currencyFormat \| privacyMask }}` | value |
| date | `<span class="dt-date">{{ value }}</span>` | value |
| badge | `<icon> {{ value }}` in pill | value, column.icon, row |
| progress | bar + `{{ value }}%` | value (percentage number) |
| payment | colored text via AccountService | value (account id), row |
| actions | icon buttons, emits via TableActionService | column.actions, row |

## Action Flow

1. `ActionsCellComponent` injects `TableActionService`
2. User clicks button → `service.emit(action.type, row)`
3. `DataTableComponent` provides `TableActionService`, subscribes in constructor
4. Forwards to `(action)` output → parent handles: `onAction({type: 'edit', row})`

## DataTable Template (core)

```html
@for (col of columns(); track col.key) {
  <td [class]="getTdClass(col)" [class.hide-mobile]="col.hideOnMobile">
    <ng-container *ngComponentOutlet="
      getCellComponent(col.cell ?? 'text');
      inputs: { row: row, column: col, value: resolve(row, col.key) }
    " />
  </td>
}
```

## Dot-path Resolver

```typescript
resolve(obj: any, path: string): any {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}
```

## Usage Example (Loans)

```typescript
loanColumns: TableColumn[] = [
  { key: 'loan.title', label: 'Title', cell: 'text', sortable: true, class: 'dt-bold' },
  { key: 'loan.amount', label: 'Amount', cell: 'amount', sortable: true },
  { key: 'totalPaid', label: 'Paid', cell: 'amount', class: 'dt-income' },
  { key: 'outstanding', label: 'Outstanding', cell: 'amount', class: 'dt-expense' },
  { key: 'percentage', label: 'Progress', cell: 'progress', sortable: true },
  { key: 'loan.accountId', label: 'Account', cell: 'payment', hideOnMobile: true },
  { key: 'loan.date', label: 'Date', cell: 'date', sortable: true, hideOnMobile: true },
  { key: 'actions', label: '', cell: 'actions', actions: [
    { type: 'pay', icon: 'lucideCheck', label: 'Pay', show: (s) => s.outstanding > 0, class: 'dt-act--pay' },
    { type: 'edit', icon: 'lucidePencil', label: 'Edit', class: 'dt-act--edit' },
    { type: 'delete', icon: 'lucideTrash2', label: 'Delete', class: 'dt-act--delete' },
  ]},
];
```

```html
<app-data-table
  [columns]="loanColumns"
  [data]="sortedStatuses()"
  [sortField]="tableSortField()"
  [sortDir]="tableSortDir()"
  [rowClass]="loanRowClass"
  (sortChange)="tableSort($event)"
  (action)="onTableAction($event)"
/>
```

## Backwards Compatibility

- `#rowTpl` still works for fully custom cases (expenses statement mode)
- If `#rowTpl` is provided, it overrides the cell registry (existing behavior)
- Old `lt-*` and `et-*` styles remain for template-based tables

## New Global Styles (styles.scss, dt-* prefix)

```
dt-bold, dt-date, dt-income, dt-expense, dt-badge, dt-payment,
dt-progress, dt-act, dt-act--pay, dt-act--edit, dt-act--delete, dt-hide-m
```

## Files to Create
- `cells/text-cell.component.ts`
- `cells/amount-cell.component.ts`
- `cells/date-cell.component.ts`
- `cells/badge-cell.component.ts`
- `cells/progress-cell.component.ts`
- `cells/payment-cell.component.ts`
- `cells/actions-cell.component.ts`
- `cell-registry.ts`
- `table-action.service.ts`

## Files to Modify
- `data-table.component.ts` — add NgComponentOutlet, cell resolution, action forwarding
- `data-table.component.html` — add cell rendering loop
- `styles.scss` — add dt-* styles
- `loans.component.ts` — replace template with column config
- `loans.component.html` — remove #rowTpl, use config-only

## Verification
- Loans table renders identically with zero template
- Sorting works
- Action events reach parent with full row data
- Expenses table still works with #rowTpl (backward compat)
- Dark mode, privacy mask, mobile responsive all work
