import { Injectable, OnDestroy, signal } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Injectable({ providedIn: 'root' })
export class PwaService implements OnDestroy {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly isOnline = signal<boolean>(navigator.onLine);
  readonly canInstall = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(
    window.matchMedia('(display-mode: standalone)').matches
  );

  private readonly onOnline = () => this.isOnline.set(true);
  private readonly onOffline = () => this.isOnline.set(false);
  
  private readonly onBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    this.canInstall.set(true);
  };
  private readonly onAppInstalled = () => {
    this.canInstall.set(false);
    this.isInstalled.set(true);
    this.deferredPrompt = null;
  };

  constructor() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.onAppInstalled);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.onAppInstalled);
  }

  async installApp(): Promise<void> {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    if (outcome === 'accepted') this.canInstall.set(false);
    this.deferredPrompt = null;
  }
}
