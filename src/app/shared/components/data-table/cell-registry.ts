import { Type } from '@angular/core';
import { TextCellComponent } from './cells/text-cell.component';
import { AmountCellComponent } from './cells/amount-cell.component';
import { DateCellComponent } from './cells/date-cell.component';
import { BadgeCellComponent } from './cells/badge-cell.component';
import { ProgressCellComponent } from './cells/progress-cell.component';
import { PaymentCellComponent } from './cells/payment-cell.component';
import { ActionsCellComponent } from './cells/actions-cell.component';

export type { TableAction, TableColumn, TableActionEvent, CellInputs } from './types';
export { resolve } from './types';

export const CELL_REGISTRY: Record<string, Type<unknown>> = {
  text: TextCellComponent,
  amount: AmountCellComponent,
  date: DateCellComponent,
  badge: BadgeCellComponent,
  progress: ProgressCellComponent,
  payment: PaymentCellComponent,
  actions: ActionsCellComponent,
};
