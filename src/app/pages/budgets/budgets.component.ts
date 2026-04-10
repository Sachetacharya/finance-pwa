import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BudgetService } from '../../core/services/budget.service';
import { NotificationService } from '../../core/services/notification.service';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { ExpenseCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '../../core/models/expense.model';
import { LockScrollDirective } from '../../shared/directives/lock-scroll.directive';

@Component({
  selector: 'app-budgets',
  standalone: true,
  imports: [FormsModule, CurrencyFormatPipe, LockScrollDirective],
  templateUrl: './budgets.component.html',
  styleUrl: './budgets.component.scss',
})
export class BudgetsComponent {
  readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);

  readonly showAddForm = signal(false);
  readonly categoryLabels = CATEGORY_LABELS;
  readonly categoryIcons = CATEGORY_ICONS;

  newCategory: ExpenseCategory | '' = '';
  newLimit = 0;

  readonly allCategories = Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][];

  get availableCategories() {
    const existing = new Set(this.budgetService.budgets().map(b => b.category));
    return this.allCategories.filter(([key]) => !existing.has(key));
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
