import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { DisposisiDto, StatusLaporan } from '../../shared/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-disposisi-masuk',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="disposisi-masuk-page">
      <div class="inst-panel-header">
        <div>
          <h1>Disposisi Masuk</h1>
          <div class="text-muted">
            Daftar penugasan penyidikan laporan informasi dari Kasat Narkoba / KBO
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="loadDisposisi()">
          Muat Ulang
        </button>
      </div>

      @if (loading()) {
        <app-skeleton-loader [rows]="4"></app-skeleton-loader>
      } @else if (items().length === 0) {
        <app-empty-state
          title="Belum Ada Disposisi Masuk"
          description="Belum ada laporan yang didisposisikan kepada Anda saat ini."
        ></app-empty-state>
      } @else {
        <div class="inst-table-wrap desktop-only">
          <table class="inst-table">
            <thead>
              <tr>
                <th>No. Laporan</th>
                <th>Waktu Disposisi</th>
                <th>Wilayah</th>
                <th>Pemberi Disposisi</th>
                <th>Catatan Instruksi</th>
                <th>Status Laporan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (d of items(); track d.id) {
                <tr>
                  <td class="tabular-nums"><strong>{{ d.noLaporan }}</strong></td>
                  <td class="tabular-nums">{{ d.waktuDisposisi | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>{{ d.wilayah }}</td>
                  <td>{{ d.dariUserPangkat }} {{ d.dariUserNama }}</td>
                  <td>{{ d.catatan }}</td>
                  <td>
                    @if (d.laporanStatus) {
                      <app-status-badge [status]="d.laporanStatus"></app-status-badge>
                    }
                  </td>
                  <td class="actions-col">
                    <a [routerLink]="['/laporan', d.laporanId]" class="btn btn-secondary btn-sm">
                      Detail
                    </a>
                    @if (d.laporanStatus === StatusLaporan.DIDISPOSISI) {
                      <a
                        [routerLink]="['/penyidikan/form', d.laporanId]"
                        class="btn btn-primary btn-sm"
                      >
                        Isi Hasil Penyidikan
                      </a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mobile-only mobile-list">
          @for (d of items(); track d.id) {
            <div class="inst-card">
              <div class="row-top">
                <strong class="tabular-nums">{{ d.noLaporan }}</strong>
                @if (d.laporanStatus) {
                  <app-status-badge [status]="d.laporanStatus"></app-status-badge>
                }
              </div>
              <div class="text-muted tabular-nums">
                {{ d.wilayah }} • {{ d.waktuDisposisi | date: 'dd/MM/yyyy HH:mm' }}
              </div>
              <p class="catatan-box">"{{ d.catatan }}"</p>
              <div class="actions-col">
                <a [routerLink]="['/laporan', d.laporanId]" class="btn btn-secondary btn-sm">
                  Buka Detail
                </a>
                @if (d.laporanStatus === StatusLaporan.DIDISPOSISI) {
                  <a
                    [routerLink]="['/penyidikan/form', d.laporanId]"
                    class="btn btn-primary btn-sm"
                  >
                    Isi Hasil Penyidikan
                  </a>
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
      .actions-col {
        display: flex;
        gap: var(--space-2);
      }
      .row-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .catatan-box {
        margin: var(--space-2) 0;
        padding: var(--space-2);
        background: var(--color-navy-50);
        border-radius: var(--radius-sm);
        font-size: 0.85rem;
      }
    `
  ]
})
export class DisposisiMasukComponent implements OnInit {
  readonly StatusLaporan = StatusLaporan;
  private readonly api = inject(ApiService);

  readonly items = signal<DisposisiDto[]>([]);
  readonly loading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadDisposisi();
  }

  loadDisposisi(): void {
    this.loading.set(true);
    this.api.get<DisposisiDto[]>('/disposisi/masuk').subscribe({
      next: (res) => {
        this.items.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
