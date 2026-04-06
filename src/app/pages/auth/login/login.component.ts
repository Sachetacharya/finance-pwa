import { Component, inject, signal } from '@angular/core';
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
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly isLoading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.fb.group({
    email: ['sachet.acharya@gmail.com', [Validators.required, Validators.email]],
    password: ['admin123', Validators.required],
  });

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.errorMessage.set('');
    try {
      await this.auth.login({
        email: this.form.value.email!,
        password: this.form.value.password!,
      });
      this.notification.success('Welcome back! 👋');
    } catch (err: any) {
      this.errorMessage.set(err.message ?? 'Login failed. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
