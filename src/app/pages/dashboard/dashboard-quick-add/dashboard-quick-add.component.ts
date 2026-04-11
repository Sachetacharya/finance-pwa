import { Component, inject, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../../shared/pipes/privacy-mask.pipe';
import { PrivacyService } from '../../../core/services/privacy.service';
import { TransactionTemplate } from '../../../core/models/template.model';
import { ALL_CATEGORY_ICONS } from '../../../core/models/expense.model';

@Component({
  selector: 'app-dashboard-quick-add',
  standalone: true,
  imports: [RouterModule, NgIcon, CurrencyFormatPipe, PrivacyMaskPipe],
  templateUrl: './dashboard-quick-add.component.html',
  styleUrl: './dashboard-quick-add.component.scss',
})
export class DashboardQuickAddComponent {
  readonly privacy = inject(PrivacyService);
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;

  templates = input.required<TransactionTemplate[]>();
  quickUse = output<string>();
  editUse = output<string>();
}
