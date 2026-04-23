import { Component, inject, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { LockScrollDirective } from '../../../shared/directives/lock-scroll.directive';
import { BudgetService } from '../../../core/services/budget.service';
import { NotificationService } from '../../../core/services/notification.service';
import { WizardConfigService, BudgetPreset } from '../../../core/services/wizard-config.service';
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
  /** Pool override — if provided, takes precedence over the stored config */
  pool = input<number | null>(null);
  closed = output<void>();

  private readonly budgetService = inject(BudgetService);
  private readonly notification = inject(NotificationService);
  private readonly config = inject(WizardConfigService);

  readonly rows = signal<CategoryRow[]>([]);
  readonly activePreset = signal<string | null>(null);
  readonly presets = signal<BudgetPreset[]>([]);
  poolInput = 0;

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
    const cfg = this.config.loadBudget();
    this.presets.set(cfg.presets);

    const poolOverride = this.pool();
    this.poolInput = poolOverride != null ? poolOverride : cfg.pool;

    // Prefer existing category budgets; fall back to last-used amounts from config
    const existing = new Map(this.budgetService.budgets().map(b => [b.category, b.monthlyLimit]));
    const hasExistingBudgets = existing.size > 0;

    this.rows.set(cfg.categories.map(cat => {
      const amount = existing.get(cat) ?? cfg.amounts[cat] ?? 0;
      return {
        category: cat,
        label: CATEGORY_LABELS[cat],
        icon: CATEGORY_ICONS[cat],
        amount,
        daily: Math.round(amount / 30),
      };
    }));

    // Mark a preset active only if amounts exactly match one (and user hasn't saved custom budgets)
    if (!hasExistingBudgets) {
      this.activePreset.set(cfg.defaultPreset);
    } else {
      this.activePreset.set(this.detectMatchingPreset());
    }
  }

  private detectMatchingPreset(): string | null {
    const current = Object.fromEntries(this.rows().map(r => [r.category, r.amount]));
    for (const p of this.presets()) {
      const matches = Object.entries(p.amounts).every(([k, v]) => (current as any)[k] === v);
      if (matches) return p.key;
    }
    return null;
  }

  updateRow(category: ExpenseCategory, amount: number): void {
    const n = Math.max(0, Number(amount) || 0);
    this.rows.update(list => list.map(r =>
      r.category === category ? { ...r, amount: n, daily: Math.round(n / 30) } : r
    ));
    this.activePreset.set(null);
  }

  applyPreset(key: string): void {
    const p = this.presets().find(x => x.key === key);
    if (!p) return;
    this.rows.update(list => list.map(r => {
      const amount = p.amounts[r.category] ?? r.amount;
      return { ...r, amount, daily: Math.round(amount / 30) };
    }));
    this.activePreset.set(key);
  }

  execute(): void {
    let applied = 0;
    for (const r of this.rows()) {
      const amt = Number(r.amount) || 0;
      this.budgetService.setBudget(r.category, amt);
      if (amt > 0) applied++;
    }

    // Persist last-used amounts so next open reflects the user's actual preferences
    const cfg = this.config.loadBudget();
    const amounts: Record<string, number> = {};
    for (const r of this.rows()) amounts[r.category] = r.amount;
    this.config.saveBudget({
      ...cfg,
      pool: this.poolInput,
      amounts: amounts as any,
      defaultPreset: this.activePreset() ?? cfg.defaultPreset,
    });

    this.notification.success(`${applied} category budget${applied === 1 ? '' : 's'} applied`);
    this.closed.emit();
  }
}
