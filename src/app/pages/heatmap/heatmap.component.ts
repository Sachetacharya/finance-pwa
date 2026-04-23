import { Component, inject, computed, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { PrivacyMaskPipe } from '../../shared/pipes/privacy-mask.pipe';
import { ExpenseService } from '../../core/services/expense.service';
import { AccountService } from '../../core/services/account.service';
import { Expense, ALL_CATEGORY_LABELS, ALL_CATEGORY_ICONS } from '../../core/models/expense.model';

interface DayCell {
  date: string;         // ISO YYYY-MM-DD
  amount: number;       // total expense amount for the day
  count: number;        // number of expense records
  level: 0 | 1 | 2 | 3 | 4;  // heatmap intensity bucket
  dayOfWeek: number;    // 0 = Sun .. 6 = Sat
  isFuture: boolean;
  monthLabel: string;   // 'Jan', 'Feb' ... (only populated on first-of-month cells for the axis)
}

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [NgIcon, CurrencyFormatPipe, PrivacyMaskPipe],
  templateUrl: './heatmap.component.html',
  styleUrl: './heatmap.component.scss',
})
export class HeatmapComponent {
  private readonly exp = inject(ExpenseService);
  readonly accountService = inject(AccountService);
  readonly allCategoryLabels = ALL_CATEGORY_LABELS;
  readonly allCategoryIcons = ALL_CATEGORY_ICONS;

  /** Number of weeks to show (53 covers just over a year) */
  readonly weeksToShow = signal(53);

  /** Currently selected day for the drawer (null = no selection) */
  readonly selectedDate = signal<string | null>(null);

  /** Filter out lumpy categories to see real day-to-day habits */
  readonly discretionaryOnly = signal<boolean>(this.loadPref());

  private readonly LUMPY = new Set(['loans-debt', 'housing', 'fees-charges', 'investment']);
  private readonly WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  private readonly MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  private loadPref(): boolean {
    try { return localStorage.getItem('fp_heatmap_discretionary') === 'true'; } catch { return false; }
  }

  toggleDiscretionary(): void {
    const next = !this.discretionaryOnly();
    this.discretionaryOnly.set(next);
    try { localStorage.setItem('fp_heatmap_discretionary', String(next)); } catch {}
  }

  /** Local YYYY-MM-DD (timezone-safe) */
  private toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  /** All expenses bucketed by date, respecting the discretionary toggle */
  private readonly expensesByDate = computed(() => {
    const map = new Map<string, { amount: number; count: number; items: Expense[] }>();
    for (const e of this.exp.expenses()) {
      if (e.type !== 'expense') continue;
      if (this.discretionaryOnly() && (this.LUMPY.has(e.category as string) || e.amount >= 5000)) continue;
      const entry = map.get(e.date) ?? { amount: 0, count: 0, items: [] };
      entry.amount += e.amount;
      entry.count += 1;
      entry.items.push(e);
      map.set(e.date, entry);
    }
    return map;
  });

  /** Date range ends on the coming Saturday so every column has 7 rows. */
  private readonly endDate = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const saturdayOffset = 6 - today.getDay(); // 0=Sun ... 6=Sat
    today.setDate(today.getDate() + saturdayOffset);
    return today;
  });

  /** Start date = endDate - (weeksToShow * 7 - 1) days, then rewound to that week's Sunday. */
  private readonly startDate = computed(() => {
    const d = new Date(this.endDate());
    d.setDate(d.getDate() - (this.weeksToShow() * 7 - 1));
    return d;
  });

  /** Max amount in the window — used to bucket intensity levels */
  private readonly maxAmount = computed(() => {
    let max = 0;
    for (const [, v] of this.expensesByDate()) {
      if (v.amount > max) max = v.amount;
    }
    return max;
  });

  /** 2D grid: outer array = weeks (columns), inner = 7 days (rows, Sun-Sat) */
  readonly grid = computed((): DayCell[][] => {
    const start = this.startDate();
    const end = this.endDate();
    const byDate = this.expensesByDate();
    const max = this.maxAmount();
    const todayISO = this.toLocalDateStr(new Date());

    const weeks: DayCell[][] = [];
    const cursor = new Date(start);

    while (cursor <= end) {
      const week: DayCell[] = [];
      for (let i = 0; i < 7; i++) {
        const iso = this.toLocalDateStr(cursor);
        const dayData = byDate.get(iso);
        const amount = dayData?.amount ?? 0;
        const count = dayData?.count ?? 0;

        // 5-level intensity (0 = none, 4 = max)
        let level: 0 | 1 | 2 | 3 | 4 = 0;
        if (amount > 0 && max > 0) {
          const ratio = amount / max;
          if (ratio >= 0.75) level = 4;
          else if (ratio >= 0.5) level = 3;
          else if (ratio >= 0.25) level = 2;
          else level = 1;
        }

        // Month label on the first-of-month cells (for the axis)
        const monthLabel = cursor.getDate() === 1 ? this.MONTHS[cursor.getMonth()] : '';

        week.push({
          date: iso,
          amount: Math.round(amount * 100) / 100,
          count,
          level,
          dayOfWeek: cursor.getDay(),
          isFuture: iso > todayISO,
          monthLabel,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  });

  /** For the month axis above the grid */
  readonly monthAxis = computed(() => {
    return this.grid().map(week => {
      const label = week.find(d => d.monthLabel)?.monthLabel ?? '';
      return label;
    });
  });

  readonly weekdayLabels = this.WEEKDAYS;

  /** Summary metrics for the current window */
  readonly summary = computed(() => {
    let total = 0, activeDays = 0, maxDay = { amount: 0, date: '' }, count = 0;
    for (const [date, v] of this.expensesByDate()) {
      total += v.amount;
      count += v.count;
      if (v.amount > 0) activeDays++;
      if (v.amount > maxDay.amount) maxDay = { amount: v.amount, date };
    }
    const weeks = this.weeksToShow();
    return {
      total: Math.round(total * 100) / 100,
      count,
      activeDays,
      avgPerDay: Math.round((total / (weeks * 7)) * 100) / 100,
      maxDay,
    };
  });

  /** Selected day details for the side drawer */
  readonly selectedDay = computed(() => {
    const iso = this.selectedDate();
    if (!iso) return null;
    const data = this.expensesByDate().get(iso);
    return {
      date: iso,
      amount: data?.amount ?? 0,
      count: data?.count ?? 0,
      items: (data?.items ?? []).slice().sort((a, b) => b.amount - a.amount),
    };
  });

  onSelectCell(cell: DayCell): void {
    if (cell.isFuture) return;
    this.selectedDate.set(cell.date === this.selectedDate() ? null : cell.date);
  }

  closeDrawer(): void {
    this.selectedDate.set(null);
  }

  readonly todayISO = computed(() => this.toLocalDateStr(new Date()));

  getCategoryIcon(cat: string): string {
    return (this.allCategoryIcons as any)[cat] ?? 'lucidePackage';
  }
  getCategoryLabel(cat: string): string {
    return (this.allCategoryLabels as any)[cat] ?? cat;
  }
}
