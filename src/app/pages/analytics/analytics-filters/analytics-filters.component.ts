import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-analytics-filters',
  standalone: true,
  imports: [FormsModule, NgIcon],
  templateUrl: './analytics-filters.component.html',
  styleUrl: './analytics-filters.component.scss',
})
export class AnalyticsFiltersComponent {
  dateRange = input.required<string>();
  customStart = input.required<string>();
  customEnd = input.required<string>();
  filterAccount = input.required<string>();
  compareMode = input.required<boolean>();
  accounts = input.required<{ id: string; name: string }[]>();

  dateRangeChange = output<any>();
  customStartChange = output<string>();
  customEndChange = output<string>();
  filterAccountChange = output<string>();
  compareModeChange = output<boolean>();
  reset = output<void>();

  get hasActiveFilters(): boolean {
    return this.dateRange() !== 'all' || !!this.filterAccount();
  }
}
