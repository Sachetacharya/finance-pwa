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

/** Baseline values — used only when the user's localStorage is empty. Edit once via the wizard to override. */
const DEFAULT_SALARY: SalaryWizardConfig = {
  salaryAmount: 95200,
  cycleDays: 30,
  allocations: [
    { id: 'ghar',      label: 'Ghar (send to parents)',  kind: 'expense',  category: 'housing',  amount: 20000, compulsory: true },
    { id: 'rent-pay',  label: 'Rent (landlord)',         kind: 'expense',  category: 'housing',  amount: 10000, compulsory: true },
    { id: 'gym',       label: 'Gym',                     kind: 'expense',  category: 'personal', amount: 3000,  compulsory: true },
    { id: 'emergency', label: 'Emergency fund (locked)', kind: 'transfer', accountHint: 'global', amount: 10000, reservedNote: 'Emergency fund' },
    { id: 'savings',   label: 'Savings goal',            kind: 'transfer', accountHint: 'global', amount: 17000, reservedNote: 'Savings' },
    { id: 'investment',label: 'Investment',              kind: 'transfer', accountHint: 'global', amount: 5000 },
    { id: 'budget',    label: 'Remaining for the month', kind: 'transfer', accountHint: '',       amount: 30200 },
  ],
};

const DEFAULT_BUDGET: BudgetWizardConfig = {
  pool: 30200,
  categories: ['food', 'shopping', 'personal', 'bills', 'travel-transport', 'other', 'fees-charges'],
  amounts: {
    food: 10000, shopping: 5000, personal: 2500, bills: 1500,
    'travel-transport': 1500, other: 2000, 'fees-charges': 200,
  },
  defaultPreset: 'balanced',
  presets: [
    {
      key: 'tight', label: 'Tight (save more)',
      amounts: { food: 8000, shopping: 3000, personal: 2000, bills: 1500, 'travel-transport': 1000, other: 1500, 'fees-charges': 200 },
    },
    {
      key: 'balanced', label: 'Balanced',
      amounts: { food: 10000, shopping: 5000, personal: 2500, bills: 1500, 'travel-transport': 1500, other: 2000, 'fees-charges': 200 },
    },
    {
      key: 'generous', label: 'Generous',
      amounts: { food: 12000, shopping: 7000, personal: 3000, bills: 2000, 'travel-transport': 2500, other: 3000, 'fees-charges': 500 },
    },
  ],
};

@Injectable({ providedIn: 'root' })
export class WizardConfigService {
  constructor() {
    // On app startup, seed the keys if absent so users can inspect/edit them in DevTools/localStorage
    this.ensureKey(SALARY_KEY, DEFAULT_SALARY);
    this.ensureKey(BUDGET_KEY, DEFAULT_BUDGET);
  }

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
