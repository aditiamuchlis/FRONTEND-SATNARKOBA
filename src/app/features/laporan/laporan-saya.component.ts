import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { OfflineDraftService } from '../../core/services/offline-draft.service';
import { NetworkService } from '../../core/services/network.service';
import { LaporanDto } from '../../shared/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-laporan-saya',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="laporan-saya-page">
      <div class="inst-panel-header">
        <div>
          <h1>Laporan Saya</h1>
          <div class="text-muted">Daftar laporan informasi yang Anda kirimkan</div>
        </div>
        <div class="header-actions">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            (click)="loadData()"
            [disabled]="loading()"
          >
            {{ loading() ? 'Memuat...' : 'Muat Ulang' }}
          </button>
          <a routerLink="/laporan/buat" class="btn btn-primary btn-sm">+ Buat Laporan</a>
        </div>
      </div>

      <!-- Antrean Draft Offline Terenkripsi -->
      @if (offlineDrafts.drafts().length > 0) {
        <div class="inst-card draft-queue-card">
          <div class="inst-panel-header">
            <div>
              <h2>Draft Offline (Menunggu Terkirim)</h2>
              <div class="text-muted">
                Tersimpan terenkripsi pada perangkat. Akan dikirim otomatis saat sinyal online.
              </div>
            </div>
            @if (network.isOnline()) {
              <button
                type="button"
                class="btn btn-primary btn-sm"
                (click)="syncNow()"
                [disabled]="offlineDrafts.isSyncing()"
              >
                {{ offlineDrafts.isSyncing() ? 'Mengirim Ulang...' : 'Kirim Semua Sekarang' }}
              </button>
            }
          </div>

          <div class="draft-list">
            @for (d of offlineDrafts.drafts(); track d.id) {
              <div class="draft-row">
                <div>
                  <div class="draft-id tabular-nums">
                    <strong>{{ d.previewNoLabel }}</strong> — Kunci Idempotensi: {{ d.idempotencyKey }}
                  </div>
                  <div class="text-muted tabular-nums">
                    Dibuat: {{ d.createdAt | date: 'dd/MM/yyyy HH:mm:ss' }}
                  </div>
                </div>
                <span class="waiting-badge">Menunggu terkirim</span>
              </div>
            }
          </div>
        </div>
      }

      @if (loading()) {
        <app-skeleton-loader [rows]="4"></app-skeleton-loader>
      } @else if (items().length === 0) {
        <app-empty-state
          title="Belum Ada Laporan Terkirim"
          description="Anda belum mengirimkan laporan informasi. Gunakan tombol di bawah untuk membuat laporan baru."
        ></app-empty-state>
      } @else {
        <!-- Tabel di Web -->
        <div class="inst-table-wrap desktop-only">
          <table class="inst-table">
            <thead>
              <tr>
                <th>No. Laporan</th>
                <th>Waktu Lapor</th>
                <th>Objek / Lokasi</th>
                <th>Wilayah</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (item of items(); track item.id) {
                <tr>
                  <td class="tabular-nums"><strong>{{ item.noLaporan }}</strong></td>
                  <td class="tabular-nums">{{ item.waktuLapor | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ item.namaObjek }}</td>
                  <td>{{ item.wilayah }}</td>
                  <td><app-status-badge [status]="item.status"></app-status-badge></td>
                  <td>
                    <a [routerLink]="['/laporan', item.id]" class="btn btn-secondary btn-sm">
                      Detail
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Daftar Baris di Mobile -->
        <div class="mobile-only mobile-list">
          @for (item of items(); track item.id) {
            <a [routerLink]="['/laporan', item.id]" class="mobile-row-card">
              <div class="row-top">
                <strong class="tabular-nums">{{ item.noLaporan }}</strong>
                <app-status-badge [status]="item.status"></app-status-badge>
              </div>
              <div class="row-title">{{ item.namaObjek }}</div>
              <div class="row-meta tabular-nums">
                {{ item.wilayah }} • {{ item.waktuLapor | date: 'dd/MM/yyyy HH:mm' }}
              </div>
            </a>
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
      .draft-queue-card {
        border-left: 4px solid var(--color-gold-500);
      }
      .draft-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .draft-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-2) var(--space-3);
        background: var(--color-navy-50);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
      }
      .waiting-badge {
        padding: 3px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.74rem;
        font-weight: 700;
        background: var(--status-baru-bg);
        color: var(--status-baru-text);
        border: 1px solid var(--status-baru-border);
        white-space: nowrap;
      }
      .mobile-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }
      .mobile-row-card {
        display: block;
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4);
        text-decoration: none;
        color: var(--color-text-primary);
      }
      .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .row-title {
        font-weight: 600;
        margin-bottom: 4px;
      }
      .row-meta {
        font-size: 0.78rem;
        color: var(--color-text-secondary);
      }
    `
  ]
})
export class LaporanSayaComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly offlineDrafts = inject(OfflineDraftService);
  readonly network = inject(NetworkService);

  readonly items = signal<LaporanDto[]>([]);
  readonly loading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.api.get<LaporanDto[]>('/laporan/saya').subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  async syncNow(): Promise<void> {
    await this.offlineDrafts.syncAllDrafts();
    this.loadData();
  }
}
