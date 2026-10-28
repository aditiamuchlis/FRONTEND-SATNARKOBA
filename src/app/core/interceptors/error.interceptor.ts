import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuditLoggerService } from '../services/audit-logger.service';
import { Role } from '../../shared/models/models';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const logger = inject(AuditLoggerService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 403) {
          logger.warn('HTTP_403_FORBIDDEN', { url: req.url });
          const user = auth.currentUser();
          // Kasus tepi: Delegasi berakhir/dicabut saat KBO sedang membuka detail
          if (user?.role === Role.KBO) {
            void auth.updateDelegationFlag(false);
          }
          if (!req.url.includes('/users/lookup')) {
            void router.navigate(['/tidak-punya-akses'], {
              queryParams: {
                reason:
                  error.error?.message ||
                  'Anda tidak memiliki hak akses untuk membuka sumber daya ini.'
              }
            });
          }
        } else if (error.status === 429) {
          logger.warn('HTTP_429_RATE_LIMIT', { url: req.url });
        }
      }
      return throwError(() => error);
    })
  );
};
