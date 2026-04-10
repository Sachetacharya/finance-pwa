import { Component, inject } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { InsightsService } from '../../core/services/insights.service';
import { AccountService } from '../../core/services/account.service';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [NgIcon, CurrencyFormatPipe, PrivacyMaskPipe],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.scss',
})
export class InsightsComponent {
  readonly insights = inject(InsightsService);
  readonly accountService = inject(AccountService);
}
