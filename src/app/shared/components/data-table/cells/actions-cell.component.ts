import { Component, input, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TableColumn, TableAction } from '../types';
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

  get visibleActions(): TableAction[] {
    const actions = this.column()?.actions ?? [];
    const r = this.row();
    return actions.filter(a => !a.show || a.show(r));
  }

  onAction(type: string): void {
    this.actionService.emit(type, this.row());
  }
}
