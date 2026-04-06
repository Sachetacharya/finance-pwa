import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  title = input.required<string>();
  value = input.required<string>();
  subtitle = input<string>('');
  icon = input<string>('');
  trend = input<number | null>(null);
  trendLabel = input<string>('');
  color = input<'primary' | 'success' | 'warning' | 'danger' | 'info'>('primary');
}
