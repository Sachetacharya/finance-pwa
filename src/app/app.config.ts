import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideIcons } from '@ng-icons/core';
import {
  lucideHome, lucideWallet, lucideBarChart3, lucideRepeat, lucideTarget,
  lucideHandshake, lucideLandmark, lucideSettings, lucideSearch, lucideLogOut,
  lucideMoon, lucideSun, lucidePlus, lucideArrowLeftRight, lucideDownload,
  lucideUpload, lucideTrash2, lucidePencil, lucideX, lucideChevronLeft,
  lucideChevronRight, lucideChevronsLeft, lucideChevronsRight, lucideFilter,
  lucideCircleDollarSign, lucideTrendingUp, lucideTrendingDown, lucideRefreshCw,
  lucideSmartphone, lucideWifi, lucideWifiOff, lucideMenu, lucideBanknote,
  lucideReceipt, lucideCalendar, lucideCreditCard, lucideArrowRightLeft,
  lucideEye, lucideEyeOff, lucideCheck, lucideAlertTriangle, lucideInfo,
  lucideChevronDown, lucideChevronUp, lucidePieChart, lucideLayoutDashboard,
  // Category icons
  lucideUtensilsCrossed, lucideCar, lucideFilm, lucideShoppingBag, lucideHeart,
  lucideZap, lucideBookOpen, lucidePlane, lucideUser, lucidePackage,
  // Income source icons
  lucideBriefcase, lucideLaptop, lucideGift,
  // Extra icons for remaining pages
  lucideKeyRound, lucidePalette, lucideRocket, lucideClipboardList,
  lucidePiggyBank, lucideLock,
} from '@ng-icons/lucide';
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
    provideIcons({
      lucideHome, lucideWallet, lucideBarChart3, lucideRepeat, lucideTarget,
      lucideHandshake, lucideLandmark, lucideSettings, lucideSearch, lucideLogOut,
      lucideMoon, lucideSun, lucidePlus, lucideArrowLeftRight, lucideDownload,
      lucideUpload, lucideTrash2, lucidePencil, lucideX, lucideChevronLeft,
      lucideChevronRight, lucideChevronsLeft, lucideChevronsRight, lucideFilter,
      lucideCircleDollarSign, lucideTrendingUp, lucideTrendingDown, lucideRefreshCw,
      lucideSmartphone, lucideWifi, lucideWifiOff, lucideMenu, lucideBanknote,
      lucideUtensilsCrossed, lucideCar, lucideFilm, lucideShoppingBag, lucideHeart,
      lucideZap, lucideBookOpen, lucidePlane, lucideUser, lucidePackage,
      lucideBriefcase, lucideLaptop, lucideGift,
      lucideKeyRound, lucidePalette, lucideRocket, lucideClipboardList, lucidePiggyBank, lucideLock,
      lucideReceipt, lucideCalendar, lucideCreditCard, lucideArrowRightLeft,
      lucideEye, lucideEyeOff, lucideCheck, lucideAlertTriangle, lucideInfo,
      lucideChevronDown, lucideChevronUp, lucidePieChart, lucideLayoutDashboard,
    }),
  ],
};
