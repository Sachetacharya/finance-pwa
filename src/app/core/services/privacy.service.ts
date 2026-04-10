import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly _hidden = signal(localStorage.getItem('fp_privacy') === 'true');

  readonly isHidden = this._hidden.asReadonly();

  toggle(): void {
    const next = !this._hidden();
    this._hidden.set(next);
    localStorage.setItem('fp_privacy', String(next));
  }

  mask(value: string): string {
    return this._hidden() ? '••••' : value;
  }
}
