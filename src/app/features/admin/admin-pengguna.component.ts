import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { Role, SatuanDto, UserProfileDto } from '../../shared/models/models';
import { ROLE_LABELS } from '../../shared/constants/menu.constants';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader.component';

@Component({
  selector: 'app-admin-pengguna',
  standalone: true,
  imports: [ReactiveFormsModule, SkeletonLoaderComponent],
  template: `
    <div class="admin-pengguna-page">
      <div class="inst-panel-header">
        <div>
          <h1>Manajemen Pengguna (Personel)</h1>
          <div class="text-muted">
            Kelola akun personel, peran RBAC, reset kata sandi awal, dan status aktif. Admin tidak memiliki akses ke detail laporan narkoba.
          </div>
        </div>
        <button
          type="button"
          class="btn btn-primary btn-sm"
          (click)="showCreateForm.set(!showCreateForm())"
        >
          {{ showCreateForm() ? 'Tutup Form' : '+ Tambah Personel' }}
        </button>
      </div>

      @if (noticeMessage()) {
        <div class="inst-banner banner-success" role="status">
          <span>{{ noticeMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div class="inst-banner banner-danger" role="alert">
          <span>{{ errorMessage() }}</span>
        </div>
      }

      @if (showCreateForm()) {
        <form [formGroup]="form" (ngSubmit)="onCreateUser()" novalidate class="inst-card">
          <h2>Tambah Akun Personel Baru</h2>
          <div class="form-grid">
            <div class="form-field">
              <label for="uNrp">NRP <span class="req">*</span></label>
              <input
                id="uNrp"
                type="text"
                class="inst-input tabular-nums"
                formControlName="nrp"
                placeholder="8 digit NRP"
              />
            </div>

            <div class="form-field">
              <label for="uNama">Nama Lengkap & Gelar <span class="req">*</span></label>
              <input
                id="uNama"
                type="text"
                class="inst-input"
                formControlName="nama"
                placeholder="Nama personel"
              />
            </div>

            <div class="form-field">
              <label for="uPangkat">Pangkat <span class="req">*</span></label>
              <input
                id="uPangkat"
                type="text"
                class="inst-input"
                formControlName="pangkat"
                placeholder="Contoh: AIPDA / IPTU / AKP"
              />
            </div>

            <div class="form-field">
              <label for="uJabatan">Jabatan <span class="req">*</span></label>
              <input
                id="uJabatan"
                type="text"
                class="inst-input"
                formControlName="jabatan"
                placeholder="Jabatan kedinasan"
              />
            </div>

            <div class="form-field">
              <label for="uRole">Peran (Role) <span class="req">*</span></label>
              <select id="uRole" class="inst-select" formControlName="role">
                @for (r of roleOptions; track r) {
                  <option [value]="r">{{ getRoleLabel(r) }} ({{ r }})</option>
                }
              </select>
            </div>

            <div class="form-field">
              <label for="uSatuan">Satuan Kerja <span class="req">*</span></label>
              <select id="uSatuan" class="inst-select" formControlName="satuanId">
                @for (s of satuanList(); track s.id) {
                  <option [value]="s.id">{{ s.nama }} ({{ s.wilayah }})</option>
                }
              </select>
            </div>

            <div class="form-field">
              <label for="uNoHp">No. HP Dinas <span class="req">*</span></label>
              <input
                id="uNoHp"
                type="text"
                class="inst-input tabular-nums"
                formControlName="noHp"
                placeholder="0812xxxxxxxx"
              />
            </div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid">
              Simpan Personel Baru
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <app-skeleton-loader [rows]="5"></app-skeleton-loader>
      } @else {
        <div class="inst-table-wrap">
          <table class="inst-table">
            <thead>
              <tr>
                <th>NRP</th>
                <th>Pangkat & Nama</th>
                <th>Jabatan</th>
                <th>Peran</th>
                <th>Satuan Kerja</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td class="tabular-nums"><strong>{{ u.nrp }}</strong></td>
                  <td>{{ u.pangkat }} {{ u.nama }}</td>
                  <td>{{ u.jabatan }}</td>
                  <td><span class="mono-code">{{ u.role }}</span></td>
                  <td>{{ u.satuanNama }}</td>
                  <td>
                    <span class="active-tag" [class.off]="!u.isActive">
                      {{ u.isActive ? 'Aktif' : 'Nonaktif' }}
                    </span>
                  </td>
                  <td class="action-buttons">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      (click)="resetPassword(u)"
                    >
                      Reset Sandi
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      [class.btn-danger]="u.isActive"
                      [class.btn-primary]="!u.isActive"
                      (click)="toggleUserStatus(u)"
                    >
                      {{ u.isActive ? 'Nonaktifkan' : 'Aktifkan' }}
                    </button>
                  </td>
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
      .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: var(--space-3);
      }
      .form-actions {
        display: flex;
        justify-content: flex-end;
      }
      .active-tag {
        padding: 2px 8px;
        border-radius: var(--radius-sm);
        font-size: 0.74rem;
        font-weight: 700;
        background: var(--status-benar-bg);
        color: var(--status-benar-text);
        &.off {
          background: var(--status-tidak-benar-bg);
          color: var(--status-tidak-benar-text);
        }
      }
      .action-buttons {
        display: flex;
        gap: var(--space-2);
      }
    `
  ]
})
export class AdminPenggunaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);

  readonly users = signal<UserProfileDto[]>([]);
  readonly satuanList = signal<SatuanDto[]>([]);
  readonly loading = signal<boolean>(false);
  readonly showCreateForm = signal<boolean>(false);
  readonly noticeMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly roleOptions = Object.values(Role);

  readonly form = this.fb.nonNullable.group({
    nrp: ['', [Validators.required, Validators.pattern(/^[0-9]{6,12}$/)]],
    nama: ['', [Validators.required]],
    pangkat: ['BRIPKA', [Validators.required]],
    jabatan: ['', [Validators.required]],
    role: [Role.BHABIN, [Validators.required]],
    satuanId: ['sat-polsek-01', [Validators.required]],
    noHp: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.api.get<SatuanDto[]>('/satuan').subscribe({
      next: (res) => this.satuanList.set(res.data ?? [])
    });
    this.api.get<UserProfileDto[]>('/users').subscribe({
      next: (res) => {
        this.users.set(res.data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onCreateUser(): void {
    if (this.form.invalid) return;
    this.noticeMessage.set(null);
    this.errorMessage.set(null);

    this.api.post<UserProfileDto>('/users', this.form.getRawValue()).subscribe({
      next: (res) => {
        this.noticeMessage.set(res.message);
        this.showCreateForm.set(false);
        this.loadData();
      },
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse) {
          this.errorMessage.set(err.error?.message || 'Gagal menambah personel.');
        }
      }
    });
  }

  resetPassword(u: UserProfileDto): void {
    this.api.post(`/users/${u.id}/reset-password`, {}).subscribe({
      next: (res) => this.noticeMessage.set(res.message)
    });
  }

  toggleUserStatus(u: UserProfileDto): void {
    this.api.patch(`/users/${u.id}/status`, {}).subscribe({
      next: (res) => {
        this.noticeMessage.set(res.message);
        this.loadData();
      }
    });
  }

  getRoleLabel(r: Role): string {
    return ROLE_LABELS[r] ?? r;
  }
}
