export enum Role {
  BHABIN = 'BHABIN',
  KAPOLSEK = 'KAPOLSEK',
  KAPOLRES = 'KAPOLRES',
  KASAT_BINMAS = 'KASAT_BINMAS',
  KASAT_NARKOBA = 'KASAT_NARKOBA',
  PENYIDIK = 'PENYIDIK',
  KBO = 'KBO',
  ADMIN = 'ADMIN'
}

export enum StatusLaporan {
  BARU = 'BARU',
  DIDISPOSISI = 'DIDISPOSISI',
  SELESAI_BENAR = 'SELESAI_BENAR',
  SELESAI_TIDAK_BENAR = 'SELESAI_TIDAK_BENAR'
}

export enum HasilPenyidikan {
  BENAR = 'BENAR',
  TIDAK_BENAR = 'TIDAK_BENAR'
}

export enum CakupanDelegasi {
  SEMUA = 'SEMUA',
  TERTENTU = 'TERTENTU'
}

export enum TipeSatuan {
  POLRES = 'POLRES',
  POLSEK = 'POLSEK'
}

export enum TipeNotifikasi {
  LAPORAN_BARU = 'LAPORAN_BARU',
  DISPOSISI = 'DISPOSISI',
  HASIL_PENYIDIKAN = 'HASIL_PENYIDIKAN',
  DELEGASI = 'DELEGASI'
}

export enum StatusDisposisi {
  DITERIMA = 'DITERIMA',
  DIPROSES = 'DIPROSES',
  SELESAI = 'SELESAI'
}

export type StatusDelegasiComputed = 'AKAN_DATANG' | 'AKTIF' | 'SELESAI' | 'DICABUT';

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: ApiFieldError[];
  meta?: PaginationMeta;
}

export interface SatuanDto {
  id: string;
  kode: string;
  nama: string;
  tipe: TipeSatuan;
  parentId?: string | null;
  wilayah: string;
}

export interface UserProfileDto {
  id: string;
  nrp: string;
  nama: string;
  pangkat: string;
  jabatan: string;
  role: Role;
  satuanId: string;
  satuanNama: string;
  wilayah: string;
  noHp: string;
  isActive: boolean;
  mustChangePassword?: boolean;
  hasActiveDelegation?: boolean;
  lastLoginAt?: string;
}

export interface LoginRequestDto {
  nrp: string;
  password: string;
}

export interface LoginResponseDto {
  accessToken: string;
  refreshToken: string;
  user: UserProfileDto;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface LaporanFotoDto {
  id: string;
  laporanId: string;
  signedUrl: string;
  expiresAt: string;
  diambilPada: string;
  latitude: number;
  longitude: number;
  hashFile: string;
}

export interface DisposisiDto {
  id: string;
  laporanId: string;
  noLaporan?: string;
  wilayah?: string;
  dariUserId: string;
  dariUserNama: string;
  dariUserPangkat: string;
  keUserId: string;
  keUserNama: string;
  keUserPangkat: string;
  keUserNrp: string;
  catatan: string;
  status: StatusDisposisi;
  waktuDisposisi: string;
  laporanStatus?: StatusLaporan;
}

export interface PenyidikanFotoDto {
  id: string;
  penyidikanId: string;
  signedUrl: string;
  expiresAt: string;
  diambilPada: string;
  hashFile: string;
}

export interface PenyidikanDto {
  id: string;
  laporanId: string;
  disposisiId: string;
  penyidikId: string;
  penyidikNama: string;
  penyidikPangkat: string;
  penyidikNrp: string;
  hasil: HasilPenyidikan;
  deskripsi: string;
  waktuSelesai: string;
  foto: PenyidikanFotoDto[];
}

export interface LaporanDto {
  id: string;
  noLaporan: string;
  pelaporId: string;
  pelaporNama?: string;
  pelaporPangkat?: string;
  pelaporNrp?: string;
  satuanId: string;
  satuanNama: string;
  wilayah: string;
  namaObjek?: string;
  latitude?: number;
  longitude?: number;
  deskripsi?: string;
  status: StatusLaporan;
  waktuLapor: string;
  foto?: LaporanFotoDto[];
  riwayatDisposisi?: DisposisiDto[];
  penyidikan?: PenyidikanDto | null;
}

export interface CapturedPhotoItem {
  id: string;
  dataUrl: string;
  diambilPada: string;
  latitude: number;
  longitude: number;
  fileName: string;
}

export interface CreateLaporanPayload {
  idempotencyKey: string;
  nama_objek: string;
  latitude: number;
  longitude: number;
  deskripsi: string;
  foto: CapturedPhotoItem[];
}

export interface OfflineDraftLaporan {
  id: string;
  idempotencyKey: string;
  createdAt: string;
  status: 'MENUNGGU_TERKIRIM' | 'MENGIRIM' | 'GAGAL';
  lastError?: string;
  encryptedPayload: string;
  iv: string;
  previewNoLabel: string;
}

export interface NotifikasiDto {
  id: string;
  userId: string;
  /**
   * null/undefined for KAPOLSEK, KAPOLRES, KASAT_BINMAS per strict access rule
   */
  laporanId?: string | null;
  noLaporan?: string;
  wilayah?: string;
  tipe: TipeNotifikasi;
  judul: string;
  isiRingkas: string;
  waktu: string;
  dibacaAt?: string | null;
}

export interface DelegasiDto {
  id: string;
  dariUserId: string;
  dariUserNama: string;
  dariUserPangkat: string;
  keUserId: string;
  keUserNama: string;
  keUserPangkat: string;
  nrpTujuan: string;
  tglMulai: string;
  tglSelesai: string;
  cakupan: CakupanDelegasi;
  laporanIds?: string[];
  isRevoked: boolean;
  revokedAt?: string | null;
  createdAt: string;
}

export interface CreateDelegasiDto {
  nrp: string;
  tgl_mulai: string;
  tgl_selesai: string;
  cakupan: CakupanDelegasi;
  laporan_ids?: string[];
}

export interface KboLookupDto {
  nrp: string;
  nama: string;
  pangkat: string;
  jabatan: string;
  satuanNama: string;
}

export interface PenyidikOptionDto {
  id: string;
  nrp: string;
  nama: string;
  pangkat: string;
  jabatan: string;
  satuanNama: string;
  aktifDisposisiCount: number;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  userNrp: string;
  userNama: string;
  userRole: Role;
  aksi:
    | 'LOGIN'
    | 'LOGIN_GAGAL'
    | 'BUAT_LAPORAN'
    | 'LIHAT_DETAIL'
    | 'LIHAT_FOTO'
    | 'DISPOSISI'
    | 'PENYIDIKAN'
    | 'BUAT_DELEGASI'
    | 'CABUT_DELEGASI'
    | 'UBAH_USER';
  entitas: string;
  entitasId: string;
  ip: string;
  userAgent: string;
  waktu: string;
  meta?: Record<string, unknown>;
}

export interface BerandaMetricItem {
  label: string;
  value: number;
  keterangan: string;
}

export interface BerandaActivityItem {
  id: string;
  waktu: string;
  judul: string;
  ringkasan: string;
  status?: StatusLaporan;
  canOpenDetail: boolean;
  laporanId?: string;
}
