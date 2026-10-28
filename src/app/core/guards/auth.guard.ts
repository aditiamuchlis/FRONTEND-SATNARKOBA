import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isInitialized()) {
    await auth.restoreSession();
  }

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  if (auth.mustChangePassword() && !state.url.startsWith('/auth/ganti-password')) {
    return router.createUrlTree(['/auth/ganti-password']);
  }

  return true;
};
