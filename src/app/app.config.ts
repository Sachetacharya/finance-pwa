import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { GlobalErrorHandler } from './core/services/error-handler.service';
import { CurrencyFormatPipe } from './shared/pipes/currency-format.pipe';

export const appConfig: ApplicationConfig = {
  providers: [
    CurrencyFormatPipe,
    provideBrowserGlobalErrorListeners(),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
