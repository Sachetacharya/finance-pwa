import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { PrivacyMaskPipe } from '../../pipes/privacy-mask.pipe';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgIcon, CommonModule, PrivacyMaskPipe],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  title = input.required<string>();
  value = input.required<string>();
  subtitle = input<string>('');
  icon = input<string>(''); // lucide icon name e.g. 'lucideWallet'
  trend = input<number | null>(null);
  trendLabel = input<string>('');
  color = input<'primary' | 'success' | 'warning' | 'danger' | 'info'>('primary');
}
