import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  template: `
    <div class="forbidden-container">
      <div class="inst-card forbidden-card">
        <div class="code-badge tabular-nums">KODE STATUS 403 — AKSES DITOLAK</div>
        <h1>Tidak Punya Akses</h1>
        <p class="reason-text">
          {{ reasonMessage }}
        </p>
        <p class="policy-note">
          Sesuai prosedur pengamanan informasi terindikasi narkoba, setiap percobaan akses di luar kewenangan peran atau di luar masa delegasi aktif dicatat pada Jejak Audit.
        </p>
        <div class="actions">
          <button type="button" class="btn btn-primary" (click)="goHome()">
            Kembali ke Halaman Utama
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .forbidden-container {
        max-width: 540px;
        margin: var(--space-8) auto;
        padding: 0 var(--space-4);
      }
      .forbidden-card {
        border-top: 4px solid var(--color-danger);
      }
      .code-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 0.74rem;
        font-weight: 700;
        background: var(--status-tidak-benar-bg);
        color: var(--status-tidak-benar-text);
        border: 1px solid var(--status-tidak-benar-border);
        border-radius: var(--radius-sm);
        margin-bottom: var(--space-3);
      }
      .reason-text {
        font-size: 0.92rem;
        font-weight: 600;
        color: var(--color-text-primary);
      }
      .policy-note {
        font-size: 0.82rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--space-4);
      }
    `
  ]
})
export class ForbiddenPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  get reasonMessage(): string {
    const r = this.route.snapshot.queryParamMap.get('reason');
    if (r === 'delegasi_tidak_aktif') {
      return 'Masa delegasi akses KBO sedang tidak aktif, telah berakhir, atau telah dicabut oleh Kasat Narkoba.';
    }
    return (
      r ||
      'Peran akun Anda tidak memiliki hak untuk mengakses halaman atau detail laporan ini.'
    );
  }

  goHome(): void {
    const target = this.auth.getDefaultHomeRoute();
    void this.router.navigateByUrl(target);
  }
}
