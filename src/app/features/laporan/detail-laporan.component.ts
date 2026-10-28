import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { FlagSecureService } from '../../core/services/flag-secure.service';
import { SecureStorageService } from '../../core/services/secure-storage.service';
import {
  LaporanDto,
  LaporanFotoDto,
  Role,
  StatusLaporan
} from '../../shared/models/models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { LeafletMapComponent } from '../../shared/components/leaflet-map.component';

@Component({
  selector: 'app-detail-laporan',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    StatusBadgeComponent,
    SkeletonLoaderComponent,
    LeafletMapComponent
  ],
  template: `
    <div class="detail-laporan-page">
      <div class="flag-secure-banner" role="status">
        <span>
          <strong>PROTEKSI LAYAR AKTIF (FLAG_SECURE):</strong> Tangkapan layar (screenshot) diblokir dan pembukaan detail beserta foto dicatat otomatis ke Jejak Audit.
        </span>
      </div>

      @if (loading()) {
        <app-skeleton-loader [rows]="5"></app-skeleton-loader>
      } @else {
        @if (laporan(); as lap) {
          <div class="inst-panel-header">
          <div>
            <div class="top-meta">
              <h1 class="report-number tabular-nums">{{ lap.noLaporan }}</h1>
              <app-status-badge [status]="lap.status"></app-status-badge>
            </div>
            <div class="text-muted tabular-nums">
              Dilaporkan pada {{ lap.waktuLapor | date: 'dd/MM/yyyy HH:mm:ss' }} WIB • {{ lap.satuanNama }} ({{ lap.wilayah }})
            </div>
          </div>

          <div class="role-actions">
            @if (canDispose()) {
              <a [routerLink]="['/disposisi/form', lap.id]" class="btn btn-primary">
                Disposisikan
              </a>
            }
            @if (canFillPenyidikan()) {
              <a [routerLink]="['/penyidikan/form', lap.id]" class="btn btn-primary">
                Isi Hasil Penyidikan
              </a>
            }
          </div>
        </div>

        <div class="detail-grid">
          <!-- Kolom Kiri: Informasi Utama, Peta Lokasi, Galeri Foto Signed URL -->
          <div class="detail-main-col">
            <div class="inst-card">
              <div class="section-label">INFORMASI OBJEK & PELAPOR</div>
              <dl class="info-list">
                <div class="info-row">
                  <dt>Nama Objek / Tempat</dt>
                  <dd><strong>{{ lap.namaObjek }}</strong></dd>
                </div>
                <div class="info-row">
                  <dt>Wilayah Hukum</dt>
                  <dd>{{ lap.wilayah }} — {{ lap.satuanNama }}</dd>
                </div>
                <div class="info-row">
                  <dt>Personel Pelapor</dt>
                  <dd class="tabular-nums">
                    {{ lap.pelaporPangkat }} {{ lap.pelaporNama }} (NRP {{ lap.pelaporNrp }})
                  </dd>
                </div>
                <div class="info-row">
                  <dt>Uraian Informasi</dt>
                  <dd class="desc-text">{{ lap.deskripsi }}</dd>
                </div>
              </dl>
            </div>

            <!-- Peta Lokasi -->
            @if (lap.latitude !== undefined && lap.longitude !== undefined) {
              <div class="inst-card">
                <div class="section-label" style="margin-bottom: 8px;">PETA LOKASI OBJEK</div>
                <app-leaflet-map
                  [latitude]="lap.latitude"
                  [longitude]="lap.longitude"
                  [editable]="false"
                  [height]="240"
                ></app-leaflet-map>
              </div>
            }

            <!-- Galeri Foto Lapangan (Signed URL Berumur Pendek, Tanpa Cache Permanen) -->
            <div class="inst-card">
              <div class="inst-panel-header">
                <div>
                  <div class="section-label">GALERI FOTO LAPANGAN (SIGNED URL 60 DETIK)</div>
                  <div class="text-muted">
                    Foto tidak disimpan pada cache permanen perangkat.
                  </div>
                </div>
              </div>

              @if (!lap.foto || lap.foto.length === 0) {
                <div class="text-muted">Tidak ada lampiran foto pada laporan ini.</div>
              } @else {
                <div class="photo-gallery">
                  @for (f of lap.foto; track f.id) {
                    <div class="gallery-item">
                      <img
                        [src]="f.signedUrl"
                        alt="Dokumentasi Objek Laporan"
                        referrerpolicy="no-referrer"
                      />
                      <div class="gallery-meta tabular-nums">
                        <div>Diambil: {{ f.diambilPada | date: 'dd/MM/yyyy HH:mm:ss' }} WIB</div>
                        <div>Koordinat: {{ f.latitude.toFixed(6) }}, {{ f.longitude.toFixed(6) }}</div>
                        <div class="mono-code">SHA-256: {{ f.hashFile.slice(0, 20) }}...</div>
                      </div>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        (click)="refreshSignedPhoto(lap.id, f.id)"
                      >
                        Perbarui Signed URL
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <!-- Kolom Kanan: Timeline Riwayat Disposisi & Hasil Penyidikan -->
          <div class="detail-side-col">
            <div class="inst-card">
              <div class="section-label" style="margin-bottom: 12px;">
                RIWAYAT DISPOSISI & PENYIDIKAN
              </div>

              <div class="timeline">
                <!-- 1. Laporan Dibuat -->
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-body">
                    <div class="timeline-time tabular-nums">
                      {{ lap.waktuLapor | date: 'dd/MM/yyyy HH:mm' }} WIB
                    </div>
                    <div class="timeline-title">Laporan Informasi Dibuat</div>
                    <div class="timeline-desc">
                      Oleh {{ lap.pelaporPangkat }} {{ lap.pelaporNama }} (NRP {{ lap.pelaporNrp }})
                    </div>
                  </div>
                </div>

                <!-- 2. Riwayat Disposisi -->
                @for (d of lap.riwayatDisposisi ?? []; track d.id) {
                  <div class="timeline-item">
                    <div class="timeline-dot dot-disposisi"></div>
                    <div class="timeline-body">
                      <div class="timeline-time tabular-nums">
                        {{ d.waktuDisposisi | date: 'dd/MM/yyyy HH:mm' }} WIB
                      </div>
                      <div class="timeline-title">
                        Didisposisikan ke {{ d.keUserPangkat }} {{ d.keUserNama }} (NRP {{ d.keUserNrp }})
                      </div>
                      <div class="timeline-desc">
                        Oleh: {{ d.dariUserPangkat }} {{ d.dariUserNama }}
                      </div>
                      <div class="timeline-note">
                        <strong>Instruksi:</strong> "{{ d.catatan }}"
                      </div>
                    </div>
                  </div>
                }

                <!-- 3. Hasil Penyidikan -->
                @if (lap.penyidikan; as sidik) {
                  <div class="timeline-item">
                    <div
                      class="timeline-dot"
                      [class.dot-benar]="sidik.hasil === 'BENAR'"
                      [class.dot-tidak-benar]="sidik.hasil === 'TIDAK_BENAR'"
                    ></div>
                    <div class="timeline-body">
                      <div class="timeline-time tabular-nums">
                        {{ sidik.waktuSelesai | date: 'dd/MM/yyyy HH:mm' }} WIB
                      </div>
                      <div class="timeline-title">
                        Hasil Penyidikan:
                        <strong>
                          {{ sidik.hasil === 'BENAR' ? 'BENAR (Terbukti)' : 'TIDAK BENAR' }}
                        </strong>
                      </div>
                      <div class="timeline-desc">
                        Penyidik: {{ sidik.penyidikPangkat }} {{ sidik.penyidikNama }} (NRP {{ sidik.penyidikNrp }})
                      </div>
                      <div class="timeline-note">
                        {{ sidik.deskripsi }}
                      </div>

                      @if (sidik.foto && sidik.foto.length > 0) {
                        <div class="sidik-photos">
                          @for (sf of sidik.foto; track sf.id) {
                            <img [src]="sf.signedUrl" alt="Foto Hasil Penyidikan" />
                          }
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="timeline-empty">
                    Belum ada hasil akhir penyidikan yang dilaporkan.
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .flag-secure-banner {
        background: var(--color-navy-900);
        color: var(--color-gold-100);
        border-left: 4px solid var(--color-gold-500);
        padding: 8px var(--space-3);
        font-size: 0.78rem;
        border-radius: var(--radius-sm);
        margin-bottom: var(--space-4);
      }
      .top-meta {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: 4px;
      }
      .role-actions {
        display: flex;
        gap: var(--space-2);
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-4);
      }
      @media (min-width: 960px) {
        .detail-grid {
          grid-template-columns: 1.45fr 1fr;
        }
      }
      .info-list {
        margin: var(--space-3) 0 0 0;
      }
      .info-row {
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-border);
        &:last-child {
          border-bottom: none;
        }
        dt {
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          text-transform: uppercase;
        }
        dd {
          margin: 4px 0 0 0;
          font-size: 0.92rem;
        }
      }
      .desc-text {
        white-space: pre-line;
        line-height: 1.55;
      }
      .photo-gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: var(--space-3);
      }
      .gallery-item {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        padding-bottom: var(--space-2);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);

        img {
          width: 100%;
          height: 165px;
          object-fit: cover;
        }
        .gallery-meta {
          padding: 0 var(--space-2);
          font-size: 0.74rem;
          color: var(--color-text-secondary);
        }
        button {
          margin: 0 var(--space-2);
        }
      }
      /* Timeline */
      .timeline {
        position: relative;
        padding-left: var(--space-4);
        border-left: 2px solid var(--color-border-strong);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
      }
      .timeline-item {
        position: relative;
      }
      .timeline-dot {
        position: absolute;
        left: -21px;
        top: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--color-navy-900);
        border: 2px solid #ffffff;
      }
      .dot-disposisi {
        background: var(--color-gold-500);
      }
      .dot-benar {
        background: var(--color-success);
      }
      .dot-tidak-benar {
        background: var(--color-danger);
      }
      .timeline-time {
        font-size: 0.74rem;
        color: var(--color-text-secondary);
      }
      .timeline-title {
        font-weight: 700;
        font-size: 0.88rem;
        margin: 2px 0;
      }
      .timeline-desc {
        font-size: 0.8rem;
        color: var(--color-text-secondary);
      }
      .timeline-note {
        margin-top: var(--space-2);
        padding: var(--space-2) var(--space-3);
        background: var(--color-navy-50);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        font-size: 0.82rem;
      }
      .sidik-photos {
        margin-top: var(--space-2);
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-2);
        img {
          width: 100%;
          border-radius: var(--radius-sm);
          border: 1px solid var(--color-border);
        }
      }
      .timeline-empty {
        font-size: 0.82rem;
        color: var(--color-text-secondary);
        font-style: italic;
      }
    `
  ]
})
export class DetailLaporanComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly flagSecure = inject(FlagSecureService);
  private readonly secureStorage = inject(SecureStorageService);

  readonly laporan = signal<LaporanDto | null>(null);
  readonly loading = signal<boolean>(false);

  readonly canDispose = computed(() => {
    const lap = this.laporan();
    const user = this.auth.currentUser();
    if (!lap || !user) return false;
    if (
      lap.status === StatusLaporan.SELESAI_BENAR ||
      lap.status === StatusLaporan.SELESAI_TIDAK_BENAR
    ) {
      return false;
    }
    return (
      user.role === Role.KASAT_NARKOBA ||
      (user.role === Role.KBO && Boolean(user.hasActiveDelegation))
    );
  });

  readonly canFillPenyidikan = computed(() => {
    const lap = this.laporan();
    const user = this.auth.currentUser();
    if (!lap || !user) return false;
    if (user.role !== Role.PENYIDIK) return false;
    if (lap.penyidikan) return false; // Hanya bisa dikirim satu kali
    return Boolean(lap.riwayatDisposisi?.some((d) => d.keUserId === user.id));
  });

  ngOnInit(): void {
    void this.flagSecure.enableSecureScreen('DETAIL_LAPORAN');
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDetail(id);
    }
  }

  ngOnDestroy(): void {
    void this.flagSecure.disableSecureScreen('DETAIL_LAPORAN');
    this.secureStorage.clearPhotoCache();
  }

  loadDetail(id: string): void {
    this.loading.set(true);
    this.api.get<LaporanDto>(`/laporan/${id}`).subscribe({
      next: (res) => {
        this.laporan.set(res.data ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  refreshSignedPhoto(laporanId: string, fotoId: string): void {
    this.api.get<LaporanFotoDto>(`/laporan/${laporanId}/foto/${fotoId}`).subscribe({
      next: (res) => {
        const current = this.laporan();
        if (current && res.data) {
          this.laporan.set({
            ...current,
            foto: (current.foto ?? []).map((f) => (f.id === fotoId ? res.data : f))
          });
        }
      }
    });
  }
}
