import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { TableActionEvent } from './types';

export type { TableActionEvent } from './types';

@Injectable()
export class TableActionService {
  private readonly _action$ = new Subject<TableActionEvent>();
  readonly action$ = this._action$.asObservable();

  emit(type: string, row: Record<string, unknown>): void {
    this._action$.next({ type, row });
  }
}
