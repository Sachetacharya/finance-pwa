import { Component, input, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

export interface InsightItem {
  type: 'warning' | 'success' | 'info' | 'danger';
  icon: string;
  text: string;
}

@Component({
  selector: 'app-insight-card',
  standalone: true,
  imports: [NgIcon],
  template: `
    <div class="section" [class.section--collapsed]="!open()">
      <button type="button" class="section__title section__title--btn" (click)="open.set(!open())" [attr.aria-expanded]="open()">
        <span class="section__title-left">
          <ng-icon [name]="icon()" size="18" /> {{ title() }}
          <span class="section__count">({{ items().length }})</span>
        </span>
        <ng-icon [name]="open() ? 'lucideChevronUp' : 'lucideChevronDown'" size="16" />
      </button>
      @if (open()) {
        <div class="insight-list">
          @for (item of items(); track item.text) {
            <div class="insight-item insight-item--{{ item.type }}">
              <ng-icon [name]="item.icon" size="18" />
              <span>{{ item.text }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './insight-card.component.scss',
})
export class InsightCardComponent {
  title = input.required<string>();
  icon = input.required<string>();
  items = input.required<InsightItem[]>();
  readonly open = signal(false);
}
