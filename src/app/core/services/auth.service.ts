import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { SecureStorageService } from './secure-storage.service';
import { AuditLoggerService } from './audit-logger.service';
import {
  ApiResponse,
  ChangePasswordDto,
  LoginRequestDto,
  LoginResponseDto,
  Role,
  UserProfileDto
} from '../../shared/models/models';
import { MENU_BY_ROLE, MenuItemConfig, NON_DETAIL_ROLES } from '../../shared/constants/menu.constants';

const KEY_ACCESS_TOKEN = 'access_token';
const KEY_REFRESH_TOKEN = 'refresh_token';
const KEY_USER_PROFILE = 'user_profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly storage = inject(SecureStorageService);
  private readonly router = inject(Router);
  private readonly logger = inject(AuditLoggerService);

  readonly currentUser = signal<UserProfileDto | null>(null);
  readonly isInitialized = signal<boolean>(false);
  readonly logoutReasonMessage = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly userRole = computed<Role | null>(() => this.currentUser()?.role ?? null);
  readonly mustChangePassword = computed(() => Boolean(this.currentUser()?.mustChangePassword));
  readonly hasActiveDelegation = computed(() => Boolean(this.currentUser()?.hasActiveDelegation));

  readonly visibleMenus = computed<MenuItemConfig[]>(() => {
    const user = this.currentUser();
    if (!user) {
      return [];
    }
    const items = MENU_BY_ROLE[user.role] ?? [];
    return items.filter((item) => {
      if (item.requiresActiveDelegation) {
        return Boolean(user.hasActiveDelegation);
      }
      return true;
    });
  });

  readonly canOpenReportDetailRole = computed<boolean>(() => {
    const role = this.userRole();
    if (!role) return false;
    if (NON_DETAIL_ROLES.includes(role)) {
      return false;
    }
    if (role === Role.KBO) {
      return this.hasActiveDelegation();
    }
    return true;
  });

  async restoreSession(): Promise<void> {
    try {
      const [token, profileRaw] = await Promise.all([
        this.storage.get(KEY_ACCESS_TOKEN),
        this.storage.get(KEY_USER_PROFILE)
      ]);
      if (token && profileRaw) {
        const user = JSON.parse(profileRaw) as UserProfileDto;
        this.currentUser.set(user);
      }
    } catch {
      await this.storage.clearAll();
    } finally {
      this.isInitialized.set(true);
    }
  }

  login(payload: LoginRequestDto): Observable<ApiResponse<LoginResponseDto>> {
    this.logoutReasonMessage.set(null);
    return this.api.post<LoginResponseDto>('/auth/login', payload).pipe(
      tap(async (res) => {
        if (res.success && res.data) {
          await this.saveTokensAndProfile(
            res.data.accessToken,
            res.data.refreshToken,
            res.data.user
          );
          this.logger.info('LOGIN_SUCCESS', {
            nrp: res.data.user.nrp,
            role: res.data.user.role
          });
        }
      })
    );
  }

  refreshToken(): Observable<ApiResponse<{ accessToken: string; refreshToken: string; user?: UserProfileDto }>> {
    return new Observable((subscriber) => {
      this.storage.get(KEY_REFRESH_TOKEN).then((rt) => {
        if (!rt) {
          subscriber.error(new Error('Refresh token tidak tersedia'));
          return;
        }
        this.api
          .post<{ accessToken: string; refreshToken: string; user?: UserProfileDto }>('/auth/refresh', {
            refreshToken: rt
          })
          .subscribe({
            next: async (res) => {
              if (res.success && res.data) {
                const updatedUser = res.data.user ?? this.currentUser();
                if (updatedUser) {
                  await this.saveTokensAndProfile(
                    res.data.accessToken,
                    res.data.refreshToken,
                    updatedUser
                  );
                }
              }
              subscriber.next(res);
              subscriber.complete();
            },
            error: (err) => subscriber.error(err)
          });
      });
    });
  }

  changePassword(dto: ChangePasswordDto): Observable<ApiResponse<UserProfileDto>> {
    return this.api.post<UserProfileDto>('/auth/change-password', dto).pipe(
      tap(async (res) => {
        if (res.success && res.data) {
          this.currentUser.set(res.data);
          await this.storage.set(KEY_USER_PROFILE, JSON.stringify(res.data));
        }
      })
    );
  }

  refreshMe(): Observable<ApiResponse<UserProfileDto>> {
    return this.api.get<UserProfileDto>('/auth/me').pipe(
      tap(async (res) => {
        if (res.success && res.data) {
          this.currentUser.set(res.data);
          await this.storage.set(KEY_USER_PROFILE, JSON.stringify(res.data));
        }
      })
    );
  }

  async getAccessToken(): Promise<string | null> {
    return this.storage.get(KEY_ACCESS_TOKEN);
  }

  async updateDelegationFlag(hasActiveDelegation: boolean): Promise<void> {
    const u = this.currentUser();
    if (!u) return;
    const updated: UserProfileDto = { ...u, hasActiveDelegation };
    this.currentUser.set(updated);
    await this.storage.set(KEY_USER_PROFILE, JSON.stringify(updated));
  }

  async logout(reason?: string): Promise<void> {
    try {
      const token = await this.storage.get(KEY_ACCESS_TOKEN);
      if (token) {
        this.api.post('/auth/logout', {}).subscribe({ error: () => {} });
      }
    } catch {
      // Ignore logout network error
    }
    await this.storage.clearAll();
    this.currentUser.set(null);
    if (reason) {
      this.logoutReasonMessage.set(reason);
    }
    this.logger.info('LOGOUT', { reason: reason ?? 'USER_ACTION' });
    await this.router.navigate(['/auth/login']);
  }

  getDefaultHomeRoute(user: UserProfileDto | null = this.currentUser()): string {
    if (!user) return '/auth/login';
    if (user.mustChangePassword) return '/auth/ganti-password';
    if (user.role === Role.ADMIN) return '/admin/pengguna';
    return '/beranda';
  }

  private async saveTokensAndProfile(
    accessToken: string,
    refreshToken: string,
    user: UserProfileDto
  ): Promise<void> {
    await Promise.all([
      this.storage.set(KEY_ACCESS_TOKEN, accessToken),
      this.storage.set(KEY_REFRESH_TOKEN, refreshToken),
      this.storage.set(KEY_USER_PROFILE, JSON.stringify(user))
    ]);
    this.currentUser.set(user);
  }
}
