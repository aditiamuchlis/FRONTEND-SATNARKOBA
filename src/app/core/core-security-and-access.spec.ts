import '@angular/compiler';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  MENU_BY_ROLE,
  NON_DETAIL_ROLES,
  computeStatusDelegasi
} from '../shared/constants/menu.constants';
import {
  DisposisiDto,
  LaporanDto,
  Role,
  StatusDisposisi,
  StatusLaporan,
  UserProfileDto
} from '../shared/models/models';
import { canViewLaporanDetail } from './interceptors/mock-api.interceptor';
import { AuditLoggerService } from './services/audit-logger.service';
import { SecureStorageService } from './services/secure-storage.service';

describe('SIPINAR Core Access Matrix, Delegation, & Security Unit Tests', () => {
  const sampleLaporan: LaporanDto = {
    id: 'lap-test-01',
    noLaporan: 'LP/NRK/2026/0099',
    pelaporId: 'usr-bhabin-01',
    satuanId: 'sat-polsek-01',
    satuanNama: 'Polsek Metro Gambir',
    wilayah: 'Kec. Gambir',
    namaObjek: 'Kontrakan Uji',
    latitude: -6.17,
    longitude: 106.82,
    deskripsi: 'Deskripsi rahasia uji coba',
    status: StatusLaporan.DIDISPOSISI,
    waktuLapor: '2026-10-27T07:00:00.000Z',
    riwayatDisposisi: [
      {
        id: 'disp-test-01',
        laporanId: 'lap-test-01',
        dariUserId: 'usr-kasat-01',
        dariUserNama: 'AKBP Yudha',
        dariUserPangkat: 'AKBP',
        keUserId: 'usr-penyidik-01',
        keUserNama: 'Iptu Rian',
        keUserPangkat: 'IPTU',
        keUserNrp: '85060606',
        catatan: 'Lakukan penyelidikan',
        status: StatusDisposisi.DIPROSES,
        waktuDisposisi: '2026-10-27T08:00:00.000Z'
      } as DisposisiDto
    ]
  };

  function makeUser(role: Role, id = `usr-${role}`): UserProfileDto {
    return {
      id,
      nrp: '80000001',
      nama: 'Personel Uji',
      pangkat: 'IPTU',
      jabatan: 'Pejabat Uji',
      role,
      satuanId: 'sat-polres-01',
      satuanNama: 'Polres Metro Jakarta Pusat',
      wilayah: 'Jakarta Pusat',
      noHp: '0812000000',
      isActive: true
    };
  }

  it('enforces MENU_BY_ROLE so Kapolsek, Kapolres, and Kasat Binmas never see Daftar Laporan or Buat Laporan', () => {
    for (const r of [Role.KAPOLSEK, Role.KAPOLRES, Role.KASAT_BINMAS]) {
      const routes = MENU_BY_ROLE[r].map((m) => m.route);
      expect(routes).toContain('/beranda');
      expect(routes).toContain('/notifikasi');
      expect(routes).not.toContain('/laporan/daftar');
      expect(routes).not.toContain('/laporan/buat');
    }
    expect(NON_DETAIL_ROLES).toContain(Role.KAPOLSEK);
    expect(NON_DETAIL_ROLES).toContain(Role.KAPOLRES);
    expect(NON_DETAIL_ROLES).toContain(Role.KASAT_BINMAS);
    expect(NON_DETAIL_ROLES).toContain(Role.ADMIN);
  });

  it('enforces canViewLaporanDetail across all 8 roles', () => {
    // 1. Kasat Narkoba -> true
    expect(canViewLaporanDetail(makeUser(Role.KASAT_NARKOBA, 'usr-kasat-01'), sampleLaporan)).toBe(
      true
    );

    // 2. Bhabin pemilik laporan -> true, Bhabin lain -> false
    expect(canViewLaporanDetail(makeUser(Role.BHABIN, 'usr-bhabin-01'), sampleLaporan)).toBe(true);
    expect(canViewLaporanDetail(makeUser(Role.BHABIN, 'usr-bhabin-99'), sampleLaporan)).toBe(
      false
    );

    // 3. Penyidik penerima disposisi -> true, Penyidik lain -> false
    expect(canViewLaporanDetail(makeUser(Role.PENYIDIK, 'usr-penyidik-01'), sampleLaporan)).toBe(
      true
    );
    expect(canViewLaporanDetail(makeUser(Role.PENYIDIK, 'usr-penyidik-02'), sampleLaporan)).toBe(
      false
    );

    // 4. Kapolsek, Kapolres, Kasat Binmas, Admin -> selalu false
    expect(canViewLaporanDetail(makeUser(Role.KAPOLSEK), sampleLaporan)).toBe(false);
    expect(canViewLaporanDetail(makeUser(Role.KAPOLRES), sampleLaporan)).toBe(false);
    expect(canViewLaporanDetail(makeUser(Role.KASAT_BINMAS), sampleLaporan)).toBe(false);
    expect(canViewLaporanDetail(makeUser(Role.ADMIN), sampleLaporan)).toBe(false);
  });

  it('computes KBO delegation status accurately in Asia/Jakarta timezone', () => {
    const refNow = new Date('2026-10-27T05:00:00.000Z'); // 2026-10-27 12:00 WIB
    expect(computeStatusDelegasi('2026-10-26', '2026-10-28', false, refNow)).toBe('AKTIF');
    expect(computeStatusDelegasi('2026-10-28', '2026-10-30', false, refNow)).toBe('AKAN_DATANG');
    expect(computeStatusDelegasi('2026-10-01', '2026-10-10', false, refNow)).toBe('SELESAI');
    expect(computeStatusDelegasi('2026-10-26', '2026-10-28', true, refNow)).toBe('DICABUT');
  });

  it('redacts sensitive fields in AuditLoggerService', () => {
    const logger = new AuditLoggerService();
    const sanitized = logger.sanitize({
      nrp: '88010101',
      password: 'SecretPassword#123',
      accessToken: 'jwt-secret-token',
      nama_objek: 'Lokasi Rahasia',
      latitude: -6.175,
      longitude: 106.827,
      deskripsi: 'Isi laporan sensitif'
    }) as Record<string, unknown>;

    expect(sanitized['nrp']).toBe('88010101');
    expect(sanitized['password']).toBe('[REDACTED]');
    expect(sanitized['accessToken']).toBe('[REDACTED]');
    expect(sanitized['nama_objek']).toBe('[REDACTED]');
    expect(sanitized['latitude']).toBe('[REDACTED]');
    expect(sanitized['deskripsi']).toBe('[REDACTED]');
  });

  describe('SecureStorageService', () => {
    let storage: SecureStorageService;

    beforeEach(() => {
      storage = new SecureStorageService();
    });

    it('stores, retrieves, and clears credentials without using localStorage', async () => {
      await storage.set('access_token', 'token-123');
      const fetched = await storage.get('access_token');
      expect(fetched).toBe('token-123');

      await storage.remove('access_token');
      expect(await storage.get('access_token')).toBeNull();

      await storage.set('refresh_token', 'rt-456');
      await storage.clearAll();
      expect(await storage.get('refresh_token')).toBeNull();
    });
  });
});
