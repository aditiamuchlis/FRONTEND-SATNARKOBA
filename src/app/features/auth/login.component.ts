import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { NetworkService } from '../../core/services/network.service';

interface QuickAccount {
  nrp: string;
  roleLabel: string;
  nama: string;
  catatan: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="login-box">
        <div class="inst-header">
          <div class="inst-badge">KEPOLISIAN NEGARA REPUBLIK INDONESIA</div>
          <h1>SIPINAR — Satresnarkoba</h1>
          <p class="subtitle">
            Sistem Pelaporan Informasi Terindikasi Narkoba Internal Kepolisian
          </p>
        </div>

        @if (auth.logoutReasonMessage(); as reason) {
          <div class="inst-banner banner-warning" role="alert">
            <span>{{ reason }}</span>
          </div>
        }

        @if (!network.isOnline()) {
          <div class="inst-banner banner-danger" role="alert">
            <span>Tidak ada koneksi jaringan. Periksa sambungan internet perangkat Anda sebelum masuk.</span>
          </div>
        }

        @if (errorMessage()) {
          <div class="inst-banner banner-danger" role="alert">
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="inst-card login-form-card">
          <div class="form-field">
            <label for="nrpInput">NRP Personel <span class="req">*</span></label>
            <input
              id="nrpInput"
              type="text"
              inputmode="numeric"
              autocomplete="username"
              class="inst-input tabular-nums"
              formControlName="nrp"
              placeholder="Masukkan 8 digit NRP"
            />
            @if (form.controls.nrp.touched && form.controls.nrp.invalid) {
              <div class="field-error">NRP wajib diisi (angka 6–12 digit).</div>
            }
          </div>

          <div class="form-field">
            <label for="passwordInput">Kata Sandi <span class="req">*</span></label>
            <input
              id="passwordInput"
              type="password"
              autocomplete="current-password"
              class="inst-input"
              formControlName="password"
              placeholder="Masukkan kata sandi"
            />
            @if (form.controls.password.touched && form.controls.password.invalid) {
              <div class="field-error">Kata sandi wajib diisi.</div>
            }
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-block"
            [disabled]="form.invalid || submitting() || !network.isOnline()"
          >
            {{ submitting() ? 'Memverifikasi Kredensial...' : 'Masuk' }}
          </button>

          <div class="security-footnote">
            Seluruh aktivitas masuk (berhasil maupun gagal) beserta alamat IP dan perangkat dicatat otomatis dalam Jejak Audit.
          </div>
        </form>

        <!-- Daftar Akun Pengujian Per Peran (Seed Data) -->
        <div class="inst-card seed-card">
          <div class="section-label">Daftar Akun Seed Pengujian (Kata Sandi: Password#123)</div>
          <p class="seed-hint">Klik baris personel untuk mengisi NRP secara cepat:</p>
          <div class="inst-table-wrap">
            <table class="inst-table">
              <thead>
                <tr>
                  <th>NRP</th>
                  <th>Peran</th>
                  <th>Personel</th>
                  <th>Hak Akses Utama</th>
                </tr>
              </thead>
              <tbody>
                @for (acc of seedAccounts; track acc.nrp) {
                  <tr class="clickable-row" (click)="fillAccount(acc.nrp)">
                    <td class="tabular-nums"><strong>{{ acc.nrp }}</strong></td>
                    <td>{{ acc.roleLabel }}</td>
                    <td>{{ acc.nama }}</td>
                    <td class="text-muted">{{ acc.catatan }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-page {
        min-height: 100vh;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: var(--space-6) var(--space-4);
        background-color: var(--color-bg-app);
      }
      .login-box {
        width: 100%;
        max-width: 680px;
      }
      .inst-header {
        margin-bottom: var(--space-4);
      }
      .inst-badge {
        display: inline-block;
        padding: 3px 8px;
        background-color: var(--color-navy-900);
        color: var(--color-gold-100);
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        border-radius: var(--radius-sm);
        margin-bottom: var(--space-2);
      }
      .subtitle {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 0.875rem;
      }
      .login-form-card {
        border-top: 3px solid var(--color-navy-900);
      }
      .security-footnote {
        margin-top: var(--space-3);
        padding-top: var(--space-3);
        border-top: 1px solid var(--color-border);
        font-size: 0.76rem;
        color: var(--color-text-secondary);
      }
      .seed-card {
        margin-top: var(--space-4);
      }
      .seed-hint {
        margin: 4px 0 var(--space-2) 0;
        font-size: 0.78rem;
        color: var(--color-text-secondary);
      }
      .clickable-row {
        cursor: pointer;
      }
    `
  ]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  readonly network = inject(NetworkService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nrp: ['', [Validators.required, Validators.pattern(/^[0-9]{6,12}$/)]],
    password: ['', [Validators.required]]
  });

  readonly seedAccounts: QuickAccount[] = [
    {
      nrp: '88010101',
      roleLabel: 'BHABIN',
      nama: 'Aipda Hendra Wijaya',
      catatan: 'Buat Laporan, Laporan Saya'
    },
    {
      nrp: '79020202',
      roleLabel: 'KAPOLSEK',
      nama: 'Kompol Darmawan, S.I.K.',
      catatan: 'Hanya Notifikasi (tanpa detail)'
    },
    {
      nrp: '75030303',
      roleLabel: 'KAPOLRES',
      nama: 'Kombes Pol Bambang S.',
      catatan: 'Hanya Notifikasi (tanpa detail)'
    },
    {
      nrp: '78040404',
      roleLabel: 'KASAT_BINMAS',
      nama: 'AKBP Rahmat Hidayat',
      catatan: 'Hanya Notifikasi (tanpa detail)'
    },
    {
      nrp: '80050505',
      roleLabel: 'KASAT_NARKOBA',
      nama: 'AKBP Yudha Pratama',
      catatan: 'Detail penuh, Disposisi, Delegasi KBO'
    },
    {
      nrp: '85060606',
      roleLabel: 'PENYIDIK',
      nama: 'Iptu Rian Firmansyah',
      catatan: 'Disposisi Masuk, Isi Hasil Penyidikan'
    },
    {
      nrp: '83070707',
      roleLabel: 'KBO',
      nama: 'Iptu Surya Kencana',
      catatan: 'Akses Detail & Disposisi saat delegasi aktif'
    },
    {
      nrp: '90080808',
      roleLabel: 'ADMIN',
      nama: 'Bripka Aditya Nugraha',
      catatan: 'Kelola Pengguna, Satuan, Audit Log'
    },
    {
      nrp: '91090909',
      roleLabel: 'BHABIN (Login ke-1)',
      nama: 'Briptu Fajar Ramadhan',
      catatan: 'Simulasi wajib ganti password awal'
    }
  ];

  fillAccount(nrp: string): void {
    this.form.patchValue({ nrp, password: 'Password#123' });
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.network.isOnline()) {
      this.errorMessage.set(
        'Tidak ada koneksi jaringan. Periksa sambungan internet perangkat Anda.'
      );
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        const user = res.data?.user;
        if (user?.mustChangePassword) {
          void this.router.navigate(['/auth/ganti-password']);
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl && !returnUrl.startsWith('/auth')) {
          void this.router.navigateByUrl(returnUrl);
        } else {
          void this.router.navigateByUrl(this.auth.getDefaultHomeRoute(user));
        }
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse) {
          if (err.status === 0) {
            this.errorMessage.set('Tidak dapat terhubung ke server. Periksa koneksi jaringan.');
          } else if (err.status === 423) {
            this.errorMessage.set(
              err.error?.message || 'Akun terkunci sementara karena percobaan masuk berulang.'
            );
          } else if (err.status === 429) {
            this.errorMessage.set('Terlalu banyak permintaan masuk. Tunggu beberapa saat.');
          } else {
            this.errorMessage.set(
              err.error?.message || 'Kredensial salah. Periksa kembali NRP dan kata sandi Anda.'
            );
          }
        } else {
          this.errorMessage.set('Terjadi gangguan saat memproses autentikasi.');
        }
      }
    });
  }
}
