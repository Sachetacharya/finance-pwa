import { Injectable } from '@angular/core';

const BACKUP_KEYS = ['fp_expenses', 'fp_accounts', 'fp_budgets', 'fp_recurring', 'fp_loans', 'auth_user', 'auth_token', 'fp_theme'];

@Injectable({ providedIn: 'root' })
export class BackupService {

  exportBackup(): void {
    const data: Record<string, any> = {};
    for (const key of BACKUP_KEYS) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        try { data[key] = JSON.parse(val); } catch { data[key] = val; }
      }
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-pwa-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importBackup(file: File): Promise<{ success: boolean; message: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (typeof data !== 'object' || data === null) {
        return { success: false, message: 'Invalid backup file format' };
      }

      // Validate it contains at least expenses
      if (!data['fp_expenses'] && !data['fp_accounts']) {
        return { success: false, message: 'Backup file does not contain any finance data' };
      }

      for (const key of BACKUP_KEYS) {
        if (key in data) {
          const val = typeof data[key] === 'string' ? data[key] : JSON.stringify(data[key]);
          localStorage.setItem(key, val);
        }
      }

      return { success: true, message: 'Backup restored. Reloading app...' };
    } catch {
      return { success: false, message: 'Failed to read backup file' };
    }
  }
}
