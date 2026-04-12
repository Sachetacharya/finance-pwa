import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly isFirstTime = signal(!localStorage.getItem('fp_logged_once'));
  rememberMe = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    // Load remembered credentials
    const saved = localStorage.getItem('fp_remember');
    if (saved) {
      try {
        const { email, password } = JSON.parse(saved);
        this.form.patchValue({ email, password });
        this.rememberMe = true;
      } catch { /* ignore */ }
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      const email = this.form.value.email!;
      const password = this.form.value.password!;

      // Save or clear remembered credentials
      if (this.rememberMe) {
        localStorage.setItem('fp_remember', JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem('fp_remember');
      }

      await this.auth.login({ email, password });
      localStorage.setItem('fp_logged_once', 'true');
      this.notification.success('Welcome back!');
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
