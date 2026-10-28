import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import {
  CakupanDelegasi,
  DelegasiDto,
  KboLookupDto,
  LaporanDto,
  Role,
  StatusDelegasiComputed
} from '../../shared/models/models';
import { computeStatusDelegasi } from '../../shared/constants/menu.constants';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-delegasi-akses',
  standalone: true,
  imports: [ReactiveFormsModule, SkeletonLoaderComponent, EmptyStateComponent],
  template: `
    <div class="delegasi-page">
      <div class="inst-panel-header">
        <div>
          <h1>
            {{
              auth.userRole() === Role.KASAT_NARKOBA
                ? 'Delegasi Akses KBO'
                : 'Delegasi Diterima (KBO)'
            }}
          </h1>
          <div class="text-muted">
            Pelimpahan wewenang berjangka kepada KBO saat Kasat Narkoba berhalangan
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="loadDelegasi()">
          Muat Ulang
        </button>
      </div>

      @if (errorMessage()) {
        <div class="inst-banner banner-danger" role="alert">
          <span>{{ errorMessage() }}</span>
        </div>
      }

      @if (successMessage()) {
        <div class="inst-banner banner-success" role="status">
          <span>{{ successMessage() }}</span>
        </div>
      }

      <!-- Form Buat Delegasi (Khusus KASAT_NARKOBA) -->
      @if (auth.userRole() === Role.KASAT_NARKOBA) {
        <form [formGroup]="form" (ngSubmit)="onSubmitDelegasi()" novalidate class="inst-card">
          <div class="inst-panel-header">
            <h2>Buat Delegasi Berjangka Baru</h2>
            <span class="text-muted">NRP tujuan wajib personel KBO aktif di satuan yang sama</span>
          </div>

          <div class="delegasi-form-grid">
            <!-- 1. Input NRP KBO + Lookup -->
            <div class="form-field">
              <label for="nrpKboInput">NRP KBO Tujuan <span class="req">*</span></label>
              <div class="lookup-row">
                <input
                  id="nrpKboInput"
                  type="text"
                  inputmode="numeric"
                  class="inst-input tabular-nums"
                  formControlName="nrp"
                  placeholder="Contoh: 83070707"
                  (input)="clearLookup()"
                />
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="lookupKboNrp()"
                  [disabled]="lookingUp() || !form.controls.nrp.value.trim()"
                >
                  {{ lookingUp() ? 'Mengecek...' : 'Cek NRP' }}
                </button>
              </div>

              @if (lookupError()) {
                <div class="field-error" role="alert">{{ lookupError() }}</div>
              }

              @if (verifiedKbo(); as kbo) {
                <div class="verified-kbo-box">
                  <div class="section-label">KONFIRMASI PERSONEL KBO DITEMUKAN</div>
                  <div class="kbo-name">{{ kbo.pangkat }} {{ kbo.nama }}</div>
                  <div class="text-muted tabular-nums">
                    NRP {{ kbo.nrp }} • {{ kbo.jabatan }} ({{ kbo.satuanNama }})
                  </div>
                </div>
              }
            </div>

            <!-- 2. Rentang Tanggal -->
            <div class="date-range-fields">
              <div class="form-field">
                <label for="tglMulaiInput">Tanggal Mulai <span class="req">*</span></label>
                <input
                  id="tglMulaiInput"
                  type="date"
                  class="inst-input tabular-nums"
                  formControlName="tgl_mulai"
                />
              </div>

              <div class="form-field">
                <label for="tglSelesaiInput">Tanggal Selesai <span class="req">*</span></label>
                <input
                  id="tglSelesaiInput"
                  type="date"
                  class="inst-input tabular-nums"
                  formControlName="tgl_selesai"
                />
              </div>
            </div>
          </div>

          <!-- 3. Cakupan Delegasi -->
          <div class="form-field">
            <label for="cakupanSelect">Cakupan Laporan yang Didelegasikan <span class="req">*</span></label>
            <select id="cakupanSelect" class="inst-select" formControlName="cakupan">
              <option [value]="CakupanDelegasi.SEMUA">
                Semua Laporan di Satuan Kerja
              </option>
              <option [value]="CakupanDelegasi.TERTENTU">
                Laporan Tertentu Saja
              </option>
            </select>
          </div>

          @if (form.controls.cakupan.value === CakupanDelegasi.TERTENTU) {
            <div class="form-field">
              <label>Pilih Nomor Laporan yang Didelegasikan <span class="req">*</span></label>
              <div class="laporan-check-list">
                @for (lap of availableLaporan(); track lap.id) {
                  <label class="check-item">
                    <input
                      type="checkbox"
                      [checked]="selectedLaporanIds().includes(lap.id)"
                      (change)="toggleLaporanSelection(lap.id)"
                    />
                    <span class="tabular-nums"><strong>{{ lap.noLaporan }}</strong></span>
                    <span>— {{ lap.namaObjek }} ({{ lap.wilayah }})</span>
                  </label>
                }
              </div>
            </div>
          }

          <div class="form-submit-row">
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="form.invalid || !verifiedKbo() || submitting()"
            >
              {{ submitting() ? 'Menyimpan Delegasi...' : 'Aktifkan Delegasi KBO' }}
            </button>
          </div>
        </form>
      }

      <!-- Daftar Delegasi (Aktif, Akan Datang, Selesai, Dicabut) -->
      <div class="inst-card">
        <div class="inst-panel-header">
          <h2>Daftar Riwayat & Status Delegasi</h2>
          <div class="text-muted">Zona waktu perhitungan periode: Asia/Jakarta (WIB)</div>
        </div>

        @if (loading()) {
          <app-skeleton-loader [rows]="3"></app-skeleton-loader>
        } @else if (items().length === 0) {
          <app-empty-state
            title="Belum Ada Data Delegasi"
            description="Belum ada pelimpahan wewenang delegasi yang tercatat."
          ></app-empty-state>
        } @else {
          <div class="inst-table-wrap">
            <table class="inst-table">
              <thead>
                <tr>
                  <th>Penerima (KBO)</th>
                  <th>NRP</th>
                  <th>Periode (WIB)</th>
                  <th>Cakupan</th>
                  <th>Status Delegasi</th>
                  @if (auth.userRole() === Role.KASAT_NARKOBA) {
                    <th>Aksi</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (d of items(); track d.id) {
                  <tr>
                    <td>
                      <strong>{{ d.keUserPangkat }} {{ d.keUserNama }}</strong>
                    </td>
                    <td class="tabular-nums">{{ d.nrpTujuan }}</td>
                    <td class="tabular-nums">
                      {{ d.tglMulai }} s.d. {{ d.tglSelesai }}
                    </td>
                    <td>
                      {{
                        d.cakupan === CakupanDelegasi.SEMUA
                          ? 'Semua Laporan'
                          : 'Laporan Tertentu (' + (d.laporanIds?.length || 0) + ')'
                      }}
                    </td>
                    <td>
                      <span
                        class="del-badge"
                        [class]="'del-' + getDelegasiStatus(d).toLowerCase()"
                      >
                        {{ formatDelegasiStatus(getDelegasiStatus(d)) }}
                      </span>
                    </td>
                    @if (auth.userRole() === Role.KASAT_NARKOBA) {
                      <td>
                        @if (
                          getDelegasiStatus(d) === 'AKTIF' ||
                          getDelegasiStatus(d) === 'AKAN_DATANG'
                        ) {
                          @if (confirmingRevokeId() === d.id) {
                            <div class="revoke-confirm-inline">
                              <button
                                type="button"
                                class="btn btn-danger btn-sm"
                                (click)="confirmRevoke(d.id)"
                              >
                                Ya, Cabut Sekarang
                              </button>
                              <button
                                type="button"
                                class="btn btn-secondary btn-sm"
                                (click)="confirmingRevokeId.set(null)"
                              >
                                Batal
                              </button>
                            </div>
                          } @else {
                            <button
                              type="button"
                              class="btn btn-danger btn-sm"
                              (click)="confirmingRevokeId.set(d.id)"
                            >
                              Cabut Akses
                            </button>
                          }
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .delegasi-form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }
      @media (min-width: 820px) {
        .delegasi-form-grid {
          grid-template-columns: 1.2fr 1fr;
        }
      }
      .lookup-row {
        display: flex;
        gap: var(--space-2);
      }
      .verified-kbo-box {
        margin-top: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background: var(--status-benar-bg);
        border: 1px solid var(--status-benar-border);
        border-radius: var(--radius-sm);
        .kbo-name {
          font-weight: 700;
          color: var(--status-benar-text);
        }
      }
      .date-range-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
      }
      .laporan-check-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-bg-subtle);
      }
      .check-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-weight: 400 !important;
        cursor: pointer;
      }
      .form-submit-row {
        display: flex;
        justify-content: flex-end;
      }
      .del-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 0.74rem;
        font-weight: 700;
        border-radius: var(--radius-sm);
        border: 1px solid transparent;
      }
      .del-aktif {
        background: var(--status-benar-bg);
        color: var(--status-benar-text);
        border-color: var(--status-benar-border);
      }
      .del-akan_datang {
        background: var(--status-baru-bg);
        color: var(--status-baru-text);
        border-color: var(--status-baru-border);
      }
      .del-selesai {
        background: var(--status-disposisi-bg);
        color: var(--status-disposisi-text);
        border-color: var(--status-disposisi-border);
      }
      .del-dicabut {
        background: var(--status-tidak-benar-bg);
        color: var(--status-tidak-benar-text);
        border-color: var(--status-tidak-benar-border);
      }
      .revoke-confirm-inline {
        display: flex;
        gap: var(--space-2);
      }
    `
  ]
})
export class DelegasiAksesComponent implements OnInit {
  readonly Role = Role;
  readonly CakupanDelegasi = CakupanDelegasi;
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly items = signal<DelegasiDto[]>([]);
  readonly availableLaporan = signal<LaporanDto[]>([]);
  readonly selectedLaporanIds = signal<string[]>([]);
  readonly loading = signal<boolean>(false);

  readonly lookingUp = signal<boolean>(false);
  readonly verifiedKbo = signal<KboLookupDto | null>(null);
  readonly lookupError = signal<string | null>(null);

  readonly submitting = signal<boolean>(false);
  readonly confirmingRevokeId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  private readonly todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  readonly form = this.fb.nonNullable.group({
    nrp: ['', [Validators.required]],
    tgl_mulai: [this.todayStr, [Validators.required]],
    tgl_selesai: [this.todayStr, [Validators.required]],
    cakupan: [CakupanDelegasi.SEMUA, [Validators.required]]
  });

  ngOnInit(): void {
    this.loadDelegasi();
    if (this.auth.userRole() === Role.KASAT_NARKOBA) {
      this.api.get<LaporanDto[]>('/laporan').subscribe({
        next: (res) => this.availableLaporan.set(res.data ?? []),
        error: () => {}
      });
    }
  }

  loadDelegasi(): void {
    this.loading.set(true);
    this.api.get<DelegasiDto[]>('/delegasi').subscribe({
      next: (res) => {
        const list = res.data ?? [];
        this.items.set(list);
        this.loading.set(false);
        if (this.auth.userRole() === Role.KBO) {
          const hasActive = list.some(
            (d) => computeStatusDelegasi(d.tglMulai, d.tglSelesai, d.isRevoked) === 'AKTIF'
          );
          void this.auth.updateDelegationFlag(hasActive);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  clearLookup(): void {
    this.verifiedKbo.set(null);
    this.lookupError.set(null);
  }

  lookupKboNrp(): void {
    const nrp = this.form.controls.nrp.value.trim();
    if (!nrp) return;

    this.lookingUp.set(true);
    this.lookupError.set(null);
    this.verifiedKbo.set(null);

    this.api.get<KboLookupDto>('/users/lookup', { nrp }).subscribe({
      next: (res) => {
        this.lookingUp.set(false);
        this.verifiedKbo.set(res.data ?? null);
      },
      error: () => {
        this.lookingUp.set(false);
        this.lookupError.set('NRP tidak ditemukan atau bukan KBO aktif');
      }
    });
  }

  toggleLaporanSelection(id: string): void {
    const current = this.selectedLaporanIds();
    if (current.includes(id)) {
      this.selectedLaporanIds.set(current.filter((x) => x !== id));
    } else {
      this.selectedLaporanIds.set([...current, id]);
    }
  }

  onSubmitDelegasi(): void {
    if (this.form.invalid || !this.verifiedKbo() || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.api
      .post<DelegasiDto>('/delegasi', {
        nrp: raw.nrp.trim(),
        tgl_mulai: raw.tgl_mulai,
        tgl_selesai: raw.tgl_selesai,
        cakupan: raw.cakupan,
        laporan_ids:
          raw.cakupan === CakupanDelegasi.TERTENTU ? this.selectedLaporanIds() : undefined
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.successMessage.set(res.message || 'Delegasi akses berhasil diaktifkan.');
          this.verifiedKbo.set(null);
          this.selectedLaporanIds.set([]);
          this.loadDelegasi();
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          if (err instanceof HttpErrorResponse) {
            this.errorMessage.set(err.error?.message || 'Gagal membuat delegasi.');
          } else {
            this.errorMessage.set('Gagal membuat delegasi.');
          }
        }
      });
  }

  confirmRevoke(id: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.api.patch<DelegasiDto>(`/delegasi/${id}/cabut`, {}).subscribe({
      next: (res) => {
        this.confirmingRevokeId.set(null);
        this.successMessage.set(res.message || 'Delegasi akses berhasil dicabut.');
        this.loadDelegasi();
      },
      error: (err: unknown) => {
        this.confirmingRevokeId.set(null);
        if (err instanceof HttpErrorResponse) {
          this.errorMessage.set(err.error?.message || 'Gagal mencabut delegasi.');
        }
      }
    });
  }

  getDelegasiStatus(d: DelegasiDto): StatusDelegasiComputed {
    return computeStatusDelegasi(d.tglMulai, d.tglSelesai, d.isRevoked);
  }

  formatDelegasiStatus(st: StatusDelegasiComputed): string {
    switch (st) {
      case 'AKTIF':
        return 'Aktif';
      case 'AKAN_DATANG':
        return 'Akan Datang';
      case 'SELESAI':
        return 'Selesai';
      case 'DICABUT':
        return 'Dicabut';
    }
  }
}
