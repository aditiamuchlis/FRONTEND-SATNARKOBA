import { Injectable, NgZone, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Mengawasi ketidakaktifan pengguna (idle timeout 10 menit) serta durasi aplikasi di background.
 * Melakukan auto-logout demi keamanan data sensitif di lapangan.
 */
@Injectable({ providedIn: 'root' })
export class IdleService {
  private readonly auth = inject(AuthService);
  private readonly ngZone = inject(NgZone);

  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private backgroundedAt: number | null = null;
  private initialized = false;

  private readonly idleLimitMs = (environment.idleTimeoutMinutes || 10) * 60 * 1000;
  private readonly backgroundLimitMs = (environment.backgroundLockMinutes || 5) * 60 * 1000;

  startMonitoring(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }
    this.initialized = true;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    this.ngZone.runOutsideAngular(() => {
      for (const evt of activityEvents) {
        window.addEventListener(evt, () => this.resetIdleTimer(), { passive: true });
      }
    });

    this.resetIdleTimer();
    this.setupAppBackgroundListener();
  }

  resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (!this.auth.isAuthenticated()) {
      return;
    }
    this.idleTimer = setTimeout(() => {
      this.ngZone.run(() => {
        if (this.auth.isAuthenticated()) {
          void this.auth.logout(
            'Sesi berakhir otomatis karena tidak ada aktivitas selama 10 menit.'
          );
        }
      });
    }, this.idleLimitMs);
  }

  checkBackgroundElapsed(nowMs: number = Date.now()): boolean {
    if (this.backgroundedAt && this.auth.isAuthenticated()) {
      const elapsed = nowMs - this.backgroundedAt;
      this.backgroundedAt = null;
      if (elapsed >= this.backgroundLimitMs) {
        void this.auth.logout(
          'Sesi dikunci otomatis karena aplikasi berada di latar belakang melebihi batas aman.'
        );
        return true;
      }
    }
    return false;
  }

  recordBackgrounded(timestampMs: number = Date.now()): void {
    this.backgroundedAt = timestampMs;
  }

  private setupAppBackgroundListener(): void {
    try {
      App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
          this.recordBackgrounded(Date.now());
        } else {
          this.ngZone.run(() => {
            const loggedOut = this.checkBackgroundElapsed(Date.now());
            if (!loggedOut) {
              this.resetIdleTimer();
            }
          });
        }
      });
    } catch {
      // Fallback ke visibilitychange pada browser
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            this.recordBackgrounded(Date.now());
          } else {
            this.checkBackgroundElapsed(Date.now());
          }
        });
      }
    }
  }
}
