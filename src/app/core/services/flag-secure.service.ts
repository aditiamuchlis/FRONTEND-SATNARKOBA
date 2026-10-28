import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AuditLoggerService } from './audit-logger.service';

declare global {
  interface Window {
    CapacitorPrivacyScreen?: {
      enable: () => Promise<void>;
      disable: () => Promise<void>;
    };
  }
}

/**
 * Mengaktifkan FLAG_SECURE pada Android saat membuka halaman sensitif (Detail Laporan)
 * untuk memblokir screenshot, screen recording, dan recent-apps preview.
 */
@Injectable({ providedIn: 'root' })
export class FlagSecureService {
  readonly isProtected = signal<boolean>(false);

  constructor(private readonly logger: AuditLoggerService) {}

  async enableSecureScreen(context: string): Promise<void> {
    this.isProtected.set(true);
    document.body.classList.add('flag-secure-active');
    if (Capacitor.isNativePlatform() && window.CapacitorPrivacyScreen) {
      try {
        await window.CapacitorPrivacyScreen.enable();
      } catch {
        // Native activity FLAG_SECURE fallback
      }
    }
    this.logger.info('FLAG_SECURE enabled', { context });
  }

  async disableSecureScreen(context: string): Promise<void> {
    this.isProtected.set(false);
    document.body.classList.remove('flag-secure-active');
    if (Capacitor.isNativePlatform() && window.CapacitorPrivacyScreen) {
      try {
        await window.CapacitorPrivacyScreen.disable();
      } catch {
        // Ignore
      }
    }
    this.logger.info('FLAG_SECURE disabled', { context });
  }
}
