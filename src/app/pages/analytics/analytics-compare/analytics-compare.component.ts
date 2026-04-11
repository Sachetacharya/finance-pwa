import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../../shared/pipes/privacy-mask.pipe';

@Component({
  selector: 'app-analytics-compare',
  standalone: true,
  imports: [FormsModule, CurrencyFormatPipe, PrivacyMaskPipe],
  templateUrl: './analytics-compare.component.html',
  styleUrl: './analytics-compare.component.scss',
})
export class AnalyticsCompareComponent {
  availableMonths = input.required<string[]>();
  monthA = input.required<string>();
  monthB = input.required<string>();
  compareData = input.required<any>();

  monthAChange = output<string>();
  monthBChange = output<string>();

  formatMonth(ym: string): string {
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[+m - 1]} ${y}`;
  }
}
