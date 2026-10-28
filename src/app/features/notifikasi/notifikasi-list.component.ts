import { Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NotifikasiStateService } from '../../core/services/notifikasi-state.service';
import { AuthService } from '../../core/services/auth.service';
import { NON_DETAIL_ROLES } from '../../shared/constants/menu.constants';
import { NotifikasiDto, Role } from '../../shared/models/models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-notifikasi-list',
  standalone: true,
  imports: [DatePipe, SkeletonLoaderComponent, EmptyStateComponent],
  template: `
    <div class="notifikasi-page">
      <div class="inst-panel-header">
        <div>
          <h1>Notifikasi</h1>
          <div class="text-muted">
            Pemberitahuan operasional (tanpa memuat data sensitif laporan)
          </div>
        </div>

        <div class="header-actions">
          @if (notifikasiState.unreadCount() > 0) {
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              (click)="markAllRead()"
            >
              Tandai semua dibaca
            </button>
          }
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="notifikasiState.loadNotifikasi()"
          >
            Muat Ulang
          </button>
        </div>
      </div>

      @if (isRestrictedSummaryRole()) {
        <div class="inst-banner banner-info">
          <span>
            Sesuai matriks hak akses, peran Anda hanya menerima notifikasi ringkas berisi <strong>Nomor Laporan, Wilayah, dan Waktu</strong> tanpa tautan ke detail laporan.
          </span>
        </div>
      }

      @if (notifikasiState.loading()) {
        <app-skeleton-loader [rows]="4"></app-skeleton-loader>
      } @else if (notifikasiState.items().length === 0) {
        <app-empty-state
          title="Belum Ada Notifikasi"
          description="Tidak ada pemberitahuan baru untuk akun Anda."
        ></app-empty-state>
      } @else {
        <div class="notif-list">
          @for (item of notifikasiState.items(); track item.id) {
            <div
              class="notif-card"
              [class.unread]="!item.dibacaAt"
              [class.clickable]="canNavigateToDetail(item)"
              (click)="onItemClick(item)"
            >
              <div class="notif-main">
                <div class="notif-top">
                  <div class="notif-title-group">
                    @if (!item.dibacaAt) {
                      <span class="unread-dot" aria-label="Belum dibaca"></span>
                    }
                    <strong>{{ item.judul }}</strong>
                  </div>
                  <time class="notif-time tabular-nums">
                    {{ item.waktu | date: 'dd/MM/yyyy HH:mm' }} WIB
                  </time>
                </div>

                <div class="notif-body">
                  {{ item.isiRingkas }}
                </div>

                @if (item.noLaporan || item.wilayah) {
                  <div class="notif-meta tabular-nums">
                    @if (item.noLaporan) {
                      <span>No. Laporan: <strong>{{ item.noLaporan }}</strong></span>
                    }
                    @if (item.wilayah) {
                      <span>• Wilayah: {{ item.wilayah }}</span>
                    }
                  </div>
                }
              </div>

              <div class="notif-actions" (click)="$event.stopPropagation()">
                @if (!item.dibacaAt) {
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    (click)="markRead(item.id)"
                  >
                    Tandai Dibaca
                  </button>
                }
                @if (canNavigateToDetail(item)) {
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    (click)="onItemClick(item)"
                  >
                    Buka Detail
                  </button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .header-actions {
        display: flex;
        gap: var(--space-2);
      }
      .notif-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .notif-card {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);

        &.unread {
          border-left: 4px solid var(--color-navy-900);
          background: #f8fbff;
        }
        &.clickable {
          cursor: pointer;
          &:hover {
            background: var(--color-bg-subtle);
          }
        }
      }
      .notif-main {
        flex: 1;
      }
      .notif-top {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        gap: var(--space-2);
        margin-bottom: 4px;
      }
      .notif-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .unread-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-gold-500);
        display: inline-block;
      }
      .notif-time {
        font-size: 0.76rem;
        color: var(--color-text-secondary);
      }
      .notif-body {
        font-size: 0.88rem;
        color: var(--color-text-primary);
      }
      .notif-meta {
        margin-top: 4px;
        font-size: 0.78rem;
        color: var(--color-text-secondary);
        display: flex;
        gap: var(--space-2);
      }
      .notif-actions {
        display: flex;
        gap: var(--space-2);
        flex-shrink: 0;
      }
    `
  ]
})
export class NotifikasiListComponent implements OnInit {
  readonly notifikasiState = inject(NotifikasiStateService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly isRestrictedSummaryRole = computed(() => {
    const r = this.auth.userRole();
    return r ? NON_DETAIL_ROLES.includes(r) : true;
  });

  ngOnInit(): void {
    this.notifikasiState.loadNotifikasi();
  }

  canNavigateToDetail(item: NotifikasiDto): boolean {
    const role = this.auth.userRole();
    if (!role || NON_DETAIL_ROLES.includes(role)) {
      return false;
    }
    if (role === Role.KBO && !this.auth.hasActiveDelegation()) {
      return false;
    }
    return Boolean(item.laporanId);
  }

  onItemClick(item: NotifikasiDto): void {
    if (!item.dibacaAt) {
      this.notifikasiState.markAsRead(item.id).subscribe();
    }
    if (this.canNavigateToDetail(item) && item.laporanId) {
      void this.router.navigate(['/laporan', item.laporanId]);
    }
  }

  markRead(id: string): void {
    this.notifikasiState.markAsRead(id).subscribe();
  }

  markAllRead(): void {
    this.notifikasiState.markAllAsRead().subscribe();
  }
}
