import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { DisposisiDto, LaporanDto, PenyidikOptionDto } from '../../shared/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

@Component({
  selector: 'app-form-disposisi',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, StatusBadgeComponent],
  template: `
    <div class="form-disposisi-page">
      <div class="inst-panel-header">
        <div>
          <h1>Disposisi Laporan ke Penyidik</h1>
          @if (laporan(); as lap) {
            <div class="text-muted tabular-nums">
              Nomor Laporan: <strong>{{ lap.noLaporan }}</strong> — {{ lap.wilayah }}
            </div>
          }
        </div>
        @if (laporan(); as lap) {
          <a [routerLink]="['/laporan', lap.id]" class="btn btn-secondary btn-sm">
            Kembali ke Detail
          </a>
        }
      </div>

      @if (errorMessage()) {
        <div class="inst-banner banner-danger" role="alert">
          <span>{{ errorMessage() }}</span>
        </div>
      }

      @if (laporan(); as lap) {
        <div class="inst-card summary-card">
          <div class="summary-top">
            <div>
              <div class="section-label">OBJEK LAPORAN</div>
              <strong>{{ lap.namaObjek }}</strong>
            </div>
            <app-status-badge [status]="lap.status"></app-status-badge>
          </div>
          <p class="summary-desc">{{ lap.deskripsi }}</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="requestConfirmation()" novalidate class="inst-card">
          <div class="form-field">
            <label for="penyidikSelect">Pilih Penyidik Tujuan <span class="req">*</span></label>
            <select id="penyidikSelect" class="inst-select" formControlName="ke_user_id">
              <option value="">-- Pilih Penyidik / Kanit Lidik Aktif --</option>
              @for (p of penyidikList(); track p.id) {
                <option [value]="p.id">
                  {{ p.pangkat }} {{ p.nama }} (NRP {{ p.nrp }}) — {{ p.jabatan }} [Aktif: {{ p.aktifDisposisiCount }}]
                </option>
              }
            </select>
            @if (form.controls.ke_user_id.touched && form.controls.ke_user_id.invalid) {
              <div class="field-error">Penyidik tujuan wajib dipilih.</div>
            }
          </div>

          <div class="form-field">
            <label for="catatanDisposisi">Catatan / Instruksi Disposisi <span class="req">*</span></label>
            <textarea
              id="catatanDisposisi"
              class="inst-textarea"
              formControlName="catatan"
              placeholder="Tuliskan arahan penyelidikan lapangan, koordinasi wilayah, atau target waktu pelaporan..."
            ></textarea>
            @if (form.controls.catatan.touched && form.controls.catatan.invalid) {
              <div class="field-error">Catatan instruksi disposisi wajib diisi (minimal 10 karakter).</div>
            }
          </div>

          @if (confirming()) {
            <div class="confirm-panel" role="dialog" aria-label="Konfirmasi Disposisi">
              <h3>Konfirmasi Penugasan Disposisi</h3>
              <p>
                Status laporan <strong>{{ lap.noLaporan }}</strong> akan berubah menjadi <strong>DIDISPOSISI</strong> dan notifikasi penugasan akan dikirimkan kepada Penyidik terpilih.
              </p>
              <div class="confirm-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="confirming.set(false)"
                  [disabled]="submitting()"
                >
                  Batal
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="submitDisposisi()"
                  [disabled]="submitting()"
                >
                  {{ submitting() ? 'Memproses Disposisi...' : 'Ya, Disposisikan Sekarang' }}
                </button>
              </div>
            </div>
          } @else {
            <div class="form-actions">
              <a [routerLink]="['/laporan', lap.id]" class="btn btn-secondary">Batal</a>
              <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
                Disposisikan
              </button>
            </div>
          }
        </form>
      }
    </div>
  `,
  styles: [
    `
      .form-disposisi-page {
        max-width: 680px;
        margin: 0 auto;
      }
      .summary-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .summary-desc {
        margin: var(--space-2) 0 0 0;
        color: var(--color-text-secondary);
        font-size: 0.85rem;
      }
      .form-actions,
      .confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-3);
      }
      .confirm-panel {
        padding: var(--space-3) var(--space-4);
        background: var(--color-navy-50);
        border: 1px solid var(--color-navy-600);
        border-radius: var(--radius-sm);
      }
    `
  ]
})
export class FormDisposisiComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  readonly laporan = signal<LaporanDto | null>(null);
  readonly penyidikList = signal<PenyidikOptionDto[]>([]);
  readonly confirming = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    ke_user_id: ['', [Validators.required]],
    catatan: ['', [Validators.required, Validators.minLength(10)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.api.get<LaporanDto>(`/laporan/${id}`).subscribe({
        next: (res) => this.laporan.set(res.data ?? null)
      });
    }
    this.api.get<PenyidikOptionDto[]>('/penyidik').subscribe({
      next: (res) => this.penyidikList.set(res.data ?? [])
    });
  }

  requestConfirmation(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirming.set(true);
  }

  submitDisposisi(): void {
    const lap = this.laporan();
    if (!lap || this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.api
      .post<DisposisiDto>(`/laporan/${lap.id}/disposisi`, this.form.getRawValue())
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigate(['/laporan', lap.id]);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.confirming.set(false);
          if (err instanceof HttpErrorResponse) {
            this.errorMessage.set(err.error?.message || 'Gagal menyimpan disposisi.');
          } else {
            this.errorMessage.set('Gagal menyimpan disposisi.');
          }
        }
      });
  }
}
