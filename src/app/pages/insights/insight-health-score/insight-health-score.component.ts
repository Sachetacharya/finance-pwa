import { Component, input } from '@angular/core';

@Component({
  selector: 'app-insight-health-score',
  standalone: true,
  template: `
    <div class="health-score">
      <div class="health-score__ring" [style.--score]="score() ?? 0" [style.--color]="color()">
        <div class="health-score__inner">
          @if (score() !== null) {
            <span class="health-score__number">{{ score() }}</span>
            <span class="health-score__of">/100</span>
          } @else {
            <span class="health-score__number health-score__number--na">—</span>
          }
        </div>
      </div>
      <div class="health-score__info">
        <div class="health-score__label" [style.color]="color()">{{ label() }}</div>
        <div class="health-score__desc">
          @if (score() !== null) {
            Financial Health Score
          } @else {
            Add income & expenses to see your score
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './insight-health-score.component.scss',
})
export class InsightHealthScoreComponent {
  score = input.required<number | null>();
  label = input.required<string>();
  color = input.required<string>();
}
