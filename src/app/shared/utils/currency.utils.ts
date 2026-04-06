export function formatCurrency(value: number | null | undefined, currency = 'NPR', locale = 'en-IN'): string {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
