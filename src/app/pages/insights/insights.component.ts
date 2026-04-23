import { Component, inject, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { InsightsService } from '../../core/services/insights.service';
import { AccountService } from '../../core/services/account.service';
import { InsightHealthScoreComponent } from './insight-health-score/insight-health-score.component';
import { InsightCardComponent } from './insight-card/insight-card.component';

type SectionId = 'overview' | 'category' | 'patterns' | 'loans' | 'months' | 'forecast' | 'lifestyle';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [NgIcon, CurrencyFormatPipe, PrivacyMaskPipe, InsightHealthScoreComponent, InsightCardComponent],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.scss',
})
export class InsightsComponent {
  readonly insights = inject(InsightsService);
  readonly accountService = inject(AccountService);

  /** Accordion open/closed state per section — defaults to all open */
  private readonly _openSections = signal<Record<SectionId, boolean>>({
    overview: true, category: true, patterns: true,
    loans: true, months: true, forecast: true, lifestyle: true,
  });

  isOpen(id: SectionId): boolean {
    return this._openSections()[id];
  }

  toggle(id: SectionId): void {
    this._openSections.update(s => ({ ...s, [id]: !s[id] }));
  }
}
