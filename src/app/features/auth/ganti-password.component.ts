import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-ganti-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="password-page">
      <div class="inst-card password-card">
        <div class="inst-panel-header">
          <div>
            <h1>Ganti Kata Sandi</h1>
            <div class="text-muted">Standar keamanan akun personel minimal 10 karakter</div>
          </div>
        </div>

        @if (auth.mustChangePassword()) {
          <div class="inst-banner banner-warning" role="alert">
            <span>
              <strong>Wajib Ganti Kata Sandi Awal:</strong> Demi keamanan operasional, Anda wajib mengganti kata sandi bawaan sebelum mengakses menu aplikasi.
            </span>
          </div>
        }

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

        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="form-field">
            <label for="currentPassword">Kata Sandi Saat Ini <span class="req">*</span></label>
            <input
              id="currentPassword"
              type="password"
              class="inst-input"
              formControlName="currentPassword"
              placeholder="Masukkan kata sandi lama"
            />
          </div>

          <div class="form-field">
            <label for="newPassword">Kata Sandi Baru <span class="req">*</span></label>
            <input
              id="newPassword"
              type="password"
              class="inst-input"
              formControlName="newPassword"
              placeholder="Minimal 10 karakter (huruf besar, kecil, angka)"
            />
            <div class="field-hint">
              Gunakan minimal 10 karakter dan hindari menggunakan NRP atau tanggal lahir.
            </div>
            @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) {
              <div class="field-error">Kata sandi baru minimal 10 karakter.</div>
            }
          </div>

          <div class="form-field">
            <label for="confirmPassword">Ulangi Kata Sandi Baru <span class="req">*</span></label>
            <input
              id="confirmPassword"
              type="password"
              class="inst-input"
              formControlName="confirmPassword"
              placeholder="Ketik ulang kata sandi baru"
            />
            @if (passwordMismatch) {
              <div class="field-error">Konfirmasi kata sandi baru tidak cocok.</div>
            }
          </div>

          <div class="actions-row">
            @if (!auth.mustChangePassword()) {
              <a routerLink="/profil" class="btn btn-secondary">Batal</a>
            }
            <button
              type="submit"
              class="btn btn-primary"
              [disabled]="form.invalid || passwordMismatch || submitting()"
            >
              {{ submitting() ? 'Menyimpan...' : 'Simpan Kata Sandi Baru' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .password-page {
        max-width: 520px;
        margin: var(--space-4) auto;
      }
      .actions-row {
        display: flex;
        justify-content: flex-end;
        gap: var(--space-3);
        margin-top: var(--space-4);
      }
    `
  ]
})
export class GantiPasswordComponent {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(10)]],
    confirmPassword: ['', [Validators.required]]
  });

  get passwordMismatch(): boolean {
    const { newPassword, confirmPassword } = this.form.getRawValue();
    return Boolean(confirmPassword && newPassword !== confirmPassword);
  }

  onSubmit(): void {
    if (this.form.invalid || this.passwordMismatch || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth.changePassword(this.form.getRawValue()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.successMessage.set(res.message || 'Kata sandi berhasil diperbarui.');
        setTimeout(() => {
          void this.router.navigateByUrl(this.auth.getDefaultHomeRoute());
        }, 700);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        if (err instanceof HttpErrorResponse) {
          this.errorMessage.set(err.error?.message || 'Gagal memperbarui kata sandi.');
        } else {
          this.errorMessage.set('Gagal memperbarui kata sandi.');
        }
      }
    });
  }
}
