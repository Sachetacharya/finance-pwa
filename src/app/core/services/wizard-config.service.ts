import { Injectable } from '@angular/core';
import { ExpenseCategory } from '../models/expense.model';

export type WizardKind = 'expense' | 'transfer';

/** Account hint used to resolve an account id at runtime (by matching name substring) */
export type AccountHint = 'kumari' | 'siddhartha' | 'nabil' | 'global' | 'esewa' | 'salary' | '';

export interface SalaryAllocationConfig {
  id: string;
  label: string;
  kind: WizardKind;
  accountHint?: AccountHint;   // resolved to id when opening the wizard; empty means "keep in salary account"
  category?: ExpenseCategory;  // only for kind === 'expense'
  amount: number;
  reservedNote?: string;
  compulsory?: boolean;
}

export interface SalaryWizardConfig {
  salaryAmount: number;
  cycleDays: number;                       // default gap to next payday
  allocations: SalaryAllocationConfig[];
}

export interface BudgetPreset {
  key: string;
  label: string;
  amounts: Partial<Record<ExpenseCategory, number>>;
}

export interface BudgetWizardConfig {
  pool: number;
  categories: ExpenseCategory[];           // which categories appear in the wizard
  amounts: Partial<Record<ExpenseCategory, number>>;   // user's last-used amounts
  presets: BudgetPreset[];
  defaultPreset: string;                   // preset key applied when no custom amounts exist
}

const SALARY_KEY = 'fp_salary_wizard_config';
const BUDGET_KEY = 'fp_budget_wizard_config';

/** Empty baseline — no personal figures. Users configure their own values in the wizards; the wizard
 *  persists them on Execute. Anyone launching the app for the first time starts from a blank slate. */
const DEFAULT_SALARY: SalaryWizardConfig = {
  salaryAmount: 0,
  cycleDays: 30,
  allocations: [],
};

const DEFAULT_BUDGET: BudgetWizardConfig = {
  pool: 0,
  categories: ['food', 'shopping', 'personal', 'bills', 'travel-transport', 'other', 'fees-charges'],
  amounts: {},
  defaultPreset: '',
  presets: [],
};

@Injectable({ providedIn: 'root' })
export class WizardConfigService {
  // Deliberately no auto-seeding: localStorage keys are written only when the user saves
  // (via Execute). This keeps a fresh browser/user empty and prevents anyone who loads
  // the app from seeing someone else's defaults.

  loadSalary(): SalaryWizardConfig {
    return this.load(SALARY_KEY, DEFAULT_SALARY);
  }

  saveSalary(config: SalaryWizardConfig): void {
    this.save(SALARY_KEY, config);
  }

  loadBudget(): BudgetWizardConfig {
    return this.load(BUDGET_KEY, DEFAULT_BUDGET);
  }

  saveBudget(config: BudgetWizardConfig): void {
    this.save(BUDGET_KEY, config);
  }

  /** Reset a wizard's config back to the baseline defaults */
  resetSalary(): void { this.save(SALARY_KEY, DEFAULT_SALARY); }
  resetBudget(): void { this.save(BUDGET_KEY, DEFAULT_BUDGET); }

  private load<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...fallback, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...fallback };
  }

  private save<T>(key: string, value: T): void {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore quota */ }
  }

  private ensureKey<T>(key: string, fallback: T): void {
    try {
      if (localStorage.getItem(key) == null) {
        localStorage.setItem(key, JSON.stringify(fallback));
      }
    } catch { /* ignore */ }
  }
}
