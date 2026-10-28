import { HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, filter, from, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export function resetAuthInterceptorState(): void {
  isRefreshing = false;
  refreshTokenSubject.next(null);
}

function attachToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  if (!token) {
    return req;
  }
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<any> => {
  const auth = inject(AuthService);

  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout');

  return from(auth.getAccessToken()).pipe(
    switchMap((token) => {
      const authedReq = isAuthEndpoint ? req : attachToken(req, token);
      return next(authedReq).pipe(
        catchError((error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 401 &&
            !isAuthEndpoint &&
            !req.headers.has('X-Retry-After-Refresh')
          ) {
            return handle401Error(authedReq, next, auth);
          }
          return throwError(() => error);
        })
      );
    })
  );
};

function handle401Error(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService
): Observable<any> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return auth.refreshToken().pipe(
      switchMap((res) => {
        isRefreshing = false;
        const newToken = res.data?.accessToken ?? null;
        if (!newToken) {
          void auth.logout('Sesi telah berakhir. Silakan masuk kembali.');
          return throwError(() => new Error('Refresh token gagal'));
        }
        refreshTokenSubject.next(newToken);
        const retried = attachToken(req, newToken).clone({
          setHeaders: { 'X-Retry-After-Refresh': '1' }
        });
        return next(retried);
      }),
      catchError((refreshErr) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        void auth.logout('Sesi telah kedaluwarsa. Silakan masuk kembali.');
        return throwError(() => refreshErr);
      })
    );
  }

  return refreshTokenSubject.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap((token) => {
      const retried = attachToken(req, token).clone({
        setHeaders: { 'X-Retry-After-Refresh': '1' }
      });
      return next(retried);
    })
  );
}
