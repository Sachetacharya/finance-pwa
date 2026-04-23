import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { LockScrollDirective } from '../../../shared/directives/lock-scroll.directive';
import { BudgetService } from '../../../core/services/budget.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ExpenseCategory, CATEGORY_LABELS, CATEGORY_ICONS } from '../../../core/models/expense.model';

interface CategoryRow {
  category: ExpenseCategory;
  label: string;
  icon: string;
  amount: number;
  daily: number;
}

@Component({
  selector: 'app-budget-wizard',
  standalone: true,
  imports: [FormsModule, NgIcon, CurrencyFormatPipe, LockScrollDirective],
  templateUrl: './budget-wizard.component.html',
  styleUrl: './budget-wizard.component.scss',
})
export class BudgetWizardComponent {
  /** Total pool to allocate across categories (defaults to 30,200) */
  pool = input<number>(30200);
  closed = output<void>();

  private readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);

  readonly rows = signal<CategoryRow[]>([]);
  readonly activePreset = signal<'tight' | 'balanced' | 'generous' | null>('balanced');
  poolInput = 30200;

  readonly totalAllocated = computed(() =>
    this.rows().reduce((s, r) => s + (Number(r.amount) || 0), 0)
  );

  readonly buffer = computed(() =>
    Math.round((this.poolInput - this.totalAllocated()) * 100) / 100
  );

  readonly percentAllocated = computed(() => {
    const p = this.poolInput > 0 ? (this.totalAllocated() / this.poolInput) * 100 : 0;
    return Math.round(p * 10) / 10;
  });

  ngOnInit(): void {
    this.poolInput = this.pool();

    // Sensible defaults based on the user's actual spending patterns
    const defaults: Array<{ category: ExpenseCategory; amount: number }> = [
      { category: 'food',             amount: 10000 },
      { category: 'shopping',         amount: 5000  },
      { category: 'personal',         amount: 2500  },
      { category: 'bills',            amount: 1500  },
      { category: 'travel-transport', amount: 1500  },
      { category: 'other',            amount: 2000  },
      { category: 'fees-charges',     amount: 200   },
    ];

    // Pre-fill from existing budgets where set
    const existing = new Map(this.budgetService.budgets().map(b => [b.category, b.monthlyLimit]));
    const hasExisting = existing.size > 0;

    this.rows.set(defaults.map(d => {
      const amount = existing.get(d.category) ?? d.amount;
      return {
        category: d.category,
        label: CATEGORY_LABELS[d.category],
        icon: CATEGORY_ICONS[d.category],
        amount,
        daily: Math.round(amount / 30),
      };
    }));

    // If user already had custom budgets, don't claim a preset is active
    if (hasExisting) this.activePreset.set(null);
  }

  updateRow(category: ExpenseCategory, amount: number): void {
    const n = Math.max(0, Number(amount) || 0);
    this.rows.update(list => list.map(r =>
      r.category === category ? { ...r, amount: n, daily: Math.round(n / 30) } : r
    ));
    // Manual edit breaks out of preset mode
    this.activePreset.set(null);
  }

  /** Quick preset: balanced (default), tight (more savings), generous */
  applyPreset(preset: 'balanced' | 'tight' | 'generous'): void {
    const presets: Record<string, Record<ExpenseCategory, number>> = {
      balanced: {
        food: 10000, shopping: 5000, personal: 2500, bills: 1500,
        'travel-transport': 1500, other: 2000, 'fees-charges': 200,
        // unused in this wizard but required to satisfy type
        housing: 0, 'loans-debt': 0, investment: 0,
      } as any,
      tight: {
        food: 8000, shopping: 3000, personal: 2000, bills: 1500,
        'travel-transport': 1000, other: 1500, 'fees-charges': 200,
        housing: 0, 'loans-debt': 0, investment: 0,
      } as any,
      generous: {
        food: 12000, shopping: 7000, personal: 3000, bills: 2000,
        'travel-transport': 2500, other: 3000, 'fees-charges': 500,
        housing: 0, 'loans-debt': 0, investment: 0,
      } as any,
    };

    const chosen = presets[preset];
    this.rows.update(list => list.map(r => {
      const amount = chosen[r.category] ?? r.amount;
      return { ...r, amount, daily: Math.round(amount / 30) };
    }));
    this.activePreset.set(preset);
  }

  execute(): void {
    let applied = 0;
    for (const r of this.rows()) {
      const amt = Number(r.amount) || 0;
      this.budgetService.setBudget(r.category, amt);
      if (amt > 0) applied++;
    }
    this.notification.success(`${applied} category budget${applied === 1 ? '' : 's'} applied`);
    this.closed.emit();
  }
}
