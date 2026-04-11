import { Component, input } from '@angular/core';
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
    <div class="section">
      <h2 class="section__title"><ng-icon [name]="icon()" size="18" /> {{ title() }}</h2>
      <div class="insight-list">
        @for (item of items(); track item.text) {
          <div class="insight-item insight-item--{{ item.type }}">
            <ng-icon [name]="item.icon" size="18" />
            <span>{{ item.text }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './insight-card.component.scss',
})
export class InsightCardComponent {
  title = input.required<string>();
  icon = input.required<string>();
  items = input.required<InsightItem[]>();
}
