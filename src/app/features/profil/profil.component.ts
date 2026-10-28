import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ROLE_LABELS } from '../../shared/constants/menu.constants';
import { Role } from '../../shared/models/models';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="profil-page">
      <div class="inst-panel-header">
        <div>
          <h1>Profil Personel</h1>
          <div class="text-muted">Identitas kedinasan dan pengaturan keamanan akun</div>
        </div>
      </div>

      @if (auth.currentUser(); as user) {
        <div class="inst-card">
          <div class="section-label">DATA PERSONEL AKTIF</div>
          <dl class="profile-dl">
            <div class="dl-row">
              <dt>Nama & Pangkat</dt>
              <dd><strong>{{ user.pangkat }} {{ user.nama }}</strong></dd>
            </div>
            <div class="dl-row">
              <dt>NRP</dt>
              <dd class="tabular-nums"><strong>{{ user.nrp }}</strong></dd>
            </div>
            <div class="dl-row">
              <dt>Jabatan</dt>
              <dd>{{ user.jabatan }}</dd>
            </div>
            <div class="dl-row">
              <dt>Peran Aplikasi (RBAC)</dt>
              <dd>{{ getRoleLabel(user.role) }} ({{ user.role }})</dd>
            </div>
            <div class="dl-row">
              <dt>Satuan Kerja / Wilayah</dt>
              <dd>{{ user.satuanNama }} — {{ user.wilayah }}</dd>
            </div>
            <div class="dl-row">
              <dt>Nomor Telepon Dinas</dt>
              <dd class="tabular-nums">{{ user.noHp }}</dd>
            </div>
            @if (user.lastLoginAt) {
              <div class="dl-row">
                <dt>Waktu Masuk Terakhir</dt>
                <dd class="tabular-nums">{{ user.lastLoginAt | date: 'dd/MM/yyyy HH:mm:ss' }} WIB</dd>
              </div>
            }
          </dl>

          <div class="profile-actions">
            <a routerLink="/auth/ganti-password" class="btn btn-secondary">
              Ganti Kata Sandi
            </a>
            <button type="button" class="btn btn-danger" (click)="logout()">
              Keluar & Bersihkan Cache
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .profil-page {
        max-width: 640px;
        margin: 0 auto;
      }
      .profile-dl {
        margin: var(--space-3) 0;
      }
      .dl-row {
        display: grid;
        grid-template-columns: 180px 1fr;
        gap: var(--space-2);
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-border);
        dt {
          color: var(--color-text-secondary);
          font-weight: 600;
          font-size: 0.82rem;
        }
        dd {
          margin: 0;
        }
      }
      .profile-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-4);
      }
    `
  ]
})
export class ProfilComponent {
  readonly auth = inject(AuthService);

  getRoleLabel(role: Role): string {
    return ROLE_LABELS[role] ?? role;
  }

  logout(): void {
    void this.auth.logout();
  }
}
