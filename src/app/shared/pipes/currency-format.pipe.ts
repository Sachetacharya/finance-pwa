import { Pipe, PipeTransform } from '@angular/core';
import { formatCurrency } from '../utils/currency.utils';

@Pipe({ name: 'currencyFormat', standalone: true })
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | null | undefined, currency = 'NPR', locale = 'en-NP'): string {
    return formatCurrency(value, currency, locale);
  }
}
