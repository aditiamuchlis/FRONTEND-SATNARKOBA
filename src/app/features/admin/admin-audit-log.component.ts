import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe, JsonPipe } from '@angular/common';
import { ApiService } from '../../core/services/api.service';
import { AuditLogDto } from '../../shared/models/models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';

@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [FormsModule, DatePipe, JsonPipe, SkeletonLoaderComponent, EmptyStateComponent],
  template: `
    <div class="audit-log-page">
      <div class="inst-panel-header">
        <div>
          <h1>Jejak Audit (Audit Log)</h1>
          <div class="text-muted">
            Catatan permanen (immutable) seluruh aktivitas login, pembukaan detail laporan/foto, disposisi, penyidikan, dan delegasi.
          </div>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="loadAudit()">
          Muat Ulang
        </button>
      </div>

      <div class="inst-card filter-bar">
        <div class="filter-row">
          <div>
            <label for="audAksi">Filter Jenis Aksi</label>
            <select id="audAksi" class="inst-select" [(ngModel)]="aksiFilter" (change)="loadAudit()">
              <option value="">Semua Aksi</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGIN_GAGAL">LOGIN_GAGAL</option>
              <option value="BUAT_LAPORAN">BUAT_LAPORAN</option>
              <option value="LIHAT_DETAIL">LIHAT_DETAIL</option>
              <option value="LIHAT_FOTO">LIHAT_FOTO</option>
              <option value="DISPOSISI">DISPOSISI</option>
              <option value="PENYIDIKAN">PENYIDIKAN</option>
              <option value="BUAT_DELEGASI">BUAT_DELEGASI</option>
              <option value="CABUT_DELEGASI">CABUT_DELEGASI</option>
              <option value="UBAH_USER">UBAH_USER</option>
            </select>
          </div>
          <div>
            <label for="audQ">Cari NRP / Nama / ID Entitas</label>
            <input
              id="audQ"
              type="text"
              class="inst-input"
              [(ngModel)]="q"
              (keyup.enter)="loadAudit()"
              placeholder="Contoh: 80050505 atau lap-0001"
            />
          </div>
        </div>
      </div>

      @if (loading()) {
        <app-skeleton-loader [rows]="5"></app-skeleton-loader>
      } @else if (items().length === 0) {
        <app-empty-state
          title="Tidak Ada Catatan Audit"
          description="Tidak ditemukan catatan audit yang sesuai dengan filter."
        ></app-empty-state>
      } @else {
        <div class="inst-table-wrap">
          <table class="inst-table">
            <thead>
              <tr>
                <th>Waktu (WIB)</th>
                <th>Aksi</th>
                <th>Personel (NRP)</th>
                <th>Peran</th>
                <th>Entitas & ID</th>
                <th>IP & Perangkat</th>
                <th>Metadata</th>
              </tr>
            </thead>
            <tbody>
              @for (a of items(); track a.id) {
                <tr>
                  <td class="tabular-nums">{{ a.waktu | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td><span class="mono-code"><strong>{{ a.aksi }}</strong></span></td>
                  <td class="tabular-nums">{{ a.userNama }} ({{ a.userNrp }})</td>
                  <td>{{ a.userRole }}</td>
                  <td class="mono-code">{{ a.entitas }} / {{ a.entitasId }}</td>
                  <td class="tabular-nums">
                    <div>{{ a.ip }}</div>
                    <div class="text-muted" style="font-size: 0.72rem; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      {{ a.userAgent }}
                    </div>
                  </td>
                  <td class="mono-code">{{ a.meta ? (a.meta | json) : '-' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .filter-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--space-3);
        label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-text-secondary);
          margin-bottom: 4px;
        }
      }
    `
  ]
})
export class AdminAuditLogComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly items = signal<AuditLogDto[]>([]);
  readonly loading = signal<boolean>(false);

  aksiFilter = '';
  q = '';

  ngOnInit(): void {
    this.loadAudit();
  }

  loadAudit(): void {
    this.loading.set(true);
    this.api
      .get<AuditLogDto[]>('/audit-log', {
        aksi: this.aksiFilter || undefined,
        q: this.q || undefined
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.data ?? []);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }
}
