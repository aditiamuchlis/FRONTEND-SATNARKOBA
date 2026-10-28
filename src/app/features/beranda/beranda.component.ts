import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { NotifikasiStateService } from '../../core/services/notifikasi-state.service';
import { OfflineDraftService } from '../../core/services/offline-draft.service';
import {
  BerandaMetricItem,
  DisposisiDto,
  LaporanDto,
  Role,
  StatusLaporan
} from '../../shared/models/models';
import { NON_DETAIL_ROLES, ROLE_LABELS } from '../../shared/constants/menu.constants';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-beranda',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="beranda-wrap">
      <div class="inst-panel-header">
        <div>
          <h1>Ringkasan Operasional</h1>
          @if (auth.currentUser(); as user) {
            <div class="text-muted">
              {{ getRoleLabel(user.role) }} — {{ user.satuanNama }} ({{ user.wilayah }})
            </div>
          }
        </div>

        <div class="header-actions">
          @if (auth.userRole() === Role.BHABIN) {
            <a routerLink="/laporan/buat" class="btn btn-primary btn-sm">
              + Buat Laporan
            </a>
          }
          <button type="button" class="btn btn-secondary btn-sm" (click)="reloadData()">
            Muat Ulang
          </button>
        </div>
      </div>

      @if (auth.userRole() === Role.KBO && !auth.hasActiveDelegation()) {
        <div class="inst-banner banner-info">
          <span>
            <strong>Status Delegasi KBO: Tidak Aktif.</strong> Anda saat ini tidak memiliki delegasi aktif dari Kasat Narkoba sehingga menu Daftar Laporan dan pembukaan Detail Laporan ditutup otomatis.
          </span>
          <a routerLink="/delegasi" class="btn btn-secondary btn-sm">Lihat Riwayat Delegasi</a>
        </div>
      }

      @if (isNonDetailRole()) {
        <div class="inst-banner banner-info">
          <span>
            <strong>Kebijakan Kerahasiaan Informasi:</strong> Peran {{ getRoleLabel(auth.userRole()!) }} menerima ringkasan notifikasi masuk (nomor laporan, wilayah, waktu) tanpa akses ke detail laporan, identitas pelapor, maupun foto lokasi.
          </span>
        </div>
      }

      <!-- Angka Ringkas Operasional (Tanpa Grafik Dekoratif) -->
      <section aria-label="Angka Ringkas Operasional" class="metrics-grid">
        @for (m of metrics(); track m.label) {
          <div class="metric-box">
            <div class="metric-label">{{ m.label }}</div>
            <div class="metric-val tabular-nums">{{ m.value }}</div>
            <div class="metric-sub">{{ m.keterangan }}</div>
          </div>
        }
      </section>

      @if (loading()) {
        <app-skeleton-loader [rows]="4"></app-skeleton-loader>
      } @else {
        <!-- Daftar Aktivitas / Notifikasi Terbaru sesuai Peran -->
        @if (isNonDetailRole() || (auth.userRole() === Role.KBO && !auth.hasActiveDelegation())) {
          <div class="inst-card">
            <div class="inst-panel-header">
              <h2>Notifikasi Laporan Terbaru (Ringkasan)</h2>
              <a routerLink="/notifikasi" class="btn btn-secondary btn-sm">Semua Notifikasi</a>
            </div>

            @if (notifikasiState.items().length === 0) {
              <app-empty-state
                title="Belum Ada Notifikasi"
                description="Belum ada notifikasi laporan baru pada wilayah Anda."
              ></app-empty-state>
            } @else {
              <div class="inst-table-wrap">
                <table class="inst-table">
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>No. Laporan</th>
                      <th>Wilayah</th>
                      <th>Ringkasan Informasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (n of notifikasiState.items(); track n.id) {
                      <tr>
                        <td class="tabular-nums">{{ n.waktu | date: 'dd/MM/yyyy HH:mm' }}</td>
                        <td class="tabular-nums"><strong>{{ n.noLaporan || '-' }}</strong></td>
                        <td>{{ n.wilayah || '-' }}</td>
                        <td>{{ n.isiRingkas }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        } @else if (auth.userRole() === Role.PENYIDIK) {
          <div class="inst-card">
            <div class="inst-panel-header">
              <h2>Disposisi Masuk Terbaru</h2>
              <a routerLink="/disposisi" class="btn btn-secondary btn-sm">Buka Disposisi Masuk</a>
            </div>

            @if (disposisiList().length === 0) {
              <app-empty-state
                title="Tidak Ada Disposisi Masuk"
                description="Belum ada laporan yang didisposisikan kepada Anda."
              ></app-empty-state>
            } @else {
              <div class="inst-table-wrap">
                <table class="inst-table">
                  <thead>
                    <tr>
                      <th>No. Laporan</th>
                      <th>Waktu Disposisi</th>
                      <th>Wilayah</th>
                      <th>Catatan Kasat/KBO</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of disposisiList(); track d.id) {
                      <tr>
                        <td class="tabular-nums"><strong>{{ d.noLaporan }}</strong></td>
                        <td class="tabular-nums">{{ d.waktuDisposisi | date: 'dd/MM/yyyy HH:mm' }}</td>
                        <td>{{ d.wilayah }}</td>
                        <td>{{ d.catatan }}</td>
                        <td>
                          @if (d.laporanStatus) {
                            <app-status-badge [status]="d.laporanStatus"></app-status-badge>
                          }
                        </td>
                        <td>
                          <a [routerLink]="['/laporan', d.laporanId]" class="btn btn-primary btn-sm">
                            Buka Detail
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        } @else {
          <!-- BHABIN, KASAT_NARKOBA, atau KBO (delegasi aktif) -->
          <div class="inst-card">
            <div class="inst-panel-header">
              <h2>
                {{
                  auth.userRole() === Role.BHABIN
                    ? 'Laporan Saya Terbaru'
                    : 'Daftar Laporan Operasional Terbaru'
                }}
              </h2>
              <a
                [routerLink]="
                  auth.userRole() === Role.BHABIN ? '/laporan/saya' : '/laporan/daftar'
                "
                class="btn btn-secondary btn-sm"
              >
                Lihat Semua
              </a>
            </div>

            @if (laporanList().length === 0) {
              <app-empty-state
                title="Belum Ada Laporan"
                description="Belum ada laporan yang tercatat."
              ></app-empty-state>
            } @else {
              <div class="inst-table-wrap">
                <table class="inst-table">
                  <thead>
                    <tr>
                      <th>No. Laporan</th>
                      <th>Waktu Lapor</th>
                      <th>Wilayah / Satuan</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (lap of laporanList().slice(0, 6); track lap.id) {
                      <tr>
                        <td class="tabular-nums"><strong>{{ lap.noLaporan }}</strong></td>
                        <td class="tabular-nums">{{ lap.waktuLapor | date: 'dd/MM/yyyy HH:mm' }}</td>
                        <td>{{ lap.wilayah }}</td>
                        <td>
                          <app-status-badge [status]="lap.status"></app-status-badge>
                        </td>
                        <td>
                          <a [routerLink]="['/laporan', lap.id]" class="btn btn-secondary btn-sm">
                            Detail
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .header-actions {
        display: flex;
        gap: var(--space-2);
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }
      .metric-box {
        background: var(--color-bg-surface);
        border: 1px solid var(--color-border);
        border-left: 4px solid var(--color-navy-900);
        border-radius: var(--radius-sm);
        padding: var(--space-3) var(--space-4);
      }
      .metric-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: var(--color-text-secondary);
      }
      .metric-val {
        font-size: 1.65rem;
        font-weight: 700;
        color: var(--color-navy-900);
        margin: 4px 0;
      }
      .metric-sub {
        font-size: 0.76rem;
        color: var(--color-text-secondary);
      }
    `
  ]
})
export class BerandaComponent implements OnInit {
  readonly Role = Role;
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly notifikasiState = inject(NotifikasiStateService);
  readonly offlineDrafts = inject(OfflineDraftService);

  readonly loading = signal<boolean>(false);
  readonly laporanList = signal<LaporanDto[]>([]);
  readonly disposisiList = signal<DisposisiDto[]>([]);

  readonly isNonDetailRole = computed(() => {
    const r = this.auth.userRole();
    return r ? NON_DETAIL_ROLES.includes(r) : true;
  });

  readonly metrics = computed<BerandaMetricItem[]>(() => {
    const role = this.auth.userRole();
    const laps = this.laporanList();
    const notifs = this.notifikasiState.items();
    const unread = this.notifikasiState.unreadCount();

    if (role === Role.BHABIN) {
      return [
        {
          label: 'Total Laporan Saya',
          value: laps.length,
          keterangan: 'Laporan terkirim ke Satresnarkoba'
        },
        {
          label: 'Menunggu Disposisi',
          value: laps.filter((l) => l.status === StatusLaporan.BARU).length,
          keterangan: 'Status Baru'
        },
        {
          label: 'Dalam Penyidikan',
          value: laps.filter((l) => l.status === StatusLaporan.DIDISPOSISI).length,
          keterangan: 'Sedang ditindaklanjuti Penyidik'
        },
        {
          label: 'Draft Offline',
          value: this.offlineDrafts.pendingCount(),
          keterangan: 'Menunggu terkirim otomatis'
        }
      ];
    }

    if (role && NON_DETAIL_ROLES.includes(role)) {
      return [
        {
          label: 'Notifikasi Belum Dibaca',
          value: unread,
          keterangan: 'Pemberitahuan laporan masuk'
        },
        {
          label: 'Total Notifikasi Masuk',
          value: notifs.length,
          keterangan: 'Ringkasan nomor laporan & wilayah'
        }
      ];
    }

    if (role === Role.PENYIDIK) {
      const disps = this.disposisiList();
      return [
        {
          label: 'Total Disposisi Masuk',
          value: disps.length,
          keterangan: 'Penugasan dari Kasat / KBO'
        },
        {
          label: 'Menunggu Penyidikan',
          value: disps.filter((d) => d.laporanStatus === StatusLaporan.DIDISPOSISI).length,
          keterangan: 'Wajib diisi hasil penyidikan'
        },
        {
          label: 'Selesai Disidik',
          value: disps.filter(
            (d) =>
              d.laporanStatus === StatusLaporan.SELESAI_BENAR ||
              d.laporanStatus === StatusLaporan.SELESAI_TIDAK_BENAR
          ).length,
          keterangan: 'Laporan hasil telah dikirim'
        }
      ];
    }

    // KASAT_NARKOBA or KBO
    return [
      {
        label: 'Laporan Baru',
        value: laps.filter((l) => l.status === StatusLaporan.BARU).length,
        keterangan: 'Menunggu disposisi Kasat/KBO'
      },
      {
        label: 'Dalam Penyidikan',
        value: laps.filter((l) => l.status === StatusLaporan.DIDISPOSISI).length,
        keterangan: 'Telah didisposisikan ke Penyidik'
      },
      {
        label: 'Selesai – Benar',
        value: laps.filter((l) => l.status === StatusLaporan.SELESAI_BENAR).length,
        keterangan: 'Terbukti ditemukan indikasi/BB'
      },
      {
        label: 'Selesai – Tidak Benar',
        value: laps.filter((l) => l.status === StatusLaporan.SELESAI_TIDAK_BENAR).length,
        keterangan: 'Tidak terbukti di lapangan'
      }
    ];
  });

  ngOnInit(): void {
    this.reloadData();
  }

  reloadData(): void {
    const role = this.auth.userRole();
    this.notifikasiState.loadNotifikasi();

    if (!role || NON_DETAIL_ROLES.includes(role)) {
      return;
    }

    if (role === Role.KBO && !this.auth.hasActiveDelegation()) {
      return;
    }

    this.loading.set(true);
    if (role === Role.BHABIN) {
      this.api.get<LaporanDto[]>('/laporan/saya').subscribe({
        next: (res) => {
          this.laporanList.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else if (role === Role.PENYIDIK) {
      this.api.get<DisposisiDto[]>('/disposisi/masuk').subscribe({
        next: (res) => {
          this.disposisiList.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    } else {
      this.api.get<LaporanDto[]>('/laporan').subscribe({
        next: (res) => {
          this.laporanList.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
    }
  }

  getRoleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }
}
