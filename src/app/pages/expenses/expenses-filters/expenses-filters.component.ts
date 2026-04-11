import { Component, input, output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { ExpenseFilter, ExpenseCategory, IncomeSource } from '../../../core/models/expense.model';
import { AccountService } from '../../../core/services/account.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-expenses-filters',
  standalone: true,
  imports: [FormsModule, NgIcon],
  templateUrl: './expenses-filters.component.html',
  styleUrl: './expenses-filters.component.scss',
})
export class ExpensesFiltersComponent {
  readonly accountService = inject(AccountService);

  filter = input.required<ExpenseFilter>();
  categories = input.required<[ExpenseCategory, string][]>();
  incomeSources = input.required<[IncomeSource, string][]>();
  showFilters = input.required<boolean>();
  activeFilterCount = input.required<number>();

  filterChange = output<{ key: string; value: string }>();
  amountFilterChange = output<{ key: string; value: number | undefined }>();
  toggleFilters = output<void>();
  clearFilters = output<void>();
  searchChange = output<string>();

  readonly filteredCategories = computed(() =>
    this.filter().type === 'income' ? this.incomeSources() : this.categories()
  );
}
