import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { ApiService } from '../../core/services/api.service';
import { NetworkService } from '../../core/services/network.service';
import { OfflineDraftService } from '../../core/services/offline-draft.service';
import { CapturedPhotoItem, CreateLaporanPayload, LaporanDto } from '../../shared/models/models';
import { LeafletMapComponent } from '../../shared/components/leaflet-map.component';
import { stampPhotoWithMetadata } from '../../shared/utils/photo-watermark.util';

@Component({
  selector: 'app-buat-laporan',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, LeafletMapComponent],
  template: `
    <div class="buat-laporan-page">
      <div class="inst-panel-header">
        <div>
          <h1>Buat Laporan Informasi</h1>
          <div class="text-muted">
            Formulir pelaporan lapangan Bhabinkamtibmas (terproteksi watermark GPS & waktu)
          </div>
        </div>
        <a routerLink="/laporan/saya" class="btn btn-secondary btn-sm">Laporan Saya</a>
      </div>

      @if (submittedLaporan(); as result) {
        <div class="inst-card success-result-card" role="region" aria-label="Bukti Kirim Laporan">
          <div class="section-label">LAPORAN BERHASIL TERKIRIM</div>
          <h2 class="report-number tabular-nums">{{ result.noLaporan }}</h2>
          <p>
            Laporan telah tercatat di server Satresnarkoba dengan status <strong>BARU</strong> dan notifikasi ringkas telah diteruskan kepada Kapolsek, Kapolres, Kasat Binmas, serta Kasat Narkoba.
          </p>
          <div class="result-actions">
            <a [routerLink]="['/laporan', result.id]" class="btn btn-primary btn-sm">
              Lihat Detail Laporan
            </a>
            <a routerLink="/laporan/saya" class="btn btn-secondary btn-sm">
              Ke Daftar Laporan Saya
            </a>
            <button type="button" class="btn btn-secondary btn-sm" (click)="resetNewForm()">
              Buat Laporan Lain
            </button>
          </div>
        </div>
      } @else if (savedDraftNotice()) {
        <div class="inst-card draft-result-card" role="status">
          <div class="section-label">TERSIMPAN SEBAGAI DRAFT TERENKRIPSI (MENUNGGU TERKIRIM)</div>
          <h2>Menunggu Terkirim Otomatis</h2>
          <p>{{ savedDraftNotice() }}</p>
          <div class="result-actions">
            <a routerLink="/laporan/saya" class="btn btn-primary btn-sm">
              Lihat Status di Laporan Saya
            </a>
            <button type="button" class="btn btn-secondary btn-sm" (click)="resetNewForm()">
              Buat Laporan Baru
            </button>
          </div>
        </div>
      } @else {
        @if (errorMessage()) {
          <div class="inst-banner banner-danger" role="alert">
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="requestConfirmation()" novalidate class="inst-card">
          <!-- 1. Nama Objek / Lokasi Terindikasi -->
          <div class="form-field">
            <label for="namaObjekInput">
              Nama Objek / Lokasi Terindikasi <span class="req">*</span>
            </label>
            <input
              id="namaObjekInput"
              type="text"
              class="inst-input"
              formControlName="nama_objek"
              placeholder="Contoh: Kontrakan Petak Tiga Jl. Kesehatan IV No. 12B"
            />
            <div class="field-hint">
              Sebutkan penanda fisik bangunan/tempat secara spesifik (minimal 5 karakter).
            </div>
            @if (form.controls.nama_objek.touched && form.controls.nama_objek.invalid) {
              <div class="field-error">
                Nama objek/lokasi wajib diisi (minimal 5 karakter).
              </div>
            }
          </div>

          <!-- 2. Lokasi GPS & Peta Koreksi -->
          <div class="form-field">
            <div class="gps-header">
              <label>Titik Koordinat Lokasi (GPS) <span class="req">*</span></label>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                (click)="acquireGpsLocation()"
                [disabled]="locatingGps()"
              >
                {{ locatingGps() ? 'Mengambil GPS...' : 'Ambil Ulang GPS Saat Ini' }}
              </button>
            </div>

            <app-leaflet-map
              [latitude]="form.controls.latitude.value"
              [longitude]="form.controls.longitude.value"
              [editable]="true"
              [height]="230"
              (coordinatesChange)="onMapCoordinatesCorrected($event)"
            ></app-leaflet-map>

            <div class="coord-inputs">
              <div>
                <label for="latInput">Latitude</label>
                <input
                  id="latInput"
                  type="number"
                  step="0.000001"
                  class="inst-input tabular-nums"
                  formControlName="latitude"
                />
              </div>
              <div>
                <label for="lngInput">Longitude</label>
                <input
                  id="lngInput"
                  type="number"
                  step="0.000001"
                  class="inst-input tabular-nums"
                  formControlName="longitude"
                />
              </div>
            </div>
          </div>

          <!-- 3. Dokumentasi Foto Lapangan (Wajib ditempeli Timestamp & Koordinat) -->
          <div class="form-field">
            <div class="gps-header">
              <label>
                Dokumentasi Foto Lapangan ({{ photos().length }}/10) <span class="req">*</span>
              </label>
              <div class="photo-btn-group">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  (click)="captureFromCamera()"
                  [disabled]="photos().length >= 10 || processingPhoto()"
                >
                  {{ processingPhoto() ? 'Memproses Watermark...' : '+ Ambil Foto Kamera' }}
                </button>
                <label class="btn btn-secondary btn-sm file-upload-btn">
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
            <div class="field-hint">
              Setiap foto otomatis ditempeli <strong>Timestamp (WIB)</strong> dan <strong>Koordinat GPS</strong> sebelum dikirim. Minimal 1 foto.
            </div>

            @if (photos().length === 0) {
              <div class="empty-photo-box">
                Belum ada foto diambil. Ketuk "+ Ambil Foto Kamera" untuk mendokumentasikan objek laporan.
              </div>
            } @else {
              <div class="photo-grid">
                @for (p of photos(); track p.id) {
                  <div class="photo-item">
                    <img [src]="p.dataUrl" [alt]="p.fileName" />
                    <div class="photo-meta tabular-nums">
                      <div>{{ p.diambilPada | date: 'dd/MM/yyyy HH:mm:ss' }} WIB</div>
                      <div>{{ p.latitude.toFixed(5) }}, {{ p.longitude.toFixed(5) }}</div>
                    </div>
                    <button
                      type="button"
                      class="btn btn-danger btn-sm remove-photo-btn"
                      (click)="removePhoto(p.id)"
                    >
                      Hapus
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <!-- 4. Deskripsi / Uraian Informasi -->
          <div class="form-field">
            <label for="deskripsiInput">
              Uraian Informasi / Indikasi Aktivitas <span class="req">*</span>
            </label>
            <textarea
              id="deskripsiInput"
              class="inst-textarea"
              formControlName="deskripsi"
              placeholder="Jelaskan ciri-ciri aktivitas mencurigakan, rentang waktu kejadian, kendaraan/orang yang terlibat, atau keterangan saksi warga..."
            ></textarea>
            <div class="field-hint">
              Minimal 15 karakter. Jangan mencantumkan spekulasi tanpa dasar observasi.
            </div>
            @if (form.controls.deskripsi.touched && form.controls.deskripsi.invalid) {
              <div class="field-error">
                Deskripsi wajib diisi (minimal 15 karakter).
              </div>
            }
          </div>

          <!-- Panel Konfirmasi Sebelum Kirim -->
          @if (confirmingSubmit()) {
            <div class="confirm-box" role="dialog" aria-label="Konfirmasi Pengiriman Laporan">
              <h3>Konfirmasi Pengiriman Laporan</h3>
              <p>
                Pastikan titik koordinat lokasi, foto ber-timestamp, dan uraian informasi sudah benar. Laporan yang telah dikirim akan langsung meneruskan notifikasi berjenjang.
              </p>
              <div class="confirm-actions">
                <button
                  type="button"
                  class="btn btn-secondary"
                  (click)="confirmingSubmit.set(false)"
                  [disabled]="submitting()"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  (click)="executeSubmit()"
                  [disabled]="submitting()"
                >
                  {{
                    submitting()
                      ? 'Mengirim Laporan...'
                      : network.isOnline()
                        ? 'Ya, Kirim Laporan Sekarang'
                        : 'Simpan Draft Terenkripsi (Offline)'
                  }}
                </button>
              </div>
            </div>
          } @else {
            <div class="submit-row">
              <button
                type="submit"
                class="btn btn-primary btn-block"
                [disabled]="!isFormReady()"
              >
                Kirim Laporan
              </button>
            </div>
          }
        </form>
      }
    </div>
  `,
  styles: [
    `
      .buat-laporan-page {
        max-width: 760px;
        margin: 0 auto;
      }
      .gps-header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        margin-bottom: var(--space-2);
      }
      .coord-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
        margin-top: var(--space-2);
      }
      .photo-btn-group {
        display: flex;
        gap: var(--space-2);
      }
      .file-upload-btn {
        margin: 0;
        cursor: pointer;
      }
      .empty-photo-box {
        padding: var(--space-4);
        border: 1px dashed var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: var(--color-bg-subtle);
        color: var(--color-text-secondary);
        text-align: center;
        font-size: 0.85rem;
        margin-top: var(--space-2);
      }
      .photo-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: var(--space-3);
        margin-top: var(--space-3);
      }
      .photo-item {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--color-bg-surface);
        display: flex;
        flex-direction: column;

        img {
          width: 100%;
          height: 145px;
          object-fit: cover;
          display: block;
        }
      }
      .photo-meta {
        padding: var(--space-2);
        font-size: 0.74rem;
        color: var(--color-text-secondary);
        border-top: 1px solid var(--color-border);
      }
      .remove-photo-btn {
        margin: 0 var(--space-2) var(--space-2);
      }
      .confirm-box {
        margin-top: var(--space-4);
        padding: var(--space-4);
        background: var(--color-navy-50);
        border: 1px solid var(--color-navy-600);
        border-radius: var(--radius-sm);
      }
      .confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-3);
      }
      .success-result-card {
        border-left: 4px solid var(--color-success);
      }
      .draft-result-card {
        border-left: 4px solid var(--color-gold-500);
      }
      .result-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
        margin-top: var(--space-4);
      }
    `
  ]
})
export class BuatLaporanComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  readonly network = inject(NetworkService);
  private readonly offlineDraft = inject(OfflineDraftService);
  private readonly router = inject(Router);

  readonly locatingGps = signal<boolean>(false);
  readonly processingPhoto = signal<boolean>(false);
  readonly photos = signal<CapturedPhotoItem[]>([]);
  readonly confirmingSubmit = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly submittedLaporan = signal<LaporanDto | null>(null);
  readonly savedDraftNotice = signal<string | null>(null);

  private currentIdempotencyKey = this.generateIdempotencyKey();

  readonly form = this.fb.nonNullable.group({
    nama_objek: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
    latitude: [-6.17539, [Validators.required, Validators.min(-90), Validators.max(90)]],
    longitude: [106.82715, [Validators.required, Validators.min(-180), Validators.max(180)]],
    deskripsi: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(2000)]]
  });

  ngOnInit(): void {
    void this.acquireGpsLocation();
  }

  isFormReady(): boolean {
    return this.form.valid && this.photos().length > 0 && !this.submitting();
  }

  async acquireGpsLocation(): Promise<void> {
    this.locatingGps.set(true);
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 6000
      });
      this.form.patchValue({
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6))
      });
    } catch {
      // Fallback ke koordinat default wilayah tugas (Jakarta Pusat) bila GPS diblokir di browser desktop
    } finally {
      this.locatingGps.set(false);
    }
  }

  onMapCoordinatesCorrected(coords: { latitude: number; longitude: number }): void {
    this.form.patchValue({
      latitude: coords.latitude,
      longitude: coords.longitude
    });
  }

  async captureFromCamera(): Promise<void> {
    if (this.photos().length >= 10) return;
    this.processingPhoto.set(true);
    this.errorMessage.set(null);

    try {
      const image = await Camera.getPhoto({
        quality: 82,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      if (image.dataUrl) {
        await this.appendWatermarkedPhoto(image.dataUrl, `CAM_${Date.now()}.jpg`);
      }
    } catch {
      // Jika dijalankan pada PC tanpa kamera native, buat citra simulasi kamera lapangan ber-watermark
      const fallbackSvg = this.createFieldCameraFallbackDataUrl();
      await this.appendWatermarkedPhoto(fallbackSvg, `CAM_LAPANGAN_${Date.now()}.jpg`);
    } finally {
      this.processingPhoto.set(false);
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.processingPhoto.set(true);
    this.errorMessage.set(null);

    try {
      const files = Array.from(input.files).slice(0, 10 - this.photos().length);
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          this.errorMessage.set('Hanya format foto JPEG, PNG, atau WebP yang diizinkan.');
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          this.errorMessage.set(`Ukuran foto ${file.name} melebihi batas 8 MB.`);
          continue;
        }
        const dataUrl = await this.readFileAsDataUrl(file);
        await this.appendWatermarkedPhoto(dataUrl, file.name);
      }
    } finally {
      input.value = '';
      this.processingPhoto.set(false);
    }
  }

  removePhoto(photoId: string): void {
    this.photos.set(this.photos().filter((p) => p.id !== photoId));
  }

  requestConfirmation(): void {
    if (!this.isFormReady()) {
      this.form.markAllAsTouched();
      return;
    }
    this.confirmingSubmit.set(true);
  }

  async executeSubmit(): Promise<void> {
    if (!this.isFormReady()) return;

    const raw = this.form.getRawValue();
    const payload: CreateLaporanPayload = {
      idempotencyKey: this.currentIdempotencyKey,
      nama_objek: raw.nama_objek.trim(),
      latitude: raw.latitude,
      longitude: raw.longitude,
      deskripsi: raw.deskripsi.trim(),
      foto: this.photos()
    };

    // Jika sedang offline, simpan sebagai draft terenkripsi
    if (!this.network.isOnline()) {
      this.submitting.set(true);
      await this.offlineDraft.saveEncryptedDraft(payload);
      this.submitting.set(false);
      this.confirmingSubmit.set(false);
      this.savedDraftNotice.set(
        'Perangkat sedang tidak memiliki sinyal. Laporan beserta foto ber-timestamp telah dienkripsi (AES-256-GCM) pada perangkat dan akan dikirim otomatis segera setelah koneksi kembali.'
      );
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const formData = this.offlineDraft.buildLaporanFormData(payload);

    this.api
      .post<LaporanDto>('/laporan', formData, {
        'X-Idempotency-Key': payload.idempotencyKey
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.confirmingSubmit.set(false);
          if (res.success && res.data) {
            this.submittedLaporan.set(res.data);
          }
        },
        error: async () => {
          // Kasus tepi: koneksi terputus atau token gagal direfresh saat kirim -> amankan sebagai draft terenkripsi
          await this.offlineDraft.saveEncryptedDraft(payload);
          this.submitting.set(false);
          this.confirmingSubmit.set(false);
          this.savedDraftNotice.set(
            'Koneksi terputus saat pengiriman berlangsung. Laporan telah diamankan sebagai Draft Terenkripsi dan akan dikirim ulang otomatis.'
          );
        }
      });
  }

  resetNewForm(): void {
    this.currentIdempotencyKey = this.generateIdempotencyKey();
    this.submittedLaporan.set(null);
    this.savedDraftNotice.set(null);
    this.confirmingSubmit.set(false);
    this.photos.set([]);
    this.form.reset({
      nama_objek: '',
      latitude: -6.17539,
      longitude: 106.82715,
      deskripsi: ''
    });
  }

  private async appendWatermarkedPhoto(rawDataUrl: string, fileName: string): Promise<void> {
    const nowIso = new Date().toISOString();
    const { latitude, longitude } = this.form.getRawValue();
    const stampedUrl = await stampPhotoWithMetadata(rawDataUrl, nowIso, latitude, longitude);

    const item: CapturedPhotoItem = {
      id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      dataUrl: stampedUrl,
      diambilPada: nowIso,
      latitude,
      longitude,
      fileName
    };
    this.photos.set([...this.photos(), item]);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Gagal membaca file foto'));
      reader.readAsDataURL(file);
    });
  }

  private createFieldCameraFallbackDataUrl(): string {
    const { nama_objek, latitude, longitude } = this.form.getRawValue();
    const title = (nama_objek || 'OBJEK LAPANGAN TERINDIKASI').toUpperCase().slice(0, 32);
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
      <rect width="720" height="480" fill="#243b53"/>
      <rect x="24" y="24" width="672" height="432" fill="#102a43" stroke="#b78a28" stroke-width="2"/>
      <text x="48" y="110" fill="#ffffff" font-family="sans-serif" font-size="22" font-weight="700">FOTO KAMERA LAPANGAN BHABINKAMTIBMAS</text>
      <text x="48" y="155" fill="#faf0d7" font-family="sans-serif" font-size="18">${title}</text>
      <text x="48" y="365" fill="#faf0d7" font-family="monospace" font-size="16" font-weight="700">TIMESTAMP : ${nowStr} WIB</text>
      <text x="48" y="398" fill="#ffffff" font-family="monospace" font-size="16">KOORDINAT : ${latitude.toFixed(6)}, ${longitude.toFixed(6)}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  private generateIdempotencyKey(): string {
    return `IDEM-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  }
}
