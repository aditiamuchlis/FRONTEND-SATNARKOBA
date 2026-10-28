import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { LaporanDto, SatuanDto, StatusLaporan } from '../../shared/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-daftar-laporan',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="daftar-laporan-page">
      <div class="inst-panel-header">
        <div>
          <h1>Daftar Laporan Informasi</h1>
          <div class="text-muted">
            Data laporan wilayah hukum beserta status disposisi dan penyidikan
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="loadLaporan()">
          Muat Ulang
        </button>
      </div>

      <!-- Bar Filter Rapat -->
      <div class="inst-card filter-card">
        <div class="filter-grid">
          <div class="filter-item">
            <label for="fSearch">Pencarian</label>
            <input
              id="fSearch"
              type="text"
              class="inst-input"
              [(ngModel)]="q"
              (keyup.enter)="loadLaporan()"
              placeholder="No. Laporan, wilayah, objek..."
            />
          </div>

          <div class="filter-item">
            <label for="fStatus">Status Laporan</label>
            <select id="fStatus" class="inst-select" [(ngModel)]="statusFilter" (change)="loadLaporan()">
              <option value="">Semua Status</option>
              <option [value]="StatusLaporan.BARU">Baru</option>
              <option [value]="StatusLaporan.DIDISPOSISI">Didisposisi</option>
              <option [value]="StatusLaporan.SELESAI_BENAR">Selesai – Benar</option>
              <option [value]="StatusLaporan.SELESAI_TIDAK_BENAR">Selesai – Tidak Benar</option>
            </select>
          </div>

          <div class="filter-item">
            <label for="fSatuan">Satuan Kerja</label>
            <select id="fSatuan" class="inst-select" [(ngModel)]="satuanId" (change)="loadLaporan()">
              <option value="">Semua Satuan</option>
              @for (s of satuanList(); track s.id) {
                <option [value]="s.id">{{ s.nama }}</option>
              }
            </select>
          </div>

          <div class="filter-item">
            <label for="fDari">Dari Tanggal</label>
            <input
              id="fDari"
              type="date"
              class="inst-input tabular-nums"
              [(ngModel)]="tglDari"
              (change)="loadLaporan()"
            />
          </div>

          <div class="filter-item">
            <label for="fSampai">Sampai Tanggal</label>
            <input
              id="fSampai"
              type="date"
              class="inst-input tabular-nums"
              [(ngModel)]="tglSampai"
              (change)="loadLaporan()"
            />
          </div>
        </div>

        <div class="filter-actions">
          <button type="button" class="btn btn-secondary btn-sm" (click)="resetFilter()">
            Atur Ulang Filter
          </button>
          <button type="button" class="btn btn-primary btn-sm" (click)="loadLaporan()">
            Terapkan Filter
          </button>
        </div>
      </div>

      @if (loading()) {
        <app-skeleton-loader [rows]="5"></app-skeleton-loader>
      } @else if (items().length === 0) {
        <app-empty-state
          title="Tidak Ada Laporan Ditemukan"
          description="Tidak ada laporan yang cocok dengan filter status, tanggal, atau kata kunci pencarian."
        ></app-empty-state>
      } @else {
        <!-- Tabel Rapat di Web (No. Laporan, Waktu, Wilayah, Status, Aksi) -->
        <div class="inst-table-wrap desktop-only">
          <table class="inst-table">
            <thead>
              <tr>
                <th>No. Laporan</th>
                <th>Waktu</th>
                <th>Wilayah / Satuan</th>
                <th>Objek Terindikasi</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (lap of items(); track lap.id) {
                <tr>
                  <td class="tabular-nums"><strong>{{ lap.noLaporan }}</strong></td>
                  <td class="tabular-nums">{{ lap.waktuLapor | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td>
                    <div>{{ lap.wilayah }}</div>
                    <div class="text-muted">{{ lap.satuanNama }}</div>
                  </td>
                  <td>{{ lap.namaObjek }}</td>
                  <td><app-status-badge [status]="lap.status"></app-status-badge></td>
                  <td class="action-cell">
                    <a [routerLink]="['/laporan', lap.id]" class="btn btn-primary btn-sm">
                      Detail
                    </a>
                    @if (canDispose(lap)) {
                      <a
                        [routerLink]="['/disposisi/form', lap.id]"
                        class="btn btn-secondary btn-sm"
                      >
                        Disposisikan
                      </a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Daftar Baris di Mobile -->
        <div class="mobile-only mobile-rows">
          @for (lap of items(); track lap.id) {
            <div class="mobile-row-box">
              <div class="row-head">
                <strong class="tabular-nums">{{ lap.noLaporan }}</strong>
                <app-status-badge [status]="lap.status"></app-status-badge>
              </div>
              <div class="row-objek">{{ lap.namaObjek }}</div>
              <div class="row-sub tabular-nums">
                {{ lap.wilayah }} • {{ lap.waktuLapor | date: 'dd/MM/yyyy HH:mm' }}
              </div>
              <div class="row-actions">
                <a [routerLink]="['/laporan', lap.id]" class="btn btn-primary btn-sm">
                  Buka Detail
                </a>
                @if (canDispose(lap)) {
                  <a [routerLink]="['/disposisi/form', lap.id]" class="btn btn-secondary btn-sm">
                    Disposisikan
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
      .filter-card {
        padding: var(--space-3) var(--space-4);
      }
      .filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: var(--space-3);
      }
      .filter-item label {
        display: block;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--color-text-secondary);
        margin-bottom: 4px;
      }
      .filter-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-2);
        margin-top: var(--space-3);
      }
      .action-cell {
        display: flex;
        gap: var(--space-2);
      }
      .mobile-rows {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }
      .mobile-row-box {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4);
      }
      .row-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }
      .row-objek {
        font-weight: 600;
        margin-bottom: 4px;
      }
      .row-sub {
        font-size: 0.78rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--space-3);
      }
      .row-actions {
        display: flex;
        gap: var(--space-2);
      }
    `
  ]
})
export class DaftarLaporanComponent implements OnInit {
  readonly StatusLaporan = StatusLaporan;
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly items = signal<LaporanDto[]>([]);
  readonly satuanList = signal<SatuanDto[]>([]);
  readonly loading = signal<boolean>(false);

  q = '';
  statusFilter = '';
  satuanId = '';
  tglDari = '';
  tglSampai = '';

  ngOnInit(): void {
    this.loadSatuan();
    this.loadLaporan();
  }

  loadSatuan(): void {
    this.api.get<SatuanDto[]>('/satuan').subscribe({
      next: (res) => this.satuanList.set(res.data ?? []),
      error: () => {}
    });
  }

  loadLaporan(): void {
    this.loading.set(true);
    this.api
      .get<LaporanDto[]>('/laporan', {
        q: this.q || undefined,
        status: this.statusFilter || undefined,
        satuan_id: this.satuanId || undefined,
        tgl_dari: this.tglDari || undefined,
        tgl_sampai: this.tglSampai || undefined
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  resetFilter(): void {
    this.q = '';
    this.statusFilter = '';
    this.satuanId = '';
    this.tglDari = '';
    this.tglSampai = '';
    this.loadLaporan();
  }

  canDispose(lap: LaporanDto): boolean {
    if (
      lap.status === StatusLaporan.SELESAI_BENAR ||
      lap.status === StatusLaporan.SELESAI_TIDAK_BENAR
    ) {
      return false;
    }
    const role = this.auth.userRole();
    return (
      role === 'KASAT_NARKOBA' ||
      (role === 'KBO' && this.auth.hasActiveDelegation())
    );
  }
}
