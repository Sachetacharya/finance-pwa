import { Component, inject, computed } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { ExpenseService } from '../../core/services/expense.service';
import { AccountService } from '../../core/services/account.service';
import {
  Expense, ALL_CATEGORY_LABELS, ALL_CATEGORY_ICONS,
} from '../../core/models/expense.model';

interface DaySummary {
  date: string;      // ISO
  label: string;     // "Mon", "Tue"
  total: number;
  count: number;
  isToday: boolean;
}

@Component({
  selector: 'app-weekly',
  standalone: true,
  imports: [NgIcon, CurrencyFormatPipe, PrivacyMaskPipe],
  templateUrl: './weekly.component.html',
  styleUrl: './weekly.component.scss',
})
export class WeeklyComponent {
  private readonly exp = inject(ExpenseService);
  readonly accountService = inject(AccountService);
  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;

  private rangeStart(daysAgo: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    return d;
  }

  /** Format a local Date as YYYY-MM-DD without the UTC shift that toISOString() causes */
  private toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private filterRange(startInclusive: Date, endInclusive: Date): Expense[] {
    const startISO = this.toLocalDateStr(startInclusive);
    const endISO = this.toLocalDateStr(endInclusive);
    return this.exp.expenses().filter(e => e.date >= startISO && e.date <= endISO);
  }

  /** Last 7 days including today */
  private readonly thisWeek = computed(() => this.filterRange(this.rangeStart(6), this.rangeStart(0)));
  /** 7 days before that */
  private readonly prevWeek = computed(() => this.filterRange(this.rangeStart(13), this.rangeStart(7)));

  readonly thisWeekExpense = computed(() =>
    this.thisWeek().filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  );
  readonly thisWeekIncome = computed(() =>
    this.thisWeek().filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  );
  readonly prevWeekExpense = computed(() =>
    this.prevWeek().filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  );

  readonly weekChangePct = computed(() => {
    const prev = this.prevWeekExpense();
    const curr = this.thisWeekExpense();
    if (prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  });

  readonly avgPerDay = computed(() => Math.round((this.thisWeekExpense() / 7) * 100) / 100);

  readonly txCount = computed(() => this.thisWeek().filter(e => e.type === 'expense').length);

  /** Biggest single expense this week */
  readonly biggest = computed(() => {
    const list = this.thisWeek().filter(e => e.type === 'expense');
    if (!list.length) return null;
    return list.reduce((max, e) => e.amount > max.amount ? e : max);
  });

  /** Per-day summary for the last 7 days (oldest → today) */
  readonly dailySummary = computed((): DaySummary[] => {
    const days: DaySummary[] = [];
    const todayISO = this.toLocalDateStr(this.rangeStart(0));
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = this.rangeStart(i);
      const iso = this.toLocalDateStr(d);
      const dayExp = this.thisWeek().filter(e => e.type === 'expense' && e.date === iso);
      days.push({
        date: iso,
        label: weekdays[d.getDay()],
        total: Math.round(dayExp.reduce((s, e) => s + e.amount, 0) * 100) / 100,
        count: dayExp.length,
        isToday: iso === todayISO,
      });
    }
    return days;
  });

  readonly maxDayTotal = computed(() => {
    const max = this.dailySummary().reduce((m, d) => Math.max(m, d.total), 0);
    return max || 1;
  });

  /** Top categories this week */
  readonly topCategories = computed(() => {
    const map = new Map<string, { total: number; count: number }>();
    this.thisWeek().filter(e => e.type === 'expense').forEach(e => {
      const entry = map.get(e.category) || { total: 0, count: 0 };
      entry.total += e.amount;
      entry.count += 1;
      map.set(e.category, entry);
    });
    return Array.from(map.entries())
      .map(([cat, d]) => ({
        category: cat,
        label: (this.allCategoryLabels as any)[cat] ?? cat,
        icon: (this.allCategoryIcons as any)[cat] ?? 'lucidePackage',
        total: Math.round(d.total * 100) / 100,
        count: d.count,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  });

  readonly hasData = computed(() => this.thisWeek().length > 0);
}
