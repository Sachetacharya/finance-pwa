import { Injectable, inject, computed } from '@angular/core';
import { ExpenseService } from './expense.service';
import { BudgetService } from './budget.service';
import { LoanService } from './loan.service';
import { AccountService } from './account.service';
import { Expense, ExpenseCategory, CATEGORY_LABELS } from '../models/expense.model';

export interface Insight {
  type: 'warning' | 'success' | 'info' | 'danger';
  icon: string;
  text: string;
}

export interface CategoryChange {
  category: string;
  label: string;
  thisMonth: number;
  lastMonth: number;
  change: number; // percentage
}

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly exp = inject(ExpenseService);
  private readonly budget = inject(BudgetService);
  private readonly loan = inject(LoanService);
  private readonly account = inject(AccountService);

  // ── Helpers ──
  private getMonthExpenses(monthsAgo: number): Expense[] {
    const now = new Date();
    const m = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const month = m.getMonth();
    const year = m.getFullYear();
    return this.exp.expenses().filter(e => {
      if (e.type !== 'expense') return false;
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  }

  private getMonthIncome(monthsAgo: number): number {
    const now = new Date();
    const m = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const month = m.getMonth();
    const year = m.getFullYear();
    return this.exp.expenses()
      .filter(e => e.type === 'income' && new Date(e.date).getMonth() === month && new Date(e.date).getFullYear() === year)
      .reduce((s, e) => s + e.amount, 0);
  }

  private monthTotal(monthsAgo: number): number {
    return this.getMonthExpenses(monthsAgo).reduce((s, e) => s + e.amount, 0);
  }

  private categoryTotal(expenses: Expense[], cat: string): number {
    return expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
  }

  // ── 1. Overview Summary ──
  readonly overview = computed(() => {
    const totalIncome = this.exp.totalIncome();
    const totalExpenses = this.exp.totalAmount();
    const savings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 1000) / 10 : 0;
    const thisMonth = this.monthTotal(0);
    const lastMonth = this.monthTotal(1);
    const monthChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : 0;
    const overspending = thisMonth > this.getMonthIncome(0);

    return { totalIncome, totalExpenses, savings, savingsRate, thisMonth, lastMonth, monthChange, overspending };
  });

  // ── 2. Category Breakdown ──
  readonly categoryBreakdown = computed(() => {
    const thisMonthExp = this.getMonthExpenses(0);
    const lastMonthExp = this.getMonthExpenses(1);
    const twoMonthsAgoExp = this.getMonthExpenses(2);

    const catMap = new Map<string, number>();
    thisMonthExp.forEach(e => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount));

    const total = thisMonthExp.reduce((s, e) => s + e.amount, 0);
    const sorted = Array.from(catMap.entries())
      .map(([cat, amount]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat as ExpenseCategory] ?? cat,
        amount: Math.round(amount * 100) / 100,
        percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const top3 = sorted.slice(0, 3);
    const least = sorted.slice(-3).reverse();

    // Category trend last 3 months
    const allCats = new Set<string>();
    [...thisMonthExp, ...lastMonthExp, ...twoMonthsAgoExp].forEach(e => allCats.add(e.category));

    const trends: CategoryChange[] = Array.from(allCats).map(cat => {
      const thisM = this.categoryTotal(thisMonthExp, cat);
      const lastM = this.categoryTotal(lastMonthExp, cat);
      return {
        category: cat,
        label: CATEGORY_LABELS[cat as ExpenseCategory] ?? cat,
        thisMonth: thisM,
        lastMonth: lastM,
        change: lastM > 0 ? Math.round(((thisM - lastM) / lastM) * 1000) / 10 : (thisM > 0 ? 100 : 0),
      };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    return { sorted, top3, least, trends, total };
  });

  // ── 3. Spending Insights (rule-based) ──
  readonly spendingInsights = computed((): Insight[] => {
    const insights: Insight[] = [];
    const ov = this.overview();
    const cb = this.categoryBreakdown();

    // Month comparison
    if (ov.monthChange > 15) {
      insights.push({ type: 'warning', icon: 'lucideTrendingUp', text: `Spending increased ${ov.monthChange}% compared to last month` });
    } else if (ov.monthChange < -10) {
      insights.push({ type: 'success', icon: 'lucideTrendingDown', text: `Great! Spending decreased ${Math.abs(ov.monthChange)}% from last month` });
    }

    // Category spikes
    cb.trends.forEach(t => {
      if (t.change > 30 && t.thisMonth > 500) {
        insights.push({ type: 'warning', icon: 'lucideAlertTriangle', text: `${t.label} spending up ${t.change}% this month` });
      }
    });

    // Savings
    if (ov.savingsRate >= 20) {
      insights.push({ type: 'success', icon: 'lucideTarget', text: `You're saving ${ov.savingsRate}% of income — excellent!` });
    } else if (ov.savingsRate > 0) {
      insights.push({ type: 'info', icon: 'lucideInfo', text: `Savings rate is ${ov.savingsRate}% — try to reach 20%` });
    } else if (ov.totalIncome > 0) {
      insights.push({ type: 'danger', icon: 'lucideAlertTriangle', text: `You're spending more than you earn!` });
    }

    // Overspending
    if (ov.overspending) {
      insights.push({ type: 'danger', icon: 'lucideAlertTriangle', text: `This month's expenses exceed income` });
    }

    if (!insights.length) {
      insights.push({ type: 'info', icon: 'lucideInfo', text: 'Your finances look stable this month' });
    }

    return insights;
  });

  // ── 4. Expense Patterns ──
  readonly patterns = computed(() => {
    const expenses = this.exp.expenses().filter(e => e.type === 'expense');
    const now = new Date();
    const last30 = expenses.filter(e => {
      const diff = (now.getTime() - new Date(e.date).getTime()) / 86400000;
      return diff <= 30;
    });

    const dailyAvg = last30.length > 0 ? Math.round(last30.reduce((s, e) => s + e.amount, 0) / 30) : 0;

    // Weekend vs weekday
    let weekday = 0, weekend = 0, weekdayCount = 0, weekendCount = 0;
    last30.forEach(e => {
      const day = new Date(e.date).getDay();
      if (day === 0 || day === 6) { weekend += e.amount; weekendCount++; }
      else { weekday += e.amount; weekdayCount++; }
    });

    // Cash vs digital
    let cashTotal = 0, digitalTotal = 0;
    last30.forEach(e => {
      if (e.paymentMethod === 'cash') cashTotal += e.amount;
      else digitalTotal += e.amount;
    });
    const totalPayments = cashTotal + digitalTotal;

    // Frequent merchants (by title)
    const titleMap = new Map<string, { count: number; total: number }>();
    expenses.forEach(e => {
      const key = e.title.toLowerCase();
      const entry = titleMap.get(key) ?? { count: 0, total: 0 };
      entry.count++; entry.total += e.amount;
      titleMap.set(key, entry);
    });
    const frequentItems = Array.from(titleMap.entries())
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([title, data]) => ({ title, ...data }));

    return {
      dailyAvg,
      weekdayAvg: weekdayCount > 0 ? Math.round(weekday / weekdayCount) : 0,
      weekendAvg: weekendCount > 0 ? Math.round(weekend / weekendCount) : 0,
      cashPercent: totalPayments > 0 ? Math.round((cashTotal / totalPayments) * 100) : 0,
      digitalPercent: totalPayments > 0 ? Math.round((digitalTotal / totalPayments) * 100) : 0,
      frequentItems,
    };
  });

  // ── 5. Expense Leak Detection ──
  readonly leaks = computed((): Insight[] => {
    const leaks: Insight[] = [];
    const thisMonth = this.getMonthExpenses(0);
    const lastMonth = this.getMonthExpenses(1);

    // Detect spikes by title
    const thisMap = new Map<string, number>();
    const lastMap = new Map<string, number>();
    thisMonth.forEach(e => thisMap.set(e.title, (thisMap.get(e.title) ?? 0) + e.amount));
    lastMonth.forEach(e => lastMap.set(e.title, (lastMap.get(e.title) ?? 0) + e.amount));

    thisMap.forEach((amount, title) => {
      const prev = lastMap.get(title) ?? 0;
      if (amount > 1000 && prev > 0 && amount > prev * 1.5) {
        leaks.push({
          type: 'warning',
          icon: 'lucideAlertTriangle',
          text: `"${title}" — NPR ${Math.round(amount)} (${Math.round(((amount - prev) / prev) * 100)}% more than last month)`,
        });
      }
    });

    // Duplicate-ish payments (same title, same amount, same day)
    const dayMap = new Map<string, number>();
    thisMonth.forEach(e => {
      const key = `${e.date}-${e.title}-${e.amount}`;
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    });
    dayMap.forEach((count, key) => {
      if (count > 1) {
        const [, title, amount] = key.split('-');
        leaks.push({ type: 'info', icon: 'lucideInfo', text: `Possible duplicate: "${title}" (NPR ${amount}) appears ${count} times on same day` });
      }
    });

    if (!leaks.length) {
      leaks.push({ type: 'success', icon: 'lucideCheck', text: 'No spending leaks detected' });
    }
    return leaks;
  });

  // ── 6. Budget Recommendations ──
  readonly budgetRecs = computed((): Insight[] => {
    const recs: Insight[] = [];
    const budgets = this.budget.budgetStatuses();

    // Over-budget categories
    budgets.filter(b => b.percentage >= 100).forEach(b => {
      recs.push({
        type: 'danger',
        icon: 'lucideAlertTriangle',
        text: `${CATEGORY_LABELS[b.budget.category] ?? b.budget.category} is ${b.percentage}% of budget — reduce by NPR ${Math.abs(b.remaining)}`,
      });
    });

    // Near-budget
    budgets.filter(b => b.percentage >= 80 && b.percentage < 100).forEach(b => {
      recs.push({
        type: 'warning',
        icon: 'lucideInfo',
        text: `${CATEGORY_LABELS[b.budget.category] ?? b.budget.category} is at ${b.percentage}% — NPR ${b.remaining} left`,
      });
    });

    // Suggest savings
    const ov = this.overview();
    if (ov.savingsRate < 20 && ov.totalIncome > 0) {
      const target = Math.round(ov.totalIncome * 0.2);
      const need = target - ov.savings;
      if (need > 0) recs.push({ type: 'info', icon: 'lucideTarget', text: `Save NPR ${Math.round(need)} more to reach 20% savings rate` });
    }

    if (!recs.length) {
      recs.push({ type: 'success', icon: 'lucideCheck', text: 'All budgets are on track' });
    }
    return recs;
  });

  // ── 7. Month-to-Month Comparison ──
  readonly monthComparison = computed(() => {
    const months = [0, 1, 2].map(i => ({
      label: new Date(new Date().getFullYear(), new Date().getMonth() - i, 1).toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      total: this.monthTotal(i),
      income: this.getMonthIncome(i),
    }));

    const catChanges = this.categoryBreakdown().trends
      .filter(t => t.thisMonth > 0 || t.lastMonth > 0);

    const biggest_improvement = catChanges.filter(c => c.change < 0).sort((a, b) => a.change - b.change)[0] ?? null;
    const biggest_decline = catChanges.filter(c => c.change > 0).sort((a, b) => b.change - a.change)[0] ?? null;

    return { months, biggest_improvement, biggest_decline };
  });

  // ── 8. Financial Health Score (0-100), null if no data ──
  readonly hasData = computed(() =>
    this.exp.expenses().some(e => e.type === 'expense' || e.type === 'income')
  );

  readonly healthScore = computed((): number | null => {
    if (!this.hasData()) return null;

    let score = 50; // base
    const ov = this.overview();

    // Savings rate (max +25)
    if (ov.totalIncome > 0) {
      if (ov.savingsRate >= 30) score += 25;
      else if (ov.savingsRate >= 20) score += 20;
      else if (ov.savingsRate >= 10) score += 10;
      else if (ov.savingsRate > 0) score += 5;
      else score -= 15;
    }

    // Budget adherence (max +15)
    const budgets = this.budget.budgetStatuses();
    if (budgets.length > 0) {
      const onTrack = budgets.filter(b => b.percentage < 100).length;
      score += Math.round((onTrack / budgets.length) * 15);
    }

    // Month trend (+10 if decreasing, -10 if spiking)
    if (ov.lastMonth > 0) {
      if (ov.monthChange < -5) score += 10;
      else if (ov.monthChange > 20) score -= 10;
    }

    // Debt penalty
    const debt = this.loan.totalBorrowedOutstanding();
    if (debt > 0 && ov.totalIncome > 0) {
      const debtRatio = debt / (ov.totalIncome * 12);
      if (debtRatio > 0.5) score -= 15;
      else if (debtRatio > 0.2) score -= 5;
    }

    // No spikes bonus
    if (this.leaks().length === 1 && this.leaks()[0].type === 'success') score += 5;

    return Math.max(0, Math.min(100, score));
  });

  readonly healthLabel = computed(() => {
    const s = this.healthScore();
    if (s === null) return { label: 'No Data', color: 'var(--text-muted)' };
    if (s >= 80) return { label: 'Excellent', color: 'var(--success)' };
    if (s >= 60) return { label: 'Good', color: 'var(--primary)' };
    if (s >= 40) return { label: 'Fair', color: 'var(--warning)' };
    return { label: 'Needs Work', color: 'var(--danger)' };
  });

  // ── 11. Loan & Lent Analysis ──
  readonly loanAnalysis = computed(() => {
    const statuses = this.loan.loanStatuses();
    const borrowed = statuses.filter(s => s.loan.type === 'borrowed');
    const lent = statuses.filter(s => s.loan.type === 'lent');

    const totalBorrowed = borrowed.reduce((s, l) => s + l.loan.amount, 0);
    const totalBorrowedPaid = borrowed.reduce((s, l) => s + l.totalPaid, 0);
    const totalBorrowedOutstanding = this.loan.totalBorrowedOutstanding();
    const borrowedProgress = totalBorrowed > 0 ? Math.round((totalBorrowedPaid / totalBorrowed) * 1000) / 10 : 0;

    const totalLent = lent.reduce((s, l) => s + l.loan.amount, 0);
    const totalLentReceived = lent.reduce((s, l) => s + l.totalPaid, 0);
    const totalLentOutstanding = this.loan.totalLentOutstanding();
    const lentProgress = totalLent > 0 ? Math.round((totalLentReceived / totalLent) * 1000) / 10 : 0;

    const activeBorrowed = borrowed.filter(s => s.outstanding > 0);
    const activeLent = lent.filter(s => s.outstanding > 0);
    const resolvedBorrowed = borrowed.filter(s => s.outstanding <= 0).length;
    const resolvedLent = lent.filter(s => s.outstanding <= 0).length;

    // Net position: positive = others owe you more than you owe
    const netPosition = totalLentOutstanding - totalBorrowedOutstanding;

    // Group by person — extract name from title (after "—" or inside "()")
    const groupByPerson = (list: typeof statuses) => {
      const map = new Map<string, { name: string; count: number; totalAmount: number; outstanding: number; loans: string[] }>();
      list.forEach(s => {
        // Try to extract person name from title patterns like "Loan — Ram", "Split - Food (Ram)", "Ram"
        let name = s.loan.title;
        const parenMatch = name.match(/\(([^)]+)\)/);
        const dashMatch = name.match(/[—–-]\s*(.+)/);
        if (parenMatch) name = parenMatch[1].trim();
        else if (dashMatch) name = dashMatch[1].trim();
        name = name.replace(/^(Split|Loan received|Lent)\s*[-—]?\s*/i, '').trim() || s.loan.title;
        const key = name.toLowerCase();

        const entry = map.get(key) ?? { name, count: 0, totalAmount: 0, outstanding: 0, loans: [] };
        entry.count++;
        entry.totalAmount += s.loan.amount;
        entry.outstanding += s.outstanding;
        entry.loans.push(s.loan.title);
        map.set(key, entry);
      });
      // Only show people who still have an outstanding balance (hide fully settled)
      return Array.from(map.values()).filter(g => g.outstanding > 0.01).sort((a, b) => b.outstanding - a.outstanding);
    };

    // Only group active (not fully-paid) loans — completed loans shouldn't clutter insights
    const borrowedByPerson = groupByPerson(borrowed.filter(s => s.outstanding > 0.01));
    const lentByPerson = groupByPerson(lent.filter(s => s.outstanding > 0.01));

    return {
      totalBorrowed, totalBorrowedPaid, totalBorrowedOutstanding, borrowedProgress,
      totalLent, totalLentReceived, totalLentOutstanding, lentProgress,
      activeBorrowed, activeLent,
      borrowedByPerson, lentByPerson,
      resolvedBorrowed, resolvedLent,
      borrowedCount: borrowed.length, lentCount: lent.length,
      netPosition,
    };
  });

  readonly loanInsights = computed((): Insight[] => {
    const la = this.loanAnalysis();
    const insights: Insight[] = [];

    if (la.totalBorrowedOutstanding > 0) {
      insights.push({
        type: la.borrowedProgress > 50 ? 'info' : 'warning',
        icon: 'lucideLandmark',
        text: `You owe NPR ${Math.round(la.totalBorrowedOutstanding)} across ${la.activeBorrowed.length} loan${la.activeBorrowed.length > 1 ? 's' : ''} (${la.borrowedProgress}% repaid)`,
      });
    }

    if (la.totalLentOutstanding > 0) {
      insights.push({
        type: 'info',
        icon: 'lucideHandshake',
        text: `Others owe you NPR ${Math.round(la.totalLentOutstanding)} across ${la.activeLent.length} record${la.activeLent.length > 1 ? 's' : ''} (${la.lentProgress}% collected)`,
      });
    }

    if (la.netPosition > 0) {
      insights.push({ type: 'success', icon: 'lucideTrendingUp', text: `Net position: +NPR ${Math.round(la.netPosition)} in your favor` });
    } else if (la.netPosition < 0) {
      insights.push({ type: 'warning', icon: 'lucideTrendingDown', text: `Net position: -NPR ${Math.round(Math.abs(la.netPosition))} — you owe more than owed to you` });
    }

    if (la.resolvedBorrowed > 0 || la.resolvedLent > 0) {
      insights.push({ type: 'success', icon: 'lucideCheck', text: `${la.resolvedBorrowed + la.resolvedLent} loan${(la.resolvedBorrowed + la.resolvedLent) > 1 ? 's' : ''} fully resolved` });
    }

    // Warn about large outstanding single loans
    la.activeBorrowed.forEach(s => {
      if (s.outstanding > 50000) {
        insights.push({ type: 'warning', icon: 'lucideAlertTriangle', text: `"${s.loan.title}" has NPR ${Math.round(s.outstanding)} outstanding` });
      }
    });

    // Remind about lent money not collected
    la.activeLent.forEach(s => {
      if (s.percentage < 10 && s.loan.amount > 1000) {
        insights.push({ type: 'info', icon: 'lucideInfo', text: `"${s.loan.title}" — barely collected (${s.percentage}%). Follow up?` });
      }
    });

    // Multiple loans from same person
    la.borrowedByPerson.filter(g => g.count >= 2 && g.outstanding > 0).forEach(g => {
      insights.push({ type: 'warning', icon: 'lucideUser', text: `You have ${g.count} loans from "${g.name}" totalling NPR ${Math.round(g.outstanding)} outstanding` });
    });
    la.lentByPerson.filter(g => g.count >= 2 && g.outstanding > 0).forEach(g => {
      insights.push({ type: 'info', icon: 'lucideUser', text: `"${g.name}" owes you across ${g.count} records — NPR ${Math.round(g.outstanding)} total` });
    });

    if (!insights.length) {
      insights.push({ type: 'success', icon: 'lucideCheck', text: 'No active loans or debts' });
    }

    return insights;
  });

  // ── 10. Personalized Tips ──
  readonly tips = computed((): Insight[] => {
    const tips: Insight[] = [];
    const ov = this.overview();
    const patterns = this.patterns();

    if (patterns.weekendAvg > patterns.weekdayAvg * 1.5) {
      tips.push({ type: 'info', icon: 'lucideCalendar', text: `Weekend spending is ${Math.round(patterns.weekendAvg / (patterns.weekdayAvg || 1) * 100 - 100)}% higher than weekdays. Set a weekend budget.` });
    }

    if (patterns.cashPercent < 20 && patterns.digitalPercent > 0) {
      tips.push({ type: 'info', icon: 'lucideSmartphone', text: 'Most spending is digital. Digital payments are easier to track but easier to overspend.' });
    }

    if (ov.savingsRate < 10 && ov.totalIncome > 0) {
      tips.push({ type: 'warning', icon: 'lucideTarget', text: 'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.' });
    }

    if (patterns.frequentItems.length > 0) {
      const top = patterns.frequentItems[0];
      tips.push({ type: 'info', icon: 'lucideRepeat', text: `"${top.title}" is your most frequent expense (${top.count} times). Consider if you can reduce this.` });
    }

    const overBudget = this.budget.budgetStatuses().filter(b => b.percentage > 100);
    if (overBudget.length > 0) {
      tips.push({ type: 'warning', icon: 'lucideAlertTriangle', text: `${overBudget.length} budget${overBudget.length > 1 ? 's' : ''} exceeded. Review and adjust limits or spending.` });
    }

    if (this.loan.totalBorrowedOutstanding() > 0) {
      tips.push({ type: 'info', icon: 'lucideLandmark', text: 'Focus on paying off high-interest loans first to save money long-term.' });
    }

    if (!tips.length) {
      tips.push({ type: 'success', icon: 'lucideCheck', text: 'Your financial habits look healthy. Keep it up!' });
    }

    return tips;
  });

  // ── 12. Prediction & Forecast ──
  readonly forecast = computed(() => {
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const today = new Date().getDate();
    const thisMonthSpent = this.monthTotal(0);
    const thisMonthIncome = this.getMonthIncome(0);
    const dailyRate = today > 0 ? thisMonthSpent / today : 0;
    const predictedTotal = Math.round(dailyRate * daysInMonth);
    const predictedSavings = thisMonthIncome - predictedTotal;
    const daysLeft = daysInMonth - today;
    const remainingBudget = thisMonthIncome - thisMonthSpent;
    const dailyBudgetLeft = daysLeft > 0 ? Math.round(remainingBudget / daysLeft) : 0;

    // Will exceed any budget?
    const budgetAlerts: string[] = [];
    this.budget.budgetStatuses().forEach(b => {
      if (b.percentage < 100) {
        const catDaily = today > 0 ? b.spent / today : 0;
        const catPredicted = catDaily * daysInMonth;
        if (catPredicted > b.budget.monthlyLimit) {
          budgetAlerts.push(CATEGORY_LABELS[b.budget.category] ?? b.budget.category);
        }
      }
    });

    // Next month forecast (average of last 3 months)
    const avg3 = [0, 1, 2].reduce((s, i) => s + this.monthTotal(i), 0) / 3;

    return {
      predictedTotal, predictedSavings, dailyRate: Math.round(dailyRate),
      daysLeft, dailyBudgetLeft, budgetAlerts,
      nextMonthForecast: Math.round(avg3),
    };
  });

  // ── 13. Lifestyle & Habits ──
  readonly lifestyle = computed(() => {
    const expenses = this.exp.expenses().filter(e => e.type === 'expense');
    const thisMonth = this.getMonthExpenses(0);

    // Most expensive day of month
    const dayTotals = new Map<number, number>();
    thisMonth.forEach(e => {
      const day = new Date(e.date).getDate();
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + e.amount);
    });
    let mostExpensiveDay = { day: 0, amount: 0 };
    dayTotals.forEach((amount, day) => {
      if (amount > mostExpensiveDay.amount) mostExpensiveDay = { day, amount };
    });

    // Impulse detection: small frequent buys (< 500, same title, 3+ times this month)
    const titleCount = new Map<string, { count: number; total: number }>();
    thisMonth.forEach(e => {
      if (e.amount < 500) {
        const key = e.title.toLowerCase();
        const entry = titleCount.get(key) ?? { count: 0, total: 0 };
        entry.count++; entry.total += e.amount;
        titleCount.set(key, entry);
      }
    });
    const impulseItems = Array.from(titleCount.entries())
      .filter(([, v]) => v.count >= 3)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3)
      .map(([title, data]) => ({ title, ...data }));

    // Most expense type (category breakdown sorted)
    const catMap = new Map<string, { count: number; total: number }>();
    expenses.forEach(e => {
      const entry = catMap.get(e.category) ?? { count: 0, total: 0 };
      entry.count++; entry.total += e.amount;
      catMap.set(e.category, entry);
    });
    const expenseByType = Array.from(catMap.entries())
      .map(([cat, data]) => ({
        category: cat,
        label: CATEGORY_LABELS[cat as ExpenseCategory] ?? cat,
        ...data,
      }))
      .sort((a, b) => b.total - a.total);

    // Spending per category this month
    const monthCatMap = new Map<string, number>();
    thisMonth.forEach(e => monthCatMap.set(e.category, (monthCatMap.get(e.category) ?? 0) + e.amount));
    const monthByCategory = Array.from(monthCatMap.entries())
      .map(([cat, total]) => ({ category: cat, label: CATEGORY_LABELS[cat as ExpenseCategory] ?? cat, total: Math.round(total) }))
      .sort((a, b) => b.total - a.total);

    return { mostExpensiveDay, impulseItems, expenseByType, monthByCategory };
  });

  // ── 14. Account Health ──
  readonly accountHealth = computed((): Insight[] => {
    const insights: Insight[] = [];
    const balances = this.exp.expenses().filter(e => e.type === 'expense');
    const accountService = this.account;

    // Account with most transactions (most used)
    const usageMap = new Map<string, number>();
    balances.forEach(e => usageMap.set(e.paymentMethod, (usageMap.get(e.paymentMethod) ?? 0) + 1));
    const sorted = Array.from(usageMap.entries()).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [accId, count] = sorted[0];
      insights.push({ type: 'info', icon: 'lucideBarChart3', text: `Most used: ${accountService.getLabel(accId)} (${count} transactions)` });
    }

    // Lowest balance warning
    const allBalances = accountService.accountBalances();
    const accounts = accountService.accounts();
    for (const acc of accounts) {
      const bal = allBalances[acc.id] ?? 0;
      if (bal < 1000 && bal >= 0) {
        insights.push({ type: 'warning', icon: 'lucideAlertTriangle', text: `${acc.name} balance is low (NPR ${Math.round(bal)})` });
      } else if (bal < 0) {
        insights.push({ type: 'danger', icon: 'lucideAlertTriangle', text: `${acc.name} is in negative (NPR ${Math.round(bal)})` });
      }
    }

    // Account drain rate (spending per day this month from each account)
    const thisMonth = this.getMonthExpenses(0);
    const today = new Date().getDate() || 1;
    const drainMap = new Map<string, number>();
    thisMonth.forEach(e => drainMap.set(e.paymentMethod, (drainMap.get(e.paymentMethod) ?? 0) + e.amount));
    const fastestDrain = Array.from(drainMap.entries())
      .map(([id, total]) => ({ id, label: accountService.getLabel(id), rate: Math.round(total / today) }))
      .sort((a, b) => b.rate - a.rate)[0];
    if (fastestDrain && fastestDrain.rate > 0) {
      insights.push({ type: 'info', icon: 'lucideTrendingDown', text: `Fastest spending: ${fastestDrain.label} at NPR ${fastestDrain.rate}/day` });
    }

    // Dormant accounts (no transactions in 30 days)
    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);
    const last30Str = last30.toISOString().split('T')[0];
    const recentAccounts = new Set(this.exp.expenses().filter(e => e.date >= last30Str).map(e => e.paymentMethod));
    for (const acc of accounts) {
      if (!recentAccounts.has(acc.id)) {
        insights.push({ type: 'info', icon: 'lucideInfo', text: `${acc.name} has no activity in 30 days` });
      }
    }

    if (!insights.length) {
      insights.push({ type: 'success', icon: 'lucideCheck', text: 'All accounts are healthy' });
    }
    return insights;
  });

  // ── 15. Loan Intelligence ──
  readonly loanIntelligence = computed((): Insight[] => {
    const insights: Insight[] = [];
    const statuses = this.loan.loanStatuses();
    const borrowed = statuses.filter(s => s.loan.type === 'borrowed' && s.outstanding > 0);
    const lent = statuses.filter(s => s.loan.type === 'lent' && s.outstanding > 0);

    // Debt-to-income ratio
    const totalDebt = this.loan.totalBorrowedOutstanding();
    const monthlyIncome = this.getMonthIncome(0) || this.exp.totalIncome() / Math.max(this.exp.monthlyIncomeTotals().length, 1);
    if (monthlyIncome > 0 && totalDebt > 0) {
      const dti = Math.round((totalDebt / (monthlyIncome * 12)) * 100);
      const level = dti > 50 ? 'danger' : dti > 30 ? 'warning' : 'success';
      insights.push({ type: level as any, icon: 'lucidePieChart', text: `Debt-to-annual-income ratio: ${dti}%${dti > 50 ? ' — high risk' : dti > 30 ? ' — moderate' : ' — healthy'}` });
    }

    // Payoff timeline estimate
    if (borrowed.length > 0) {
      const totalOutstanding = borrowed.reduce((s, l) => s + l.outstanding, 0);
      const totalPaid = borrowed.reduce((s, l) => s + l.totalPaid, 0);
      const monthsActive = borrowed.reduce((s, l) => {
        const created = new Date(l.loan.createdAt);
        const months = (new Date().getTime() - created.getTime()) / (30 * 86400000);
        return s + Math.max(months, 1);
      }, 0) / borrowed.length;
      const avgMonthlyPayment = monthsActive > 0 ? totalPaid / monthsActive : 0;
      if (avgMonthlyPayment > 0) {
        const monthsToPayoff = Math.ceil(totalOutstanding / avgMonthlyPayment);
        insights.push({ type: 'info', icon: 'lucideCalendar', text: `At current rate, debt-free in ~${monthsToPayoff} month${monthsToPayoff > 1 ? 's' : ''}` });
      }
    }

    // Who owes you the longest
    if (lent.length > 0) {
      const oldest = lent.sort((a, b) => a.loan.date.localeCompare(b.loan.date))[0];
      const daysAgo = Math.round((new Date().getTime() - new Date(oldest.loan.date).getTime()) / 86400000);
      if (daysAgo > 30) {
        insights.push({ type: 'warning', icon: 'lucideInfo', text: `"${oldest.loan.title}" has been pending for ${daysAgo} days. Follow up.` });
      }
    }

    // Largest single debt
    if (borrowed.length > 0) {
      const largest = borrowed.sort((a, b) => b.outstanding - a.outstanding)[0];
      insights.push({ type: 'info', icon: 'lucideLandmark', text: `Largest debt: "${largest.loan.title}" — NPR ${Math.round(largest.outstanding)} remaining` });
    }

    if (!insights.length) {
      insights.push({ type: 'success', icon: 'lucideCheck', text: 'No active debts — you\'re debt-free!' });
    }
    return insights;
  });
}
