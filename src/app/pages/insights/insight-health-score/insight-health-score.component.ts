import { Component, input } from '@angular/core';

@Component({
  selector: 'app-insight-health-score',
  standalone: true,
  template: `
    <div class="health-score">
      <div class="health-score__ring" [style.--score]="score()" [style.--color]="color()">
        <div class="health-score__inner">
          <span class="health-score__number">{{ score() }}</span>
          <span class="health-score__of">/100</span>
        </div>
      </div>
      <div class="health-score__info">
        <div class="health-score__label" [style.color]="color()">{{ label() }}</div>
        <div class="health-score__desc">Financial Health Score</div>
      </div>
    </div>
  `,
  styleUrl: './insight-health-score.component.scss',
})
export class InsightHealthScoreComponent {
  score = input.required<number>();
  label = input.required<string>();
  color = input.required<string>();
}
