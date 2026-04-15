import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { TableActionEvent } from './types';

@Injectable()
export class TableActionService implements OnDestroy {
  private readonly _action$ = new Subject<TableActionEvent>();
  readonly action$ = this._action$.asObservable();

  emit(type: string, row: Record<string, unknown>): void {
    this._action$.next({ type, row });
  }

  ngOnDestroy(): void {
    this._action$.complete();
  }
}
