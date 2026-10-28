import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../../shared/models/models';

export const roleGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isInitialized()) {
    await auth.restoreSession();
  }

  const user = auth.currentUser();
  if (!user) {
    return router.createUrlTree(['/auth/login']);
  }

  const allowedRoles = route.data?.['roles'] as Role[] | undefined;
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return router.createUrlTree(['/tidak-punya-akses']);
  }

  const checkKboDelegation = route.data?.['checkKboDelegation'] as boolean | undefined;
  if (checkKboDelegation && user.role === Role.KBO && !user.hasActiveDelegation) {
    return router.createUrlTree(['/tidak-punya-akses'], {
      queryParams: { reason: 'delegasi_tidak_aktif' }
    });
  }

  return true;
};
