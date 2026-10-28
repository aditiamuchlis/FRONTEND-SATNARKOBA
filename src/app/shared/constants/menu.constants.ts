import { Role, StatusDelegasiComputed, StatusLaporan } from '../models/models';

export interface MenuItemConfig {
  id: string;
  label: string;
  route: string;
  icon: string;
  requiresActiveDelegation?: boolean;
  badgeKey?: 'unreadNotif' | 'offlineDrafts';
}

export const MENU_BY_ROLE: Record<Role, MenuItemConfig[]> = {
  [Role.BHABIN]: [
    { id: 'beranda', label: 'Beranda', route: '/beranda', icon: 'grid-outline' },
    {
      id: 'buat-laporan',
      label: 'Buat Laporan',
      route: '/laporan/buat',
      icon: 'add-circle-outline',
      badgeKey: 'offlineDrafts'
    },
    {
      id: 'laporan-saya',
      label: 'Laporan Saya',
      route: '/laporan/saya',
      icon: 'document-text-outline'
    },
    {
      id: 'notifikasi',
      label: 'Notifikasi',
      route: '/notifikasi',
      icon: 'notifications-outline',
      badgeKey: 'unreadNotif'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ],
  [Role.KAPOLSEK]: [
    { id: 'beranda', label: 'Beranda', route: '/beranda', icon: 'grid-outline' },
    {
      id: 'notifikasi',
      label: 'Notifikasi',
      route: '/notifikasi',
      icon: 'notifications-outline',
      badgeKey: 'unreadNotif'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ],
  [Role.KAPOLRES]: [
    { id: 'beranda', label: 'Beranda', route: '/beranda', icon: 'grid-outline' },
    {
      id: 'notifikasi',
      label: 'Notifikasi',
      route: '/notifikasi',
      icon: 'notifications-outline',
      badgeKey: 'unreadNotif'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ],
  [Role.KASAT_BINMAS]: [
    { id: 'beranda', label: 'Beranda', route: '/beranda', icon: 'grid-outline' },
    {
      id: 'notifikasi',
      label: 'Notifikasi',
      route: '/notifikasi',
      icon: 'notifications-outline',
      badgeKey: 'unreadNotif'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ],
  [Role.KASAT_NARKOBA]: [
    { id: 'beranda', label: 'Beranda', route: '/beranda', icon: 'grid-outline' },
    {
      id: 'daftar-laporan',
      label: 'Daftar Laporan',
      route: '/laporan/daftar',
      icon: 'folder-open-outline'
    },
    {
      id: 'delegasi-akses',
      label: 'Delegasi Akses',
      route: '/delegasi',
      icon: 'key-outline'
    },
    {
      id: 'notifikasi',
      label: 'Notifikasi',
      route: '/notifikasi',
      icon: 'notifications-outline',
      badgeKey: 'unreadNotif'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ],
  [Role.PENYIDIK]: [
    { id: 'beranda', label: 'Beranda', route: '/beranda', icon: 'grid-outline' },
    {
      id: 'disposisi-masuk',
      label: 'Disposisi Masuk',
      route: '/disposisi',
      icon: 'briefcase-outline'
    },
    {
      id: 'notifikasi',
      label: 'Notifikasi',
      route: '/notifikasi',
      icon: 'notifications-outline',
      badgeKey: 'unreadNotif'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ],
  [Role.KBO]: [
    { id: 'beranda', label: 'Beranda', route: '/beranda', icon: 'grid-outline' },
    {
      id: 'daftar-laporan',
      label: 'Daftar Laporan',
      route: '/laporan/daftar',
      icon: 'folder-open-outline',
      requiresActiveDelegation: true
    },
    {
      id: 'delegasi-diterima',
      label: 'Delegasi Diterima',
      route: '/delegasi',
      icon: 'shield-checkmark-outline'
    },
    {
      id: 'notifikasi',
      label: 'Notifikasi',
      route: '/notifikasi',
      icon: 'notifications-outline',
      badgeKey: 'unreadNotif'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ],
  [Role.ADMIN]: [
    {
      id: 'admin-pengguna',
      label: 'Pengguna',
      route: '/admin/pengguna',
      icon: 'people-outline'
    },
    {
      id: 'admin-satuan',
      label: 'Satuan',
      route: '/admin/satuan',
      icon: 'business-outline'
    },
    {
      id: 'admin-audit',
      label: 'Audit Log',
      route: '/admin/audit-log',
      icon: 'receipt-outline'
    },
    { id: 'profil', label: 'Profil', route: '/profil', icon: 'person-outline' }
  ]
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.BHABIN]: 'Bhabinkamtibmas',
  [Role.KAPOLSEK]: 'Kapolsek',
  [Role.KAPOLRES]: 'Kapolres',
  [Role.KASAT_BINMAS]: 'Kasat Binmas',
  [Role.KASAT_NARKOBA]: 'Kasat Resnarkoba',
  [Role.PENYIDIK]: 'Penyidik / Kanit Lidik',
  [Role.KBO]: 'KBO Satresnarkoba',
  [Role.ADMIN]: 'Administrator Sistem'
};

export const STATUS_LAPORAN_META: Record<
  StatusLaporan,
  { label: string; cssClass: string }
> = {
  [StatusLaporan.BARU]: {
    label: 'Baru',
    cssClass: 'badge-baru'
  },
  [StatusLaporan.DIDISPOSISI]: {
    label: 'Didisposisi',
    cssClass: 'badge-didisposisi'
  },
  [StatusLaporan.SELESAI_BENAR]: {
    label: 'Selesai – Benar',
    cssClass: 'badge-selesai-benar'
  },
  [StatusLaporan.SELESAI_TIDAK_BENAR]: {
    label: 'Selesai – Tidak Benar',
    cssClass: 'badge-selesai-tidak-benar'
  }
};

export const NON_DETAIL_ROLES: readonly Role[] = [
  Role.KAPOLSEK,
  Role.KAPOLRES,
  Role.KASAT_BINMAS,
  Role.ADMIN
];

export function computeStatusDelegasi(
  tglMulai: string,
  tglSelesai: string,
  isRevoked: boolean,
  nowDate: Date = new Date()
): StatusDelegasiComputed {
  if (isRevoked) {
    return 'DICABUT';
  }
  // Asia/Jakarta date comparison (YYYY-MM-DD)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const todayJakarta = formatter.format(nowDate);
  const mulaiDate = tglMulai.slice(0, 10);
  const selesaiDate = tglSelesai.slice(0, 10);

  if (todayJakarta < mulaiDate) {
    return 'AKAN_DATANG';
  }
  if (todayJakarta > selesaiDate) {
    return 'SELESAI';
  }
  return 'AKTIF';
}
