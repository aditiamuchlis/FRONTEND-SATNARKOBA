import { Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NetworkService } from '../core/services/network.service';
import { OfflineDraftService } from '../core/services/offline-draft.service';
import { NotifikasiStateService } from '../core/services/notifikasi-state.service';
import { IdleService } from '../core/services/idle.service';
import { PushNotificationService } from '../core/services/push-notification.service';
import { ROLE_LABELS } from '../shared/constants/menu.constants';
import { MenuItemConfig } from '../shared/constants/menu.constants';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell-layout">
      <!-- SHELL WEB: Thin Institutional Sidebar (Desktop >= 900px) -->
      <aside class="shell-sidebar" aria-label="Navigasi Utama">
        <div class="brand-block">
          <div class="brand-emblem">POLRI</div>
          <div class="brand-meta">
            <div class="brand-title">SIPINAR</div>
            <div class="brand-subtitle">Satresnarkoba</div>
          </div>
        </div>

        @if (auth.currentUser(); as user) {
          <div class="user-card">
            <div class="user-pangkat">{{ user.pangkat }} {{ user.nama }}</div>
            <div class="user-nrp tabular-nums">NRP {{ user.nrp }}</div>
            <div class="user-role-tag">{{ getRoleLabel(user.role) }}</div>
            <div class="user-satuan">{{ user.satuanNama }}</div>
            @if (user.role === 'KBO') {
              <div
                class="delegasi-pill"
                [class.active]="user.hasActiveDelegation"
              >
                {{ user.hasActiveDelegation ? 'Delegasi Kasat: AKTIF' : 'Delegasi: Tidak Aktif' }}
              </div>
            }
          </div>
        }

        <nav class="sidebar-nav">
          @for (item of auth.visibleMenus(); track item.id) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              class="nav-link"
            >
              <span class="nav-label">{{ item.label }}</span>
              @if (getBadgeValue(item) > 0) {
                <span class="nav-badge tabular-nums">{{ getBadgeValue(item) }}</span>
              }
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <button type="button" class="btn btn-secondary btn-sm btn-block" (click)="onLogout()">
            Keluar Sesi
          </button>
        </div>
      </aside>

      <!-- MAIN AREA (Header + Content + Mobile Bottom Tab Bar) -->
      <div class="shell-main">
        <header class="shell-header">
          <div class="header-left">
            <span class="mobile-brand">SIPINAR</span>
            @if (auth.currentUser(); as user) {
              <span class="header-satuan">{{ user.satuanNama }}</span>
            }
          </div>

          <div class="header-right">
            <!-- Tombol simulasi sinyal untuk pengujian lapangan offline -> online -->
            <button
              type="button"
              class="net-indicator"
              [class.offline]="!network.isOnline()"
              (click)="toggleSimulateOffline()"
              title="Klik untuk menguji transisi sinyal Online / Offline"
            >
              <span class="dot"></span>
              <span>{{ network.isOnline() ? 'Online' : 'Offline (Mode Draft)' }}</span>
            </button>

            @if (offlineDrafts.pendingCount() > 0) {
              <span class="draft-pill tabular-nums">
                {{ offlineDrafts.pendingCount() }} Draft Menunggu
              </span>
            }

            @if (auth.currentUser(); as user) {
              <span class="header-user tabular-nums">
                {{ user.pangkat }} {{ user.nama }} ({{ user.nrp }})
              </span>
            }
          </div>
        </header>

        @if (!network.isOnline()) {
          <div class="offline-strip" role="status">
            Tidak ada jaringan. Laporan yang dibuat akan dienkripsi sebagai draft pada perangkat dan dikirim otomatis saat sinyal kembali.
          </div>
        }

        <main class="shell-content">
          <router-outlet></router-outlet>
        </main>

        <!-- SHELL MOBILE: Bottom Tab Bar (< 900px) -->
        <nav class="shell-bottom-tabs" aria-label="Menu Bawah">
          @for (item of auth.visibleMenus(); track item.id) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              class="tab-item"
            >
              <span class="tab-label">{{ item.label }}</span>
              @if (getBadgeValue(item) > 0) {
                <span class="tab-badge tabular-nums">{{ getBadgeValue(item) }}</span>
              }
            </a>
          }
        </nav>
      </div>
    </div>
  `,
  styles: [
    `
      .shell-layout {
        display: flex;
        min-height: 100vh;
        background-color: var(--color-bg-app);
      }

      /* Sidebar (Desktop) */
      .shell-sidebar {
        display: none;
        width: 236px;
        flex-shrink: 0;
        background-color: var(--color-navy-900);
        color: #ffffff;
        flex-direction: column;
        border-right: 1px solid var(--color-navy-700);
      }

      .brand-block {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-4);
        border-bottom: 1px solid var(--color-navy-700);
      }

      .brand-emblem {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-sm);
        background-color: var(--color-gold-500);
        color: #ffffff;
        font-weight: 800;
        font-size: 0.72rem;
        display: flex;
        align-items: center;
        justify-content: center;
        letter-spacing: 0.04em;
      }

      .brand-title {
        font-weight: 700;
        font-size: 1rem;
        letter-spacing: 0.03em;
      }

      .brand-subtitle {
        font-size: 0.75rem;
        color: var(--color-navy-100);
      }

      .user-card {
        padding: var(--space-3) var(--space-4);
        background-color: var(--color-navy-800);
        border-bottom: 1px solid var(--color-navy-700);
        font-size: 0.8rem;
      }

      .user-pangkat {
        font-weight: 600;
        color: #ffffff;
      }

      .user-nrp {
        color: var(--color-gold-100);
        font-size: 0.76rem;
        margin-top: 2px;
      }

      .user-role-tag {
        display: inline-block;
        margin-top: var(--space-1);
        padding: 2px 6px;
        background-color: var(--color-navy-700);
        border: 1px solid var(--color-navy-600);
        border-radius: var(--radius-sm);
        font-size: 0.72rem;
        color: #ffffff;
      }

      .user-satuan {
        margin-top: var(--space-1);
        color: var(--color-navy-100);
        font-size: 0.74rem;
      }

      .delegasi-pill {
        margin-top: var(--space-2);
        padding: 3px 6px;
        border-radius: var(--radius-sm);
        font-size: 0.72rem;
        font-weight: 600;
        background: #742a2a;
        color: #ffffff;
        &.active {
          background: #22543d;
        }
      }

      .sidebar-nav {
        flex: 1;
        padding: var(--space-3) var(--space-2);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .nav-link {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 44px;
        padding: 0 var(--space-3);
        color: var(--color-navy-100);
        text-decoration: none;
        border-radius: var(--radius-sm);
        font-weight: 500;
        font-size: 0.875rem;
        border-left: 3px solid transparent;

        &:hover {
          background-color: var(--color-navy-800);
          color: #ffffff;
        }

        &.active {
          background-color: var(--color-navy-800);
          color: #ffffff;
          font-weight: 600;
          border-left-color: var(--color-gold-500);
        }
      }

      .nav-badge,
      .tab-badge {
        background-color: var(--color-gold-500);
        color: #ffffff;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: var(--radius-sm);
      }

      .sidebar-footer {
        padding: var(--space-3) var(--space-4);
        border-top: 1px solid var(--color-navy-700);
      }

      /* Main Area */
      .shell-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }

      .shell-header {
        min-height: 52px;
        background-color: var(--color-bg-surface);
        border-bottom: 1px solid var(--color-border);
        padding: var(--space-2) var(--space-4);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
      }

      .header-left {
        display: flex;
        align-items: center;
        gap: var(--space-2);
      }

      .mobile-brand {
        font-weight: 800;
        color: var(--color-navy-900);
        letter-spacing: 0.03em;
      }

      .header-satuan {
        font-size: 0.82rem;
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      .header-right {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }

      .net-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 32px;
        padding: 4px 10px;
        font-size: 0.76rem;
        font-weight: 600;
        border-radius: var(--radius-sm);
        background: var(--status-benar-bg);
        color: var(--status-benar-text);
        border: 1px solid var(--status-benar-border);
        cursor: pointer;

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--status-benar-text);
        }

        &.offline {
          background: var(--status-baru-bg);
          color: var(--status-baru-text);
          border-color: var(--status-baru-border);

          .dot {
            background: var(--status-baru-text);
          }
        }
      }

      .draft-pill {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: var(--radius-sm);
        background: var(--status-baru-bg);
        color: var(--status-baru-text);
        border: 1px solid var(--status-baru-border);
      }

      .header-user {
        display: none;
        font-size: 0.8rem;
        color: var(--color-text-secondary);
        font-weight: 500;
      }

      .offline-strip {
        background-color: var(--status-baru-bg);
        color: var(--status-baru-text);
        border-bottom: 1px solid var(--status-baru-border);
        padding: 6px var(--space-4);
        font-size: 0.78rem;
        font-weight: 600;
      }

      .shell-content {
        flex: 1;
        padding: var(--space-4);
        padding-bottom: 76px;
        max-width: 1200px;
        width: 100%;
        margin: 0 auto;
      }

      /* Bottom Tab Bar (Mobile) */
      .shell-bottom-tabs {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        min-height: 56px;
        background-color: var(--color-bg-surface);
        border-top: 1px solid var(--color-border-strong);
        display: flex;
        align-items: stretch;
        justify-content: space-around;
        z-index: 50;
      }

      .tab-item {
        flex: 1;
        min-height: 48px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        text-decoration: none;
        color: var(--color-text-secondary);
        font-size: 0.74rem;
        font-weight: 600;
        padding: 4px 6px;
        border-top: 3px solid transparent;
        position: relative;

        &.active {
          color: var(--color-navy-900);
          border-top-color: var(--color-navy-900);
          background-color: var(--color-navy-50);
        }
      }

      @media (min-width: 900px) {
        .shell-sidebar {
          display: flex;
        }
        .mobile-brand {
          display: none;
        }
        .header-user {
          display: inline;
        }
        .shell-bottom-tabs {
          display: none;
        }
        .shell-content {
          padding: var(--space-6);
        }
      }
    `
  ]
})
export class AppShellComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly network = inject(NetworkService);
  readonly offlineDrafts = inject(OfflineDraftService);
  readonly notifikasiState = inject(NotifikasiStateService);
  private readonly idle = inject(IdleService);
  private readonly push = inject(PushNotificationService);

  ngOnInit(): void {
    this.idle.startMonitoring();
    void this.push.initPush();
    this.notifikasiState.refreshUnreadCount();
  }

  getRoleLabel(role: string): string {
    return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
  }

  getBadgeValue(item: MenuItemConfig): number {
    if (item.badgeKey === 'unreadNotif') {
      return this.notifikasiState.unreadCount();
    }
    if (item.badgeKey === 'offlineDrafts') {
      return this.offlineDrafts.pendingCount();
    }
    return 0;
  }

  toggleSimulateOffline(): void {
    this.network.setSimulatedOnlineState(!this.network.isOnline());
  }

  onLogout(): void {
    void this.auth.logout();
  }
}
