import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { AuditLoggerService } from './audit-logger.service';
import { NON_DETAIL_ROLES } from '../../shared/constants/menu.constants';
import { Role } from '../../shared/models/models';

/**
 * Mengelola Push Notification (FCM) pada Android.
 * Isi push tidak pernah memuat data sensitif (hanya nomor laporan, wilayah, waktu).
 * Ketukan notifikasi diarahkan sesuai peran:
 * - KAPOLSEK, KAPOLRES, KASAT_BINMAS -> selalu diarahkan ke '/notifikasi', TIDAK pernah ke detail.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly logger = inject(AuditLoggerService);

  async initPush(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }
    try {
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }
      if (permStatus.receive !== 'granted') {
        return;
      }

      await PushNotifications.register();

      await PushNotifications.addListener('registration', (token) => {
        this.api.post('/auth/device-token', { deviceToken: token.value }).subscribe({
          error: () => {}
        });
      });

      await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const data = notification.notification.data as { laporanId?: string } | undefined;
        this.handleNotificationTap(data?.laporanId);
      });
    } catch (err) {
      this.logger.warn('PUSH_INIT_SKIPPED', {
        reason: err instanceof Error ? err.message : 'Not supported'
      });
    }
  }

  handleNotificationTap(laporanId?: string | null): void {
    const role = this.auth.userRole();
    if (!role) {
      void this.router.navigate(['/auth/login']);
      return;
    }

    // Aturan keras: Kapolsek, Kapolres, Kasat Binmas hanya ke daftar notifikasi
    if (NON_DETAIL_ROLES.includes(role)) {
      void this.router.navigate(['/notifikasi']);
      return;
    }

    if (role === Role.KBO && !this.auth.hasActiveDelegation()) {
      void this.router.navigate(['/notifikasi']);
      return;
    }

    if (laporanId) {
      void this.router.navigate(['/laporan', laporanId]);
    } else {
      void this.router.navigate(['/notifikasi']);
    }
  }
}
