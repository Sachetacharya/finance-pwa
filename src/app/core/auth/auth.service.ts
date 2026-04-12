import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponse, LoginRequest, User } from '../models/user.model';

const MOCK_USERS = [
  { id: '1', name: 'Admin', email: 'admin@gmail.com', password: 'admin123', role: 'admin' as const },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(localStorage.getItem('auth_token'));
  private readonly _currentUser = signal<User | null>(this.getUserFromStorage());

  readonly token = this._token.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token() && !!this._currentUser());

  private getUserFromStorage(): User | null {
    const userData = localStorage.getItem('auth_user');
    if (!userData) return null;
    try { return JSON.parse(userData); } catch { return null; }
  }

  login(request: LoginRequest): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const found = MOCK_USERS.find(
          u => u.email === request.email && u.password === request.password
        );
        if (found) {
          const { password: _pw, ...user } = found;
          const token = `mock-jwt-${btoa(found.email)}-${Date.now()}`;
          this.setSession(user, token);
          this.router.navigate(['/dashboard']);
          resolve({ user, token });
        } else {
          reject(new Error('Invalid email or password'));
        }
      }, 700);
    });
  }

  updateProfile(name: string, email: string): void {
    const user = this._currentUser();
    if (!user) return;
    const updated = { ...user, name, email };
    localStorage.setItem('auth_user', JSON.stringify(updated));
    this._currentUser.set(updated);
    // Update mock user
    const mock = MOCK_USERS.find(u => u.id === user.id);
    if (mock) { mock.name = name; mock.email = email; }
  }

  changePassword(currentPassword: string, newPassword: string): boolean {
    const user = this._currentUser();
    if (!user) return false;
    const mock = MOCK_USERS.find(u => u.id === user.id);
    if (!mock || mock.password !== currentPassword) return false;
    mock.password = newPassword;
    return true;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this._token.set(null);
    this._currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  private setSession(user: User, token: string): void {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    this._token.set(token);
    this._currentUser.set(user);
  }
}
