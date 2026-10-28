import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ApiService } from '../../core/services/api.service';
import { HasilPenyidikan, LaporanDto, PenyidikanDto } from '../../shared/models/models';
import { stampPhotoWithMetadata } from '../../shared/utils/photo-watermark.util';

@Component({
  selector: 'app-form-penyidikan',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="form-penyidikan-page">
      <div class="inst-panel-header">
        <div>
          <h1>Laporan Hasil Penyidikan</h1>
          @if (laporan(); as lap) {
            <div class="text-muted tabular-nums">
              Nomor Laporan: <strong>{{ lap.noLaporan }}</strong> — {{ lap.namaObjek }}
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

      @if (laporan()?.penyidikan) {
        <!-- Kasus tepi: Penyidik mencoba mengisi hasil dua kali -> ditolak -->
        <div class="inst-card locked-card" role="alert">
          <h2>Hasil Penyidikan Telah Terkirim</h2>
          <p>
            Sesuai aturan prosedur penyidikan, hasil penyidikan hanya dapat dikirimkan <strong>satu kali</strong> per disposisi dan tidak dapat diubah kembali.
          </p>
          <a [routerLink]="['/laporan', laporan()!.id]" class="btn btn-primary btn-sm">
            Lihat Detail Hasil Penyidikan
          </a>
        </div>
      } @else {
        @if (laporan(); as lap) {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="inst-card">
          <!-- Pilihan Tegas Status Benar / Tidak Benar -->
          <div class="form-field">
            <label>Kesimpulan Hasil Penyidikan Lapangan <span class="req">*</span></label>
            <div class="hasil-choice-grid" role="radiogroup" aria-label="Status Hasil Penyidikan">
              <button
                type="button"
                class="choice-card choice-benar"
                [class.selected]="form.controls.hasil.value === HasilPenyidikan.BENAR"
                (click)="selectHasil(HasilPenyidikan.BENAR)"
              >
                <div class="choice-title">BENAR (TERBUKTI)</div>
                <div class="choice-desc">
                  Informasi terbukti benar di lapangan. Status laporan menjadi <strong>Selesai – Benar</strong>.
                </div>
              </button>

              <button
                type="button"
                class="choice-card choice-tidak-benar"
                [class.selected]="form.controls.hasil.value === HasilPenyidikan.TIDAK_BENAR"
                (click)="selectHasil(HasilPenyidikan.TIDAK_BENAR)"
              >
                <div class="choice-title">TIDAK BENAR (TIDAK TERBUKTI)</div>
                <div class="choice-desc">
                  Tidak ditemukan indikasi tindak pidana narkoba. Status laporan menjadi <strong>Selesai – Tidak Benar</strong>.
                </div>
              </button>
            </div>
          </div>

          <!-- Foto Bukti Hasil Penyidikan (bisa banyak) -->
          <div class="form-field">
            <div class="photo-head">
              <label>Dokumentasi Foto Penyidikan ({{ photoUrls().length }}/10)</label>
              <div class="photo-btns">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="addCameraPhoto()"
                  [disabled]="photoUrls().length >= 10"
                >
                  + Ambil Foto Kamera
                </button>
                <label class="btn btn-secondary btn-sm" style="cursor: pointer; margin: 0;">
                  Pilih File Foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    hidden
                    (change)="onFileSelected($event)"
                  />
                </label>
              </div>
            </div>

            @if (photoUrls().length > 0) {
              <div class="photo-preview-grid">
                @for (url of photoUrls(); track $index) {
                  <div class="preview-box">
                    <img [src]="url" alt="Bukti Penyidikan" />
                    <button
                      type="button"
                      class="btn btn-danger btn-sm"
                      (click)="removePhotoAt($index)"
                    >
                      Hapus
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Uraian Lengkap Hasil Penyidikan -->
          <div class="form-field">
            <label for="deskripsiSidik">
              Uraian Lengkap Tindakan & Hasil Penyidikan <span class="req">*</span>
            </label>
            <textarea
              id="deskripsiSidik"
              class="inst-textarea"
              formControlName="deskripsi"
              placeholder="Uraikan kronologi penyelidikan di lokasi, saksi yang ditemui, barang bukti yang diamankan (jika terbukti), atau hasil observasi lapangan..."
            ></textarea>
            @if (form.controls.deskripsi.touched && form.controls.deskripsi.invalid) {
              <div class="field-error">
                Uraian hasil penyidikan wajib diisi (minimal 15 karakter).
              </div>
            }
          </div>

          <div class="inst-banner banner-warning">
            <span>
              <strong>Perhatian:</strong> Hasil penyidikan yang sudah dikirim bersifat final dan tidak dapat dikirim dua kali.
            </span>
          </div>

          <div class="submit-actions">
            <a [routerLink]="['/laporan', lap.id]" class="btn btn-secondary">Batal</a>
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="form.invalid || submitting()"
            >
              {{ submitting() ? 'Menyimpan Hasil...' : 'Kirim Hasil Penyidikan' }}
            </button>
          </div>
        </form>
        }
      }
    </div>
  `,
  styles: [
    `
      .form-penyidikan-page {
        max-width: 720px;
        margin: 0 auto;
      }
      .hasil-choice-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
        margin-top: var(--space-2);
      }
      .choice-card {
        text-align: left;
        padding: var(--space-3) var(--space-4);
        border-radius: var(--radius-sm);
        border: 2px solid var(--color-border-strong);
        background: var(--color-bg-surface);
        cursor: pointer;
        font-family: var(--font-sans);

        .choice-title {
          font-weight: 800;
          font-size: 0.9rem;
          margin-bottom: 4px;
        }
        .choice-desc {
          font-size: 0.78rem;
          color: var(--color-text-secondary);
        }

        &.choice-benar.selected {
          background: var(--status-benar-bg);
          border-color: var(--status-benar-text);
          .choice-title {
            color: var(--status-benar-text);
          }
        }

        &.choice-tidak-benar.selected {
          background: var(--status-tidak-benar-bg);
          border-color: var(--status-tidak-benar-text);
          .choice-title {
            color: var(--status-tidak-benar-text);
          }
        }
      }
      .photo-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-2);
      }
      .photo-btns {
        display: flex;
        gap: var(--space-2);
      }
      .photo-preview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: var(--space-3);
        margin-top: var(--space-3);
      }
      .preview-box {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        padding-bottom: var(--space-2);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        img {
          width: 100%;
          height: 130px;
          object-fit: cover;
        }
        button {
          margin: 0 var(--space-2);
        }
      }
      .submit-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
      }
      .locked-card {
        border-left: 4px solid var(--color-gold-500);
      }
    `
  ]
})
export class FormPenyidikanComponent implements OnInit {
  readonly HasilPenyidikan = HasilPenyidikan;
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);

  readonly laporan = signal<LaporanDto | null>(null);
  readonly photoUrls = signal<string[]>([]);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    hasil: [HasilPenyidikan.BENAR, [Validators.required]],
    deskripsi: ['', [Validators.required, Validators.minLength(15)]]
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.api.get<LaporanDto>(`/laporan/${id}`).subscribe({
        next: (res) => this.laporan.set(res.data ?? null)
      });
    }
  }

  selectHasil(val: HasilPenyidikan): void {
    this.form.controls.hasil.setValue(val);
  }

  async addCameraPhoto(): Promise<void> {
    if (this.photoUrls().length >= 10) return;
    try {
      const img = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (img.dataUrl) {
        const stamped = await stampPhotoWithMetadata(
          img.dataUrl,
          new Date().toISOString(),
          this.laporan()?.latitude ?? -6.17539,
          this.laporan()?.longitude ?? 106.82715,
          'BUKTI PENYIDIKAN'
        );
        this.photoUrls.set([...this.photoUrls(), stamped]);
      }
    } catch {
      const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
        <rect width="640" height="420" fill="#102a43"/>
        <text x="36" y="120" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="700">DOKUMENTASI PENYIDIKAN LAPANGAN</text>
        <text x="36" y="340" fill="#faf0d7" font-family="monospace" font-size="15">WAKTU AMBIL: ${nowStr} WIB</text>
      </svg>`;
      const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
      this.photoUrls.set([...this.photoUrls(), dataUrl]);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    for (const file of Array.from(input.files).slice(0, 10 - this.photoUrls().length)) {
      const reader = new FileReader();
      const rawUrl: string = await new Promise((resolve) => {
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const stamped = await stampPhotoWithMetadata(
        rawUrl,
        new Date().toISOString(),
        this.laporan()?.latitude ?? -6.17539,
        this.laporan()?.longitude ?? 106.82715,
        'BUKTI PENYIDIKAN'
      );
      this.photoUrls.set([...this.photoUrls(), stamped]);
    }
    input.value = '';
  }

  removePhotoAt(index: number): void {
    this.photoUrls.set(this.photoUrls().filter((_, i) => i !== index));
  }

  onSubmit(): void {
    const lap = this.laporan();
    if (!lap || this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { hasil, deskripsi } = this.form.getRawValue();
    const fd = new FormData();
    fd.append('hasil', hasil);
    fd.append('deskripsi', deskripsi.trim());
    fd.append('foto_json', JSON.stringify(this.photoUrls()));

    this.api.post<PenyidikanDto>(`/laporan/${lap.id}/penyidikan`, fd).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/laporan', lap.id]);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse) {
          this.errorMessage.set(err.error?.message || 'Gagal menyimpan hasil penyidikan.');
        } else {
          this.errorMessage.set('Gagal menyimpan hasil penyidikan.');
        }
      }
    });
  }
}
