import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _isDarkMode = signal<boolean>(
    localStorage.getItem('fp_theme') === 'dark' ||
    (!localStorage.getItem('fp_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  readonly isDarkMode = this._isDarkMode.asReadonly();

  constructor() {
    this.apply(this._isDarkMode());
  }

  toggle(): void {
    const next = !this._isDarkMode();
    this._isDarkMode.set(next);
    localStorage.setItem('fp_theme', next ? 'dark' : 'light');
    this.apply(next);
  }

  private apply(dark: boolean): void {
    document.documentElement.classList.toggle('dark-theme', dark);
  }
}
