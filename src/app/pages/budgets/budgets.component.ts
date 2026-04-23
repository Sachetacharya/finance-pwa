import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../core/services/budget.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ExpenseCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '../../core/models/expense.model';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { NgIcon } from '@ng-icons/core';
import { BudgetWizardComponent } from './budget-wizard/budget-wizard.component';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [FormsModule, CurrencyFormatPipe, PrivacyMaskPipe, LockScrollDirective, NgIcon, BudgetWizardComponent],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent {
  readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);

  readonly showAddForm = signal(false);
  readonly showGoalsForm = signal(false);
  readonly showWizard = signal(false);
  readonly categoryLabels = CATEGORY_LABELS;
  readonly categoryIcons = CATEGORY_ICONS;

  newCategory: ExpenseCategory | '' = '';
  newLimit = 0;
  overallLimitInput = 0;
  savingsGoalInput = 0;
  paydayDateInput = '';
  cycleStartInput = '';

  readonly allCategories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];

  get availableCategories() {
    const existing = new Set(this.budgetService.budgets().map(b => b.category));
    return this.allCategories.filter(([key]) => !existing.has(key));
  }

  openGoalsForm(): void {
    const s = this.budgetService.settings();
    this.overallLimitInput = s.overallLimit;
    this.savingsGoalInput = s.savingsGoal;
    this.paydayDateInput = s.paydayDate || '';
    this.cycleStartInput = s.cycleStartDate || '';
    this.showGoalsForm.set(true);
  }

  onSaveGoals(): void {
    this.budgetService.setOverallLimit(this.overallLimitInput);
    this.budgetService.setSavingsGoal(this.savingsGoalInput);
    this.budgetService.setPaydayDate(this.paydayDateInput);
    this.budgetService.setCycleStartDate(this.cycleStartInput);
    this.notification.success('Goals updated');
    this.showGoalsForm.set(false);
  }

  useTodayAsCycleStart(): void {
    this.cycleStartInput = new Date().toISOString().split('T')[0];
  }

  onAdd(): void {
    if (!this.newCategory || !this.newLimit) return;
    this.budgetService.setBudget(this.newCategory as ExpenseCategory, this.newLimit);
    this.notification.success(`Budget set for ${CATEGORY_LABELS[this.newCategory as ExpenseCategory]}`);
    this.newCategory = '';
    this.newLimit = 0;
    this.showAddForm.set(false);
  }

  onUpdate(category: ExpenseCategory, limit: number): void {
    if (limit <= 0) return;
    this.budgetService.setBudget(category, limit);
    this.notification.success(`Budget updated for ${CATEGORY_LABELS[category]}`);
  }

  onRemove(category: ExpenseCategory): void {
    this.budgetService.removeBudget(category);
    this.notification.success(`Budget removed for ${CATEGORY_LABELS[category]}`);
  }
}
