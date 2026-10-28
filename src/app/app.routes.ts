import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Role } from './shared/models/models';

export const appRoutes: Routes = [
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'auth/ganti-password',
        loadComponent: () =>
          import('./features/auth/ganti-password.component').then(
            (m) => m.GantiPasswordComponent
          )
      },
      {
        path: 'beranda',
        canActivate: [roleGuard],
        data: {
          roles: [
            Role.BHABIN,
            Role.KAPOLSEK,
            Role.KAPOLRES,
            Role.KASAT_BINMAS,
            Role.KASAT_NARKOBA,
            Role.PENYIDIK,
            Role.KBO
          ]
        },
        loadComponent: () =>
          import('./features/beranda/beranda.component').then((m) => m.BerandaComponent)
      },
      {
        path: 'laporan/buat',
        canActivate: [roleGuard],
        data: { roles: [Role.BHABIN] },
        loadComponent: () =>
          import('./features/laporan/buat-laporan.component').then(
            (m) => m.BuatLaporanComponent
          )
      },
      {
        path: 'laporan/saya',
        canActivate: [roleGuard],
        data: { roles: [Role.BHABIN] },
        loadComponent: () =>
          import('./features/laporan/laporan-saya.component').then(
            (m) => m.LaporanSayaComponent
          )
      },
      {
        path: 'laporan/daftar',
        canActivate: [roleGuard],
        data: {
          roles: [Role.KASAT_NARKOBA, Role.KBO],
          checkKboDelegation: true
        },
        loadComponent: () =>
          import('./features/laporan/daftar-laporan.component').then(
            (m) => m.DaftarLaporanComponent
          )
      },
      {
        path: 'laporan/:id',
        canActivate: [roleGuard],
        data: {
          roles: [Role.BHABIN, Role.KASAT_NARKOBA, Role.PENYIDIK, Role.KBO],
          checkKboDelegation: true
        },
        loadComponent: () =>
          import('./features/laporan/detail-laporan.component').then(
            (m) => m.DetailLaporanComponent
          )
      },
      {
        path: 'disposisi',
        canActivate: [roleGuard],
        data: { roles: [Role.PENYIDIK] },
        loadComponent: () =>
          import('./features/disposisi/disposisi-masuk.component').then(
            (m) => m.DisposisiMasukComponent
          )
      },
      {
        path: 'disposisi/form/:id',
        canActivate: [roleGuard],
        data: {
          roles: [Role.KASAT_NARKOBA, Role.KBO],
          checkKboDelegation: true
        },
        loadComponent: () =>
          import('./features/disposisi/form-disposisi.component').then(
            (m) => m.FormDisposisiComponent
          )
      },
      {
        path: 'penyidikan/form/:id',
        canActivate: [roleGuard],
        data: { roles: [Role.PENYIDIK] },
        loadComponent: () =>
          import('./features/penyidikan/form-penyidikan.component').then(
            (m) => m.FormPenyidikanComponent
          )
      },
      {
        path: 'delegasi',
        canActivate: [roleGuard],
        data: { roles: [Role.KASAT_NARKOBA, Role.KBO] },
        loadComponent: () =>
          import('./features/delegasi/delegasi-akses.component').then(
            (m) => m.DelegasiAksesComponent
          )
      },
      {
        path: 'notifikasi',
        canActivate: [roleGuard],
        data: {
          roles: [
            Role.BHABIN,
            Role.KAPOLSEK,
            Role.KAPOLRES,
            Role.KASAT_BINMAS,
            Role.KASAT_NARKOBA,
            Role.PENYIDIK,
            Role.KBO
          ]
        },
        loadComponent: () =>
          import('./features/notifikasi/notifikasi-list.component').then(
            (m) => m.NotifikasiListComponent
          )
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/profil/profil.component').then((m) => m.ProfilComponent)
      },
      {
        path: 'admin/pengguna',
        canActivate: [roleGuard],
        data: { roles: [Role.ADMIN] },
        loadComponent: () =>
          import('./features/admin/admin-pengguna.component').then(
            (m) => m.AdminPenggunaComponent
          )
      },
      {
        path: 'admin/satuan',
        canActivate: [roleGuard],
        data: { roles: [Role.ADMIN] },
        loadComponent: () =>
          import('./features/admin/admin-satuan.component').then(
            (m) => m.AdminSatuanComponent
          )
      },
      {
        path: 'admin/audit-log',
        canActivate: [roleGuard],
        data: { roles: [Role.ADMIN] },
        loadComponent: () =>
          import('./features/admin/admin-audit-log.component').then(
            (m) => m.AdminAuditLogComponent
          )
      },
      {
        path: 'tidak-punya-akses',
        loadComponent: () =>
          import('./layout/forbidden-page.component').then(
            (m) => m.ForbiddenPageComponent
          )
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'beranda'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'beranda'
  }
];
