import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  AuditLogDto,
  CakupanDelegasi,
  DelegasiDto,
  DisposisiDto,
  HasilPenyidikan,
  KboLookupDto,
  LaporanDto,
  NotifikasiDto,
  PenyidikanDto,
  PenyidikOptionDto,
  Role,
  SatuanDto,
  StatusDisposisi,
  StatusLaporan,
  TipeNotifikasi,
  TipeSatuan,
  UserProfileDto
} from '../../shared/models/models';
import { NON_DETAIL_ROLES, computeStatusDelegasi } from '../../shared/constants/menu.constants';

function createEvidenceSvgDataUrl(
  title: string,
  timestamp: string,
  lat: number,
  lng: number,
  badgeText: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
    <rect width="720" height="480" fill="#1b365d"/>
    <rect x="20" y="20" width="680" height="440" fill="#243b53" stroke="#486581" stroke-width="2"/>
    <line x1="20" y1="340" x2="700" y2="340" stroke="#334e68" stroke-width="2"/>
    <rect x="20" y="340" width="680" height="120" fill="#102a43" opacity="0.94"/>
    <text x="44" y="95" fill="#d9e2ec" font-family="sans-serif" font-size="22" font-weight="700">${title}</text>
    <text x="44" y="135" fill="#9fb3c8" font-family="sans-serif" font-size="16">DOKUMENTASI LAPANGAN TERPROTEKSI (EXIF STRIPPED + SHA256 VERIFIED)</text>
    <rect x="44" y="165" width="240" height="36" rx="4" fill="#b78a28"/>
    <text x="58" y="189" fill="#ffffff" font-family="monospace" font-size="15" font-weight="700">${badgeText}</text>
    <text x="44" y="378" fill="#faf0d7" font-family="monospace" font-size="16" font-weight="700">WAKTU AMBIL : ${timestamp} WIB</text>
    <text x="44" y="408" fill="#ffffff" font-family="monospace" font-size="16">KOORDINAT   : ${lat.toFixed(6)}, ${lng.toFixed(6)}</text>
    <text x="44" y="438" fill="#9fb3c8" font-family="monospace" font-size="14">SATRESNARKOBA POLRES METRO JAKARTA PUSAT - RAHASIA DINAS</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

interface MockUserRecord extends UserProfileDto {
  passwordPlain: string;
  failedLoginCount: number;
  lockedUntil?: number;
}

const MOCK_SATUAN: SatuanDto[] = [
  {
    id: 'sat-polres-01',
    kode: 'POLRES-JP',
    nama: 'Polres Metro Jakarta Pusat',
    tipe: TipeSatuan.POLRES,
    parentId: null,
    wilayah: 'Jakarta Pusat'
  },
  {
    id: 'sat-polsek-01',
    kode: 'POLSEK-GMB',
    nama: 'Polsek Metro Gambir',
    tipe: TipeSatuan.POLSEK,
    parentId: 'sat-polres-01',
    wilayah: 'Kec. Gambir, Jakarta Pusat'
  },
  {
    id: 'sat-polsek-02',
    kode: 'POLSEK-TNA',
    nama: 'Polsek Metro Tanah Abang',
    tipe: TipeSatuan.POLSEK,
    parentId: 'sat-polres-01',
    wilayah: 'Kec. Tanah Abang, Jakarta Pusat'
  }
];

const MOCK_USERS: MockUserRecord[] = [
  {
    id: 'usr-bhabin-01',
    nrp: '88010101',
    nama: 'Aipda Hendra Wijaya',
    pangkat: 'AIPDA',
    jabatan: 'Bhabinkamtibmas Kel. Petojo Utara',
    role: Role.BHABIN,
    satuanId: 'sat-polsek-01',
    satuanNama: 'Polsek Metro Gambir',
    wilayah: 'Kec. Gambir, Jakarta Pusat',
    noHp: '081210001001',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T07:30:00.000Z'
  },
  {
    id: 'usr-kapolsek-01',
    nrp: '79020202',
    nama: 'Kompol Darmawan, S.I.K.',
    pangkat: 'KOMPOL',
    jabatan: 'Kapolsek Metro Gambir',
    role: Role.KAPOLSEK,
    satuanId: 'sat-polsek-01',
    satuanNama: 'Polsek Metro Gambir',
    wilayah: 'Kec. Gambir, Jakarta Pusat',
    noHp: '081210001002',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T08:00:00.000Z'
  },
  {
    id: 'usr-kapolres-01',
    nrp: '75030303',
    nama: 'Kombes Pol Bambang Sutrisno, S.I.K., M.Si.',
    pangkat: 'KOMBES POL',
    jabatan: 'Kapolres Metro Jakarta Pusat',
    role: Role.KAPOLRES,
    satuanId: 'sat-polres-01',
    satuanNama: 'Polres Metro Jakarta Pusat',
    wilayah: 'Jakarta Pusat',
    noHp: '081210001003',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T08:15:00.000Z'
  },
  {
    id: 'usr-binmas-01',
    nrp: '78040404',
    nama: 'AKBP Rahmat Hidayat, S.H.',
    pangkat: 'AKBP',
    jabatan: 'Kasat Binmas Polres Metro Jakarta Pusat',
    role: Role.KASAT_BINMAS,
    satuanId: 'sat-polres-01',
    satuanNama: 'Polres Metro Jakarta Pusat',
    wilayah: 'Jakarta Pusat',
    noHp: '081210001004',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T08:20:00.000Z'
  },
  {
    id: 'usr-kasat-01',
    nrp: '80050505',
    nama: 'AKBP Yudha Pratama, S.I.K.',
    pangkat: 'AKBP',
    jabatan: 'Kasat Resnarkoba Polres Metro Jakarta Pusat',
    role: Role.KASAT_NARKOBA,
    satuanId: 'sat-polres-01',
    satuanNama: 'Polres Metro Jakarta Pusat',
    wilayah: 'Jakarta Pusat',
    noHp: '081210001005',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T08:30:00.000Z'
  },
  {
    id: 'usr-penyidik-01',
    nrp: '85060606',
    nama: 'Iptu Rian Firmansyah, S.H.',
    pangkat: 'IPTU',
    jabatan: 'Kanit I Lidik Satresnarkoba',
    role: Role.PENYIDIK,
    satuanId: 'sat-polres-01',
    satuanNama: 'Polres Metro Jakarta Pusat',
    wilayah: 'Jakarta Pusat',
    noHp: '081210001006',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T08:45:00.000Z'
  },
  {
    id: 'usr-penyidik-02',
    nrp: '86060607',
    nama: 'Ipda Dimas Prasetyo, S.Tr.K.',
    pangkat: 'IPDA',
    jabatan: 'Kanit II Lidik Satresnarkoba',
    role: Role.PENYIDIK,
    satuanId: 'sat-polres-01',
    satuanNama: 'Polres Metro Jakarta Pusat',
    wilayah: 'Jakarta Pusat',
    noHp: '081210001007',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T08:50:00.000Z'
  },
  {
    id: 'usr-kbo-01',
    nrp: '83070707',
    nama: 'Iptu Surya Kencana, S.H.',
    pangkat: 'IPTU',
    jabatan: 'KBO Satresnarkoba',
    role: Role.KBO,
    satuanId: 'sat-polres-01',
    satuanNama: 'Polres Metro Jakarta Pusat',
    wilayah: 'Jakarta Pusat',
    noHp: '081210001008',
    isActive: true,
    mustChangePassword: false,
    hasActiveDelegation: true,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T09:00:00.000Z'
  },
  {
    id: 'usr-admin-01',
    nrp: '90080808',
    nama: 'Bripka Aditya Nugraha, S.Kom.',
    pangkat: 'BRIPKA',
    jabatan: 'Bamin Sie TIK Polres Metro Jakarta Pusat',
    role: Role.ADMIN,
    satuanId: 'sat-polres-01',
    satuanNama: 'Polres Metro Jakarta Pusat',
    wilayah: 'Jakarta Pusat',
    noHp: '081210001009',
    isActive: true,
    mustChangePassword: false,
    passwordPlain: 'Password#123',
    failedLoginCount: 0,
    lastLoginAt: '2026-10-27T09:10:00.000Z'
  },
  {
    id: 'usr-bhabin-02',
    nrp: '91090909',
    nama: 'Briptu Fajar Ramadhan',
    pangkat: 'BRIPTU',
    jabatan: 'Bhabinkamtibmas Kel. Kebon Melati',
    role: Role.BHABIN,
    satuanId: 'sat-polsek-02',
    satuanNama: 'Polsek Metro Tanah Abang',
    wilayah: 'Kec. Tanah Abang, Jakarta Pusat',
    noHp: '081210001010',
    isActive: true,
    mustChangePassword: true,
    passwordPlain: 'Password#123',
    failedLoginCount: 0
  }
];

const todayIsoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

const tomorrowIsoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date(Date.now() + 3 * 86400000));

const MOCK_DELEGASI: DelegasiDto[] = [
  {
    id: 'del-01',
    dariUserId: 'usr-kasat-01',
    dariUserNama: 'AKBP Yudha Pratama, S.I.K.',
    dariUserPangkat: 'AKBP',
    keUserId: 'usr-kbo-01',
    keUserNama: 'Iptu Surya Kencana, S.H.',
    keUserPangkat: 'IPTU',
    nrpTujuan: '83070707',
    tglMulai: todayIsoDate,
    tglSelesai: tomorrowIsoDate,
    cakupan: CakupanDelegasi.SEMUA,
    isRevoked: false,
    revokedAt: null,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'del-02',
    dariUserId: 'usr-kasat-01',
    dariUserNama: 'AKBP Yudha Pratama, S.I.K.',
    dariUserPangkat: 'AKBP',
    keUserId: 'usr-kbo-01',
    keUserNama: 'Iptu Surya Kencana, S.H.',
    keUserPangkat: 'IPTU',
    nrpTujuan: '83070707',
    tglMulai: '2026-09-01',
    tglSelesai: '2026-09-04',
    cakupan: CakupanDelegasi.SEMUA,
    isRevoked: false,
    revokedAt: null,
    createdAt: '2026-09-01T01:00:00.000Z'
  }
];

const MOCK_LAPORAN: LaporanDto[] = [
  {
    id: 'lap-0001',
    noLaporan: 'LP/NRK/2026/0001',
    pelaporId: 'usr-bhabin-01',
    pelaporNama: 'Aipda Hendra Wijaya',
    pelaporPangkat: 'AIPDA',
    pelaporNrp: '88010101',
    satuanId: 'sat-polsek-01',
    satuanNama: 'Polsek Metro Gambir',
    wilayah: 'Kec. Gambir, Jakarta Pusat',
    namaObjek: 'Rumah Kontrakan Petak Tiga Jl. Kesehatan IV No. 12B',
    latitude: -6.17142,
    longitude: 106.81628,
    deskripsi:
      'Laporan warga terkait aktivitas keluar masuk kendaraan roda dua tidak dikenal antara pukul 01.00 s.d. 04.00 WIB disertai transaksi bungkusan plastik klip kecil di gang samping kontrakan.',
    status: StatusLaporan.BARU,
    waktuLapor: new Date(Date.now() - 3600000 * 3).toISOString(),
    foto: [
      {
        id: 'foto-101',
        laporanId: 'lap-0001',
        signedUrl: createEvidenceSvgDataUrl(
          'TAMPAK DEPAN KONTRAKAN JL. KESEHATAN IV',
          '2026-10-27 06:42:11',
          -6.17142,
          106.81628,
          'LP/NRK/2026/0001 #1'
        ),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        diambilPada: new Date(Date.now() - 3600000 * 3.1).toISOString(),
        latitude: -6.17142,
        longitude: 106.81628,
        hashFile: 'a91f4c82d0b3e7f1928374655463728190abcdef1234567890abcdef12345678'
      },
      {
        id: 'foto-102',
        laporanId: 'lap-0001',
        signedUrl: createEvidenceSvgDataUrl(
          'AKSES GANG SAMPING TITIK TRANSAKSI',
          '2026-10-27 06:44:05',
          -6.17145,
          106.81631,
          'LP/NRK/2026/0001 #2'
        ),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        diambilPada: new Date(Date.now() - 3600000 * 3.05).toISOString(),
        latitude: -6.17145,
        longitude: 106.81631,
        hashFile: 'b82e5d93e1c4f8a2039485766574839201bcdef0123456789abcdef012345679'
      }
    ],
    riwayatDisposisi: [],
    penyidikan: null
  },
  {
    id: 'lap-0002',
    noLaporan: 'LP/NRK/2026/0002',
    pelaporId: 'usr-bhabin-01',
    pelaporNama: 'Aipda Hendra Wijaya',
    pelaporPangkat: 'AIPDA',
    pelaporNrp: '88010101',
    satuanId: 'sat-polsek-01',
    satuanNama: 'Polsek Metro Gambir',
    wilayah: 'Kec. Gambir, Jakarta Pusat',
    namaObjek: 'Gudang Eks Ekspedisi Jl. Cideng Timur RT 04/02',
    latitude: -6.17539,
    longitude: 106.81104,
    deskripsi:
      'Terpantau bongkar muat kardus mencurigakan pada malam hari tanpa papan nama usaha aktif. Ditemukan bekas alat hisap di area parkir belakang.',
    status: StatusLaporan.DIDISPOSISI,
    waktuLapor: new Date(Date.now() - 3600000 * 18).toISOString(),
    foto: [
      {
        id: 'foto-201',
        laporanId: 'lap-0002',
        signedUrl: createEvidenceSvgDataUrl(
          'PINTU BESI GUDANG EKS EKSPEDISI CIDENG',
          '2026-10-26 21:15:30',
          -6.17539,
          106.81104,
          'LP/NRK/2026/0002 #1'
        ),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        diambilPada: new Date(Date.now() - 3600000 * 18.2).toISOString(),
        latitude: -6.17539,
        longitude: 106.81104,
        hashFile: 'c73f6e04f2d509b3140596877685940312cdef0123456789abcdef012345678a'
      }
    ],
    riwayatDisposisi: [
      {
        id: 'disp-001',
        laporanId: 'lap-0002',
        noLaporan: 'LP/NRK/2026/0002',
        wilayah: 'Kec. Gambir, Jakarta Pusat',
        dariUserId: 'usr-kasat-01',
        dariUserNama: 'AKBP Yudha Pratama, S.I.K.',
        dariUserPangkat: 'AKBP',
        keUserId: 'usr-penyidik-01',
        keUserNama: 'Iptu Rian Firmansyah, S.H.',
        keUserPangkat: 'IPTU',
        keUserNrp: '85060606',
        catatan:
          'Lakukan observasi tertutup (undercover) bersama Unit I Lidik malam ini dan laporkan hasil penyelidikan lapangan.',
        status: StatusDisposisi.DIPROSES,
        waktuDisposisi: new Date(Date.now() - 3600000 * 14).toISOString(),
        laporanStatus: StatusLaporan.DIDISPOSISI
      }
    ],
    penyidikan: null
  },
  {
    id: 'lap-0003',
    noLaporan: 'LP/NRK/2026/0003',
    pelaporId: 'usr-bhabin-01',
    pelaporNama: 'Aipda Hendra Wijaya',
    pelaporPangkat: 'AIPDA',
    pelaporNrp: '88010101',
    satuanId: 'sat-polsek-02',
    satuanNama: 'Polsek Metro Tanah Abang',
    wilayah: 'Kec. Tanah Abang, Jakarta Pusat',
    namaObjek: 'Kamar Kos Lantai 3 Jl. Kebon Kacang IX No. 45',
    latitude: -6.19125,
    longitude: 106.81542,
    deskripsi:
      'Informasi pengurus RT mengenai penghuni kamar 304 yang kerap menerima paket kurir instan tengah malam dan tercium bau menyengat.',
    status: StatusLaporan.SELESAI_BENAR,
    waktuLapor: new Date(Date.now() - 3600000 * 48).toISOString(),
    foto: [
      {
        id: 'foto-301',
        laporanId: 'lap-0003',
        signedUrl: createEvidenceSvgDataUrl(
          'AREA KOS JL. KEBON KACANG IX NO. 45',
          '2026-10-25 14:20:00',
          -6.19125,
          106.81542,
          'LP/NRK/2026/0003 #1'
        ),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        diambilPada: new Date(Date.now() - 3600000 * 48.2).toISOString(),
        latitude: -6.19125,
        longitude: 106.81542,
        hashFile: 'd6407f1503e61ac4251607988796051423def0123456789abcdef0123456789b'
      }
    ],
    riwayatDisposisi: [
      {
        id: 'disp-002',
        laporanId: 'lap-0003',
        noLaporan: 'LP/NRK/2026/0003',
        wilayah: 'Kec. Tanah Abang, Jakarta Pusat',
        dariUserId: 'usr-kasat-01',
        dariUserNama: 'AKBP Yudha Pratama, S.I.K.',
        dariUserPangkat: 'AKBP',
        keUserId: 'usr-penyidik-01',
        keUserNama: 'Iptu Rian Firmansyah, S.H.',
        keUserPangkat: 'IPTU',
        keUserNrp: '85060606',
        catatan: 'Koordinasikan dengan Ketua RT setempat untuk pengecekan dan penindakan.',
        status: StatusDisposisi.SELESAI,
        waktuDisposisi: new Date(Date.now() - 3600000 * 42).toISOString(),
        laporanStatus: StatusLaporan.SELESAI_BENAR
      }
    ],
    penyidikan: {
      id: 'sidik-001',
      laporanId: 'lap-0003',
      disposisiId: 'disp-002',
      penyidikId: 'usr-penyidik-01',
      penyidikNama: 'Iptu Rian Firmansyah, S.H.',
      penyidikPangkat: 'IPTU',
      penyidikNrp: '85060606',
      hasil: HasilPenyidikan.BENAR,
      deskripsi:
        'Telah dilakukan penyelidikan dan penggeledahan disaksikan pengurus RT. Ditemukan barang bukti 4 paket plastik klip diduga narkotika golongan I jenis sabu seberat bruto 3,84 gram beserta timbangan digital. Tersangka diamankan ke Mako Polres.',
      waktuSelesai: new Date(Date.now() - 3600000 * 30).toISOString(),
      foto: [
        {
          id: 'fsidik-01',
          penyidikanId: 'sidik-001',
          signedUrl: createEvidenceSvgDataUrl(
            'DOKUMENTASI HASIL PENYIDIKAN KAMAR 304',
            '2026-10-26 09:12:44',
            -6.19125,
            106.81542,
            'HASIL: BENAR (BB DIAMANKAN)'
          ),
          expiresAt: new Date(Date.now() + 60000).toISOString(),
          diambilPada: new Date(Date.now() - 3600000 * 30.2).toISOString(),
          hashFile: 'e551802614f72bd5362718099807162534ef0123456789abcdef01234567890c'
        }
      ]
    }
  },
  {
    id: 'lap-0004',
    noLaporan: 'LP/NRK/2026/0004',
    pelaporId: 'usr-bhabin-01',
    pelaporNama: 'Aipda Hendra Wijaya',
    pelaporPangkat: 'AIPDA',
    pelaporNrp: '88010101',
    satuanId: 'sat-polsek-01',
    satuanNama: 'Polsek Metro Gambir',
    wilayah: 'Kec. Gambir, Jakarta Pusat',
    namaObjek: 'Warung Kopi Pojok Rel Jl. Duri Pulo',
    latitude: -6.16612,
    longitude: 106.80744,
    deskripsi:
      'Aduan masyarakat mengenai dugaan peredaran obat keras daftar G tanpa izin edar di sekitar kios pinggir rel.',
    status: StatusLaporan.SELESAI_TIDAK_BENAR,
    waktuLapor: new Date(Date.now() - 3600000 * 72).toISOString(),
    foto: [
      {
        id: 'foto-401',
        laporanId: 'lap-0004',
        signedUrl: createEvidenceSvgDataUrl(
          'LOKASI WARUNG KOPI POJOK JL. DURI PULO',
          '2026-10-24 16:05:19',
          -6.16612,
          106.80744,
          'LP/NRK/2026/0004 #1'
        ),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        diambilPada: new Date(Date.now() - 3600000 * 72.1).toISOString(),
        latitude: -6.16612,
        longitude: 106.80744,
        hashFile: 'f462913725083ce64738291aa918273645f0123456789abcdef012345678901d'
      }
    ],
    riwayatDisposisi: [
      {
        id: 'disp-003',
        laporanId: 'lap-0004',
        noLaporan: 'LP/NRK/2026/0004',
        wilayah: 'Kec. Gambir, Jakarta Pusat',
        dariUserId: 'usr-kasat-01',
        dariUserNama: 'AKBP Yudha Pratama, S.I.K.',
        dariUserPangkat: 'AKBP',
        keUserId: 'usr-penyidik-02',
        keUserNama: 'Ipda Dimas Prasetyo, S.Tr.K.',
        keUserPangkat: 'IPDA',
        keUserNrp: '86060607',
        catatan: 'Cek kebenaran informasi di lapangan.',
        status: StatusDisposisi.SELESAI,
        waktuDisposisi: new Date(Date.now() - 3600000 * 68).toISOString(),
        laporanStatus: StatusLaporan.SELESAI_TIDAK_BENAR
      }
    ],
    penyidikan: {
      id: 'sidik-002',
      laporanId: 'lap-0004',
      disposisiId: 'disp-003',
      penyidikId: 'usr-penyidik-02',
      penyidikNama: 'Ipda Dimas Prasetyo, S.Tr.K.',
      penyidikPangkat: 'IPDA',
      penyidikNrp: '86060607',
      hasil: HasilPenyidikan.TIDAK_BENAR,
      deskripsi:
        'Setelah dilakukan pemantauan 2x24 jam dan pemeriksaan lokasi, tidak ditemukan indikasi peredaran narkotika maupun obat keras ilegal. Aktivitas malam hari merupakan pedagang pasar subuh.',
      waktuSelesai: new Date(Date.now() - 3600000 * 50).toISOString(),
      foto: []
    }
  }
];

const MOCK_NOTIFIKASI: NotifikasiDto[] = [
  {
    id: 'notif-01',
    userId: 'ALL',
    laporanId: 'lap-0001',
    noLaporan: 'LP/NRK/2026/0001',
    wilayah: 'Kec. Gambir, Jakarta Pusat',
    tipe: TipeNotifikasi.LAPORAN_BARU,
    judul: 'Laporan Informasi Baru Masuk',
    isiRingkas: 'Laporan baru LP/NRK/2026/0001 – Kec. Gambir, Jakarta Pusat – 3 jam lalu',
    waktu: new Date(Date.now() - 3600000 * 3).toISOString(),
    dibacaAt: null
  },
  {
    id: 'notif-02',
    userId: 'ALL',
    laporanId: 'lap-0002',
    noLaporan: 'LP/NRK/2026/0002',
    wilayah: 'Kec. Gambir, Jakarta Pusat',
    tipe: TipeNotifikasi.DISPOSISI,
    judul: 'Disposisi Laporan LP/NRK/2026/0002',
    isiRingkas: 'Disposisi baru LP/NRK/2026/0002 – Kec. Gambir, Jakarta Pusat',
    waktu: new Date(Date.now() - 3600000 * 14).toISOString(),
    dibacaAt: null
  },
  {
    id: 'notif-03',
    userId: 'ALL',
    laporanId: 'lap-0003',
    noLaporan: 'LP/NRK/2026/0003',
    wilayah: 'Kec. Tanah Abang, Jakarta Pusat',
    tipe: TipeNotifikasi.HASIL_PENYIDIKAN,
    judul: 'Hasil Penyidikan Masuk',
    isiRingkas: 'Hasil penyidikan LP/NRK/2026/0003 telah masuk',
    waktu: new Date(Date.now() - 3600000 * 30).toISOString(),
    dibacaAt: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

const MOCK_AUDIT_LOGS: AuditLogDto[] = [
  {
    id: 'aud-01',
    userId: 'usr-bhabin-01',
    userNrp: '88010101',
    userNama: 'Aipda Hendra Wijaya',
    userRole: Role.BHABIN,
    aksi: 'BUAT_LAPORAN',
    entitas: 'laporan',
    entitasId: 'lap-0001',
    ip: '10.24.11.42',
    userAgent: 'Capacitor/Android SIPINAR/1.0',
    waktu: new Date(Date.now() - 3600000 * 3).toISOString(),
    meta: { noLaporan: 'LP/NRK/2026/0001' }
  },
  {
    id: 'aud-02',
    userId: 'usr-kasat-01',
    userNrp: '80050505',
    userNama: 'AKBP Yudha Pratama, S.I.K.',
    userRole: Role.KASAT_NARKOBA,
    aksi: 'LIHAT_DETAIL',
    entitas: 'laporan',
    entitasId: 'lap-0002',
    ip: '10.24.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    waktu: new Date(Date.now() - 3600000 * 14.2).toISOString(),
    meta: { noLaporan: 'LP/NRK/2026/0002' }
  },
  {
    id: 'aud-03',
    userId: 'usr-kasat-01',
    userNrp: '80050505',
    userNama: 'AKBP Yudha Pratama, S.I.K.',
    userRole: Role.KASAT_NARKOBA,
    aksi: 'DISPOSISI',
    entitas: 'disposisi',
    entitasId: 'disp-001',
    ip: '10.24.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    waktu: new Date(Date.now() - 3600000 * 14).toISOString(),
    meta: { noLaporan: 'LP/NRK/2026/0002', keNrp: '85060606' }
  },
  {
    id: 'aud-04',
    userId: 'usr-penyidik-01',
    userNrp: '85060606',
    userNama: 'Iptu Rian Firmansyah, S.H.',
    userRole: Role.PENYIDIK,
    aksi: 'PENYIDIKAN',
    entitas: 'penyidikan',
    entitasId: 'sidik-001',
    ip: '10.24.8.19',
    userAgent: 'Capacitor/Android SIPINAR/1.0',
    waktu: new Date(Date.now() - 3600000 * 30).toISOString(),
    meta: { noLaporan: 'LP/NRK/2026/0003', hasil: 'BENAR' }
  }
];

const processedIdempotencyKeys = new Map<string, LaporanDto>();

function recordAudit(
  user: UserProfileDto | null,
  aksi: AuditLogDto['aksi'],
  entitas: string,
  entitasId: string,
  meta?: Record<string, unknown>
): void {
  MOCK_AUDIT_LOGS.unshift({
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: user?.id ?? 'anonymous',
    userNrp: user?.nrp ?? '-',
    userNama: user?.nama ?? 'Anonim',
    userRole: user?.role ?? Role.BHABIN,
    aksi,
    entitas,
    entitasId,
    ip: '10.24.1.105',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'SIPINAR-Client/1.0',
    waktu: new Date().toISOString(),
    meta
  });
}

function isKboDelegationActiveForUser(kboUserId: string, laporanId?: string): boolean {
  return MOCK_DELEGASI.some((d) => {
    if (d.keUserId !== kboUserId) return false;
    const status = computeStatusDelegasi(d.tglMulai, d.tglSelesai, d.isRevoked);
    if (status !== 'AKTIF') return false;
    if (d.cakupan === CakupanDelegasi.TERTENTU && laporanId) {
      return d.laporanIds?.includes(laporanId) ?? false;
    }
    return true;
  });
}

/**
 * Implementasi terpusat `canViewLaporanDetail(user, laporan)` sesuai kontrak bagian 4
 */
export function canViewLaporanDetail(user: UserProfileDto, laporan: LaporanDto): boolean {
  if (user.role === Role.KASAT_NARKOBA) {
    return true;
  }
  if (user.role === Role.PENYIDIK) {
    return Boolean(laporan.riwayatDisposisi?.some((d) => d.keUserId === user.id));
  }
  if (user.role === Role.KBO) {
    return isKboDelegationActiveForUser(user.id, laporan.id);
  }
  if (user.role === Role.BHABIN) {
    return laporan.pelaporId === user.id;
  }
  return false;
}

function getAuthenticatedUserFromHeader(req: HttpRequest<unknown>): MockUserRecord | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer mock-jwt-')) {
    return null;
  }
  const userId = authHeader.replace('Bearer mock-jwt-', '').split('::')[0];
  const found = MOCK_USERS.find((u) => u.id === userId && u.isActive);
  if (found && found.role === Role.KBO) {
    found.hasActiveDelegation = isKboDelegationActiveForUser(found.id);
  }
  return found ?? null;
}

function toPublicProfile(user: MockUserRecord): UserProfileDto {
  const { passwordPlain, failedLoginCount, lockedUntil, ...profile } = user;
  if (profile.role === Role.KBO) {
    profile.hasActiveDelegation = isKboDelegationActiveForUser(profile.id);
  }
  return { ...profile };
}

function okResponse<T>(
  data: T,
  message = 'Berhasil',
  meta?: { page: number; limit: number; total: number }
): Observable<HttpEvent<ApiResponse<T>>> {
  return of(
    new HttpResponse<ApiResponse<T>>({
      status: 200,
      body: {
        success: true,
        data,
        message,
        ...(meta ? { meta } : {})
      }
    })
  ).pipe(delay(80));
}

function errorResponse(
  status: number,
  message: string,
  errors?: { field: string; message: string }[]
): Observable<never> {
  return throwError(
    () =>
      new HttpErrorResponse({
        status,
        error: {
          success: false,
          data: null,
          message,
          errors
        }
      })
  );
}

export const mockApiInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  if (!environment.useMockApi || !req.url.startsWith(environment.apiBaseUrl)) {
    return next(req);
  }

  const path = req.url.slice(environment.apiBaseUrl.length);
  const method = req.method.toUpperCase();

  // 1. POST /auth/login
  if (method === 'POST' && path === '/auth/login') {
    const body = req.body as { nrp?: string; password?: string };
    const nrp = (body?.nrp ?? '').trim();
    const password = body?.password ?? '';

    const user = MOCK_USERS.find((u) => u.nrp === nrp);
    if (!user) {
      recordAudit(null, 'LOGIN_GAGAL', 'users', nrp, { reason: 'NRP_NOT_FOUND' });
      return errorResponse(401, 'NRP atau kata sandi tidak sesuai.');
    }

    if (!user.isActive) {
      return errorResponse(403, 'Akun personel telah dinonaktifkan oleh Administrator.');
    }

    if (user.lockedUntil && user.lockedUntil > Date.now()) {
      const menitSisa = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return errorResponse(
        423,
        `Akun terkunci sementara karena kesalahan berulang. Coba lagi dalam ${menitSisa} menit.`
      );
    }

    if (user.passwordPlain !== password) {
      user.failedLoginCount += 1;
      recordAudit(toPublicProfile(user), 'LOGIN_GAGAL', 'users', user.id, {
        failedLoginCount: user.failedLoginCount
      });
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = Date.now() + 15 * 60 * 1000;
        return errorResponse(
          423,
          'Akun dikunci sementara selama 15 menit karena 5 kali gagal masuk.'
        );
      }
      return errorResponse(
        401,
        `NRP atau kata sandi tidak sesuai. Percobaan gagal ke-${user.failedLoginCount} dari 5.`
      );
    }

    user.failedLoginCount = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date().toISOString();
    const profile = toPublicProfile(user);
    recordAudit(profile, 'LOGIN', 'users', user.id);

    return okResponse(
      {
        accessToken: `mock-jwt-${user.id}::${Date.now()}`,
        refreshToken: `mock-refresh-${user.id}::${Date.now()}`,
        user: profile
      },
      'Berhasil masuk'
    );
  }

  // 2. POST /auth/refresh
  if (method === 'POST' && path === '/auth/refresh') {
    const body = req.body as { refreshToken?: string };
    const rt = body?.refreshToken ?? '';
    if (!rt.startsWith('mock-refresh-')) {
      return errorResponse(401, 'Refresh token tidak valid');
    }
    const userId = rt.replace('mock-refresh-', '').split('::')[0];
    const user = MOCK_USERS.find((u) => u.id === userId && u.isActive);
    if (!user) {
      return errorResponse(401, 'Pengguna tidak aktif');
    }
    return okResponse({
      accessToken: `mock-jwt-${user.id}::${Date.now()}`,
      refreshToken: `mock-refresh-${user.id}::${Date.now()}`,
      user: toPublicProfile(user)
    });
  }

  // 3. POST /auth/logout
  if (method === 'POST' && path === '/auth/logout') {
    return okResponse(null, 'Berhasil keluar');
  }

  // Semua endpoint berikutnya wajib terautentikasi
  const currentUser = getAuthenticatedUserFromHeader(req);
  if (!currentUser) {
    return errorResponse(401, 'Sesi tidak valid atau telah berakhir.');
  }

  // 4. GET /auth/me
  if (method === 'GET' && path === '/auth/me') {
    return okResponse(toPublicProfile(currentUser));
  }

  // 5. POST /auth/change-password
  if (method === 'POST' && path === '/auth/change-password') {
    const body = req.body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    if (body.currentPassword !== currentUser.passwordPlain) {
      return errorResponse(422, 'Kata sandi saat ini tidak sesuai.', [
        { field: 'currentPassword', message: 'Kata sandi lama salah' }
      ]);
    }
    if (!body.newPassword || body.newPassword.length < 10) {
      return errorResponse(422, 'Kata sandi baru minimal 10 karakter.', [
        { field: 'newPassword', message: 'Minimal 10 karakter dengan kombinasi huruf & angka' }
      ]);
    }
    currentUser.passwordPlain = body.newPassword;
    currentUser.mustChangePassword = false;
    recordAudit(toPublicProfile(currentUser), 'UBAH_USER', 'users', currentUser.id, {
      action: 'CHANGE_PASSWORD'
    });
    return okResponse(toPublicProfile(currentUser), 'Kata sandi berhasil diperbarui.');
  }

  // 6. POST /auth/device-token
  if (method === 'POST' && path === '/auth/device-token') {
    return okResponse({ saved: true }, 'Token perangkat tersimpan');
  }

  // 7. GET /laporan/saya (BHABIN)
  if (method === 'GET' && path === '/laporan/saya') {
    if (currentUser.role !== Role.BHABIN) {
      return errorResponse(403, 'Hanya Bhabin yang dapat mengakses daftar laporan sendiri.');
    }
    const list = MOCK_LAPORAN.filter((l) => l.pelaporId === currentUser.id).map((l) => ({
      ...l,
      foto: undefined
    }));
    return okResponse(list, 'Daftar laporan saya berhasil dimuat');
  }

  // 8. POST /laporan (BHABIN)
  if (method === 'POST' && path === '/laporan') {
    if (currentUser.role !== Role.BHABIN) {
      return errorResponse(403, 'Hanya Bhabinkamtibmas yang berwenang membuat laporan.');
    }

    const idemHeader = req.headers.get('X-Idempotency-Key');
    let namaObjek = '';
    let latitude = -6.17539;
    let longitude = 106.82715;
    let deskripsi = '';
    let fotoItems: {
      id: string;
      dataUrl: string;
      diambilPada: string;
      latitude: number;
      longitude: number;
    }[] = [];

    if (req.body instanceof FormData) {
      const fd = req.body;
      namaObjek = String(fd.get('nama_objek') ?? '').trim();
      latitude = parseFloat(String(fd.get('latitude') ?? '-6.17539'));
      longitude = parseFloat(String(fd.get('longitude') ?? '106.82715'));
      deskripsi = String(fd.get('deskripsi') ?? '').trim();
      const fotoJson = fd.get('foto_json');
      if (typeof fotoJson === 'string') {
        try {
          fotoItems = JSON.parse(fotoJson);
        } catch {
          fotoItems = [];
        }
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      const b = req.body as Record<string, unknown>;
      namaObjek = String(b['nama_objek'] ?? '').trim();
      latitude = Number(b['latitude'] ?? -6.17539);
      longitude = Number(b['longitude'] ?? 106.82715);
      deskripsi = String(b['deskripsi'] ?? '').trim();
    }

    if (idemHeader && processedIdempotencyKeys.has(idemHeader)) {
      return okResponse(
        processedIdempotencyKeys.get(idemHeader)!,
        'Laporan telah tercatat sebelumnya (Idempoten).'
      );
    }

    if (!namaObjek || !deskripsi) {
      return errorResponse(422, 'Data laporan belum lengkap.', [
        { field: 'nama_objek', message: 'Nama objek/tempat wajib diisi' },
        { field: 'deskripsi', message: 'Deskripsi wajib diisi' }
      ]);
    }

    const seq = String(MOCK_LAPORAN.length + 1).padStart(4, '0');
    const noLaporan = `LP/NRK/2026/${seq}`;
    const newId = `lap-${seq}`;
    const nowIso = new Date().toISOString();

    const created: LaporanDto = {
      id: newId,
      noLaporan,
      pelaporId: currentUser.id,
      pelaporNama: currentUser.nama,
      pelaporPangkat: currentUser.pangkat,
      pelaporNrp: currentUser.nrp,
      satuanId: currentUser.satuanId,
      satuanNama: currentUser.satuanNama,
      wilayah: currentUser.wilayah,
      namaObjek,
      latitude,
      longitude,
      deskripsi,
      status: StatusLaporan.BARU,
      waktuLapor: nowIso,
      foto: (fotoItems.length > 0
        ? fotoItems
        : [
            {
              id: `foto-${Date.now()}`,
              dataUrl: createEvidenceSvgDataUrl(
                namaObjek.toUpperCase().slice(0, 34),
                nowIso.slice(0, 19).replace('T', ' '),
                latitude,
                longitude,
                `${noLaporan} #1`
              ),
              diambilPada: nowIso,
              latitude,
              longitude
            }
          ]
      ).map((f, idx) => ({
        id: f.id || `foto-${Date.now()}-${idx}`,
        laporanId: newId,
        signedUrl: f.dataUrl,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        diambilPada: f.diambilPada || nowIso,
        latitude: f.latitude || latitude,
        longitude: f.longitude || longitude,
        hashFile: `sha256_${Date.now()}_${idx}`
      })),
      riwayatDisposisi: [],
      penyidikan: null
    };

    MOCK_LAPORAN.unshift(created);
    if (idemHeader) {
      processedIdempotencyKeys.set(idemHeader, created);
    }

    // Buat notifikasi tanpa data sensitif untuk 4 penerima
    MOCK_NOTIFIKASI.unshift({
      id: `notif-${Date.now()}`,
      userId: 'ALL',
      laporanId: created.id,
      noLaporan: created.noLaporan,
      wilayah: created.wilayah,
      tipe: TipeNotifikasi.LAPORAN_BARU,
      judul: 'Laporan Informasi Baru',
      isiRingkas: `Laporan baru ${created.noLaporan} – ${created.wilayah} – Baru saja`,
      waktu: nowIso,
      dibacaAt: null
    });

    recordAudit(toPublicProfile(currentUser), 'BUAT_LAPORAN', 'laporan', created.id, {
      noLaporan: created.noLaporan
    });

    return okResponse(created, `Laporan ${created.noLaporan} berhasil dikirim.`);
  }

  // 9. GET /laporan (KASAT_NARKOBA, PENYIDIK, KBO dengan delegasi aktif)
  if (method === 'GET' && path === '/laporan') {
    if (
      currentUser.role !== Role.KASAT_NARKOBA &&
      currentUser.role !== Role.PENYIDIK &&
      currentUser.role !== Role.KBO
    ) {
      return errorResponse(403, 'Peran Anda tidak memiliki akses ke daftar laporan.');
    }

    if (
      currentUser.role === Role.KBO &&
      !isKboDelegationActiveForUser(currentUser.id)
    ) {
      return errorResponse(
        403,
        'Masa delegasi akses KBO sedang tidak aktif atau telah berakhir.'
      );
    }

    const statusFilter = req.params.get('status') ?? '';
    const satuanFilter = req.params.get('satuan_id') ?? '';
    const tglDari = req.params.get('tgl_dari') ?? '';
    const tglSampai = req.params.get('tgl_sampai') ?? '';
    const q = (req.params.get('q') ?? '').toLowerCase().trim();

    const filtered = MOCK_LAPORAN.filter((l) => {
      if (!canViewLaporanDetail(toPublicProfile(currentUser), l)) {
        return false;
      }
      if (statusFilter && l.status !== statusFilter) {
        return false;
      }
      if (satuanFilter && l.satuanId !== satuanFilter) {
        return false;
      }
      if (tglDari && l.waktuLapor.slice(0, 10) < tglDari) {
        return false;
      }
      if (tglSampai && l.waktuLapor.slice(0, 10) > tglSampai) {
        return false;
      }
      if (q) {
        const hay = `${l.noLaporan} ${l.wilayah} ${l.satuanNama} ${l.namaObjek ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return okResponse(filtered, 'Daftar laporan berhasil dimuat', {
      page: 1,
      limit: 50,
      total: filtered.length
    });
  }

  // 10. GET /laporan/:id (Detail laporan - wajib cek canViewLaporanDetail & wajib audit log)
  const detailMatch = path.match(/^\/laporan\/([^/]+)$/);
  if (method === 'GET' && detailMatch) {
    const laporanId = detailMatch[1];
    const laporan = MOCK_LAPORAN.find((l) => l.id === laporanId);
    if (!laporan) {
      return errorResponse(404, 'Laporan tidak ditemukan.');
    }
    const pubUser = toPublicProfile(currentUser);
    if (!canViewLaporanDetail(pubUser, laporan)) {
      return errorResponse(
        403,
        'Akses ditolak: Anda tidak memiliki hak akses untuk membuka detail laporan ini.'
      );
    }

    // Perbarui masa berlaku signedUrl 60 detik dan catat ke audit_log
    const refreshedFoto = (laporan.foto ?? []).map((f) => ({
      ...f,
      expiresAt: new Date(Date.now() + 60000).toISOString()
    }));
    recordAudit(pubUser, 'LIHAT_DETAIL', 'laporan', laporan.id, {
      noLaporan: laporan.noLaporan
    });

    return okResponse({
      ...laporan,
      foto: refreshedFoto
    });
  }

  // 11. GET /laporan/:id/foto/:fotoId (Signed URL berumur pendek + audit log LIHAT_FOTO)
  const fotoMatch = path.match(/^\/laporan\/([^/]+)\/foto\/([^/]+)$/);
  if (method === 'GET' && fotoMatch) {
    const [, laporanId, fotoId] = fotoMatch;
    const laporan = MOCK_LAPORAN.find((l) => l.id === laporanId);
    if (!laporan) {
      return errorResponse(404, 'Laporan tidak ditemukan.');
    }
    const pubUser = toPublicProfile(currentUser);
    if (!canViewLaporanDetail(pubUser, laporan)) {
      return errorResponse(403, 'Tidak berwenang mengakses foto laporan.');
    }
    const foto = laporan.foto?.find((f) => f.id === fotoId);
    if (!foto) {
      return errorResponse(404, 'Foto tidak ditemukan.');
    }
    recordAudit(pubUser, 'LIHAT_FOTO', 'laporan_foto', foto.id, {
      laporanId: laporan.id,
      noLaporan: laporan.noLaporan
    });
    return okResponse({
      ...foto,
      expiresAt: new Date(Date.now() + 60000).toISOString()
    });
  }

  // 12. POST /laporan/:id/disposisi
  const disposisiPostMatch = path.match(/^\/laporan\/([^/]+)\/disposisi$/);
  if (method === 'POST' && disposisiPostMatch) {
    const laporanId = disposisiPostMatch[1];
    const laporan = MOCK_LAPORAN.find((l) => l.id === laporanId);
    if (!laporan) {
      return errorResponse(404, 'Laporan tidak ditemukan.');
    }

    const canDispose =
      currentUser.role === Role.KASAT_NARKOBA ||
      (currentUser.role === Role.KBO &&
        isKboDelegationActiveForUser(currentUser.id, laporan.id));

    if (!canDispose) {
      return errorResponse(
        403,
        'Hanya Kasat Narkoba atau KBO dengan delegasi aktif yang dapat melakukan disposisi.'
      );
    }

    if (
      laporan.status === StatusLaporan.SELESAI_BENAR ||
      laporan.status === StatusLaporan.SELESAI_TIDAK_BENAR
    ) {
      return errorResponse(422, 'Laporan yang telah selesai tidak dapat didisposisikan ulang.');
    }

    const body = req.body as { ke_user_id?: string; catatan?: string };
    const targetPenyidik = MOCK_USERS.find(
      (u) => u.id === body.ke_user_id && u.role === Role.PENYIDIK && u.isActive
    );
    if (!targetPenyidik) {
      return errorResponse(422, 'Penyidik tujuan tidak valid atau tidak aktif.', [
        { field: 'ke_user_id', message: 'Pilih Penyidik aktif' }
      ]);
    }
    if (!body.catatan?.trim()) {
      return errorResponse(422, 'Catatan instruksi disposisi wajib diisi.', [
        { field: 'catatan', message: 'Catatan disposisi wajib diisi' }
      ]);
    }

    const disp: DisposisiDto = {
      id: `disp-${Date.now()}`,
      laporanId: laporan.id,
      noLaporan: laporan.noLaporan,
      wilayah: laporan.wilayah,
      dariUserId: currentUser.id,
      dariUserNama: currentUser.nama,
      dariUserPangkat: currentUser.pangkat,
      keUserId: targetPenyidik.id,
      keUserNama: targetPenyidik.nama,
      keUserPangkat: targetPenyidik.pangkat,
      keUserNrp: targetPenyidik.nrp,
      catatan: body.catatan.trim(),
      status: StatusDisposisi.DITERIMA,
      waktuDisposisi: new Date().toISOString(),
      laporanStatus: StatusLaporan.DIDISPOSISI
    };

    laporan.status = StatusLaporan.DIDISPOSISI;
    laporan.riwayatDisposisi = [disp, ...(laporan.riwayatDisposisi ?? [])];

    MOCK_NOTIFIKASI.unshift({
      id: `notif-${Date.now()}`,
      userId: targetPenyidik.id,
      laporanId: laporan.id,
      noLaporan: laporan.noLaporan,
      wilayah: laporan.wilayah,
      tipe: TipeNotifikasi.DISPOSISI,
      judul: 'Disposisi Baru Diterima',
      isiRingkas: `Disposisi baru ${laporan.noLaporan}`,
      waktu: disp.waktuDisposisi,
      dibacaAt: null
    });

    recordAudit(toPublicProfile(currentUser), 'DISPOSISI', 'disposisi', disp.id, {
      noLaporan: laporan.noLaporan,
      keNrp: targetPenyidik.nrp
    });

    return okResponse(disp, `Laporan berhasil didisposisikan kepada ${targetPenyidik.pangkat} ${targetPenyidik.nama}.`);
  }

  // 13. GET /penyidik
  if (method === 'GET' && path === '/penyidik') {
    if (currentUser.role !== Role.KASAT_NARKOBA && currentUser.role !== Role.KBO) {
      return errorResponse(403, 'Tidak berwenang melihat daftar penyidik.');
    }
    const list: PenyidikOptionDto[] = MOCK_USERS.filter(
      (u) => u.role === Role.PENYIDIK && u.isActive
    ).map((u) => ({
      id: u.id,
      nrp: u.nrp,
      nama: u.nama,
      pangkat: u.pangkat,
      jabatan: u.jabatan,
      satuanNama: u.satuanNama,
      aktifDisposisiCount: MOCK_LAPORAN.filter(
        (l) =>
          l.status === StatusLaporan.DIDISPOSISI &&
          l.riwayatDisposisi?.[0]?.keUserId === u.id
      ).length
    }));
    return okResponse(list);
  }

  // 14. GET /disposisi/masuk (PENYIDIK)
  if (method === 'GET' && path === '/disposisi/masuk') {
    if (currentUser.role !== Role.PENYIDIK) {
      return errorResponse(403, 'Hanya Penyidik yang dapat mengakses Disposisi Masuk.');
    }
    const result: DisposisiDto[] = [];
    for (const lap of MOCK_LAPORAN) {
      for (const d of lap.riwayatDisposisi ?? []) {
        if (d.keUserId === currentUser.id) {
          result.push({
            ...d,
            noLaporan: lap.noLaporan,
            wilayah: lap.wilayah,
            laporanStatus: lap.status
          });
        }
      }
    }
    return okResponse(result);
  }

  // 15. POST /laporan/:id/penyidikan (PENYIDIK penerima disposisi, hanya sekali)
  const penyidikanPostMatch = path.match(/^\/laporan\/([^/]+)\/penyidikan$/);
  if (method === 'POST' && penyidikanPostMatch) {
    const laporanId = penyidikanPostMatch[1];
    const laporan = MOCK_LAPORAN.find((l) => l.id === laporanId);
    if (!laporan) {
      return errorResponse(404, 'Laporan tidak ditemukan.');
    }
    if (currentUser.role !== Role.PENYIDIK) {
      return errorResponse(403, 'Hanya Penyidik yang dapat mengisi hasil penyidikan.');
    }
    const activeDisposisi = laporan.riwayatDisposisi?.find(
      (d) => d.keUserId === currentUser.id
    );
    if (!activeDisposisi) {
      return errorResponse(403, 'Laporan ini tidak didisposisikan kepada Anda.');
    }
    if (laporan.penyidikan) {
      return errorResponse(
        422,
        'Hasil penyidikan sudah pernah dikirim dan tidak dapat dikirim dua kali.'
      );
    }

    let hasil: HasilPenyidikan = HasilPenyidikan.BENAR;
    let deskripsi = '';
    let fotoDataUrls: string[] = [];

    if (req.body instanceof FormData) {
      const fd = req.body;
      hasil =
        fd.get('hasil') === HasilPenyidikan.TIDAK_BENAR
          ? HasilPenyidikan.TIDAK_BENAR
          : HasilPenyidikan.BENAR;
      deskripsi = String(fd.get('deskripsi') ?? '').trim();
      const rawFotos = fd.get('foto_json');
      if (typeof rawFotos === 'string') {
        try {
          fotoDataUrls = JSON.parse(rawFotos);
        } catch {
          fotoDataUrls = [];
        }
      }
    } else if (typeof req.body === 'object' && req.body !== null) {
      const b = req.body as Record<string, unknown>;
      hasil =
        b['hasil'] === HasilPenyidikan.TIDAK_BENAR
          ? HasilPenyidikan.TIDAK_BENAR
          : HasilPenyidikan.BENAR;
      deskripsi = String(b['deskripsi'] ?? '').trim();
    }

    if (!deskripsi) {
      return errorResponse(422, 'Uraian hasil penyidikan wajib diisi.', [
        { field: 'deskripsi', message: 'Deskripsi hasil penyidikan wajib diisi' }
      ]);
    }

    const nowIso = new Date().toISOString();
    const sidikId = `sidik-${Date.now()}`;
    const penyidikanObj: PenyidikanDto = {
      id: sidikId,
      laporanId: laporan.id,
      disposisiId: activeDisposisi.id,
      penyidikId: currentUser.id,
      penyidikNama: currentUser.nama,
      penyidikPangkat: currentUser.pangkat,
      penyidikNrp: currentUser.nrp,
      hasil,
      deskripsi,
      waktuSelesai: nowIso,
      foto: fotoDataUrls.map((url, idx) => ({
        id: `fsidik-${Date.now()}-${idx}`,
        penyidikanId: sidikId,
        signedUrl: url,
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        diambilPada: nowIso,
        hashFile: `sha256_sidik_${Date.now()}_${idx}`
      }))
    };

    laporan.penyidikan = penyidikanObj;
    laporan.status =
      hasil === HasilPenyidikan.BENAR
        ? StatusLaporan.SELESAI_BENAR
        : StatusLaporan.SELESAI_TIDAK_BENAR;
    activeDisposisi.status = StatusDisposisi.SELESAI;
    activeDisposisi.laporanStatus = laporan.status;

    MOCK_NOTIFIKASI.unshift({
      id: `notif-${Date.now()}`,
      userId: 'usr-kasat-01',
      laporanId: laporan.id,
      noLaporan: laporan.noLaporan,
      wilayah: laporan.wilayah,
      tipe: TipeNotifikasi.HASIL_PENYIDIKAN,
      judul: 'Hasil Penyidikan Masuk',
      isiRingkas: `Hasil penyidikan ${laporan.noLaporan} telah masuk`,
      waktu: nowIso,
      dibacaAt: null
    });

    recordAudit(toPublicProfile(currentUser), 'PENYIDIKAN', 'penyidikan', sidikId, {
      noLaporan: laporan.noLaporan,
      hasil
    });

    return okResponse(penyidikanObj, 'Hasil penyidikan berhasil disimpan.');
  }

  // 16. Notifikasi endpoints
  if (method === 'GET' && path === '/notifikasi/unread-count') {
    const count = MOCK_NOTIFIKASI.filter((n) => !n.dibacaAt).length;
    return okResponse({ count });
  }

  if (method === 'GET' && path === '/notifikasi') {
    const stripDetailLink = NON_DETAIL_ROLES.includes(currentUser.role);
    const items = MOCK_NOTIFIKASI.map((n) => ({
      ...n,
      // Aturan keras: Kapolsek, Kapolres, Kasat Binmas tidak menerima laporanId
      laporanId: stripDetailLink ? null : n.laporanId
    }));
    return okResponse(items);
  }

  const bacaNotifMatch = path.match(/^\/notifikasi\/([^/]+)\/baca$/);
  if (method === 'PATCH' && bacaNotifMatch) {
    const notifId = bacaNotifMatch[1];
    const target = MOCK_NOTIFIKASI.find((n) => n.id === notifId);
    if (target && !target.dibacaAt) {
      target.dibacaAt = new Date().toISOString();
    }
    return okResponse(target ?? null);
  }

  if (method === 'PATCH' && path === '/notifikasi/baca-semua') {
    const now = new Date().toISOString();
    let updated = 0;
    for (const n of MOCK_NOTIFIKASI) {
      if (!n.dibacaAt) {
        n.dibacaAt = now;
        updated++;
      }
    }
    return okResponse({ updated });
  }

  // 17. Delegasi endpoints & KBO lookup
  if (method === 'GET' && path === '/users/lookup') {
    if (currentUser.role !== Role.KASAT_NARKOBA) {
      return errorResponse(403, 'Hanya Kasat Narkoba yang dapat mencari NRP KBO.');
    }
    const nrp = (req.params.get('nrp') ?? '').trim();
    const kboUser = MOCK_USERS.find(
      (u) => u.nrp === nrp && u.role === Role.KBO && u.isActive
    );
    if (!kboUser) {
      // Kasus tepi: pesan tegas tanpa membocorkan data personel lain
      return errorResponse(404, 'NRP tidak ditemukan atau bukan KBO aktif');
    }
    const dto: KboLookupDto = {
      nrp: kboUser.nrp,
      nama: kboUser.nama,
      pangkat: kboUser.pangkat,
      jabatan: kboUser.jabatan,
      satuanNama: kboUser.satuanNama
    };
    return okResponse(dto);
  }

  if (method === 'GET' && path === '/delegasi') {
    if (currentUser.role !== Role.KASAT_NARKOBA && currentUser.role !== Role.KBO) {
      return errorResponse(403, 'Tidak memiliki akses ke data delegasi.');
    }
    return okResponse(MOCK_DELEGASI);
  }

  if (method === 'POST' && path === '/delegasi') {
    if (currentUser.role !== Role.KASAT_NARKOBA) {
      return errorResponse(403, 'Hanya Kasat Narkoba yang dapat membuat delegasi akses.');
    }
    const body = req.body as {
      nrp?: string;
      tgl_mulai?: string;
      tgl_selesai?: string;
      cakupan?: CakupanDelegasi;
      laporan_ids?: string[];
    };

    const kboUser = MOCK_USERS.find(
      (u) => u.nrp === body.nrp && u.role === Role.KBO && u.isActive
    );
    if (!kboUser) {
      return errorResponse(422, 'NRP tidak ditemukan atau bukan KBO aktif', [
        { field: 'nrp', message: 'NRP tidak ditemukan atau bukan KBO aktif' }
      ]);
    }

    const tglMulai = (body.tgl_mulai ?? '').slice(0, 10);
    const tglSelesai = (body.tgl_selesai ?? '').slice(0, 10);
    if (!tglMulai || !tglSelesai || tglSelesai < tglMulai) {
      return errorResponse(422, 'Tanggal selesai harus sama atau setelah tanggal mulai.', [
        { field: 'tgl_selesai', message: 'Rentang tanggal tidak valid' }
      ]);
    }

    // Cek tumpang tindih dengan delegasi yang belum dicabut untuk KBO yang sama
    const overlap = MOCK_DELEGASI.some(
      (d) =>
        d.keUserId === kboUser.id &&
        !d.isRevoked &&
        !(tglSelesai < d.tglMulai || tglMulai > d.tglSelesai)
    );
    if (overlap) {
      return errorResponse(
        422,
        'Terdapat delegasi aktif/terjadwal yang tumpang tindih untuk KBO ini. Cabut delegasi sebelumnya terlebih dahulu.'
      );
    }

    const newDel: DelegasiDto = {
      id: `del-${Date.now()}`,
      dariUserId: currentUser.id,
      dariUserNama: currentUser.nama,
      dariUserPangkat: currentUser.pangkat,
      keUserId: kboUser.id,
      keUserNama: kboUser.nama,
      keUserPangkat: kboUser.pangkat,
      nrpTujuan: kboUser.nrp,
      tglMulai,
      tglSelesai,
      cakupan: body.cakupan ?? CakupanDelegasi.SEMUA,
      laporanIds: body.laporan_ids ?? [],
      isRevoked: false,
      revokedAt: null,
      createdAt: new Date().toISOString()
    };

    MOCK_DELEGASI.unshift(newDel);
    MOCK_NOTIFIKASI.unshift({
      id: `notif-${Date.now()}`,
      userId: kboUser.id,
      laporanId: null,
      tipe: TipeNotifikasi.DELEGASI,
      judul: 'Delegasi Akses Diterima',
      isiRingkas: `Anda menerima delegasi akses ${tglMulai} s.d. ${tglSelesai}`,
      waktu: newDel.createdAt,
      dibacaAt: null
    });

    recordAudit(toPublicProfile(currentUser), 'BUAT_DELEGASI', 'delegasi_akses', newDel.id, {
      nrpTujuan: kboUser.nrp,
      tglMulai,
      tglSelesai
    });

    return okResponse(newDel, 'Delegasi akses KBO berhasil dibuat.');
  }

  const cabutDelMatch = path.match(/^\/delegasi\/([^/]+)\/cabut$/);
  if (method === 'PATCH' && cabutDelMatch) {
    if (currentUser.role !== Role.KASAT_NARKOBA) {
      return errorResponse(403, 'Hanya Kasat Narkoba pembuat delegasi yang dapat mencabut akses.');
    }
    const delId = cabutDelMatch[1];
    const del = MOCK_DELEGASI.find((d) => d.id === delId);
    if (!del) {
      return errorResponse(404, 'Data delegasi tidak ditemukan.');
    }
    del.isRevoked = true;
    del.revokedAt = new Date().toISOString();

    MOCK_NOTIFIKASI.unshift({
      id: `notif-${Date.now()}`,
      userId: del.keUserId,
      laporanId: null,
      tipe: TipeNotifikasi.DELEGASI,
      judul: 'Delegasi Akses Dicabut',
      isiRingkas: 'Delegasi akses dicabut',
      waktu: del.revokedAt,
      dibacaAt: null
    });

    recordAudit(toPublicProfile(currentUser), 'CABUT_DELEGASI', 'delegasi_akses', del.id, {
      nrpTujuan: del.nrpTujuan
    });

    return okResponse(del, 'Delegasi akses telah dicabut.');
  }

  // 18. Admin & Satuan & Audit Log endpoints
  if (method === 'GET' && path === '/satuan') {
    return okResponse(MOCK_SATUAN);
  }

  if (method === 'POST' && path === '/satuan') {
    if (currentUser.role !== Role.ADMIN) {
      return errorResponse(403, 'Hanya Admin yang dapat mengelola Satuan.');
    }
    const body = req.body as Partial<SatuanDto>;
    const created: SatuanDto = {
      id: `sat-${Date.now()}`,
      kode: (body.kode ?? '').toUpperCase().trim(),
      nama: (body.nama ?? '').trim(),
      tipe: body.tipe ?? TipeSatuan.POLSEK,
      parentId: body.parentId ?? 'sat-polres-01',
      wilayah: (body.wilayah ?? '').trim()
    };
    MOCK_SATUAN.push(created);
    return okResponse(created, 'Satuan kerja berhasil ditambahkan.');
  }

  if (method === 'GET' && path === '/users') {
    if (currentUser.role !== Role.ADMIN) {
      return errorResponse(403, 'Hanya Admin yang dapat mengelola pengguna.');
    }
    return okResponse(MOCK_USERS.map((u) => toPublicProfile(u)));
  }

  if (method === 'POST' && path === '/users') {
    if (currentUser.role !== Role.ADMIN) {
      return errorResponse(403, 'Hanya Admin yang dapat menambah pengguna.');
    }
    const body = req.body as Partial<UserProfileDto> & { initialPassword?: string };
    if (!body.nrp || MOCK_USERS.some((u) => u.nrp === body.nrp)) {
      return errorResponse(422, 'NRP sudah terdaftar atau tidak valid.', [
        { field: 'nrp', message: 'NRP harus unik' }
      ]);
    }
    const sat = MOCK_SATUAN.find((s) => s.id === body.satuanId) ?? MOCK_SATUAN[0];
    const newUser: MockUserRecord = {
      id: `usr-${Date.now()}`,
      nrp: body.nrp.trim(),
      nama: (body.nama ?? '').trim(),
      pangkat: (body.pangkat ?? '').trim(),
      jabatan: (body.jabatan ?? '').trim(),
      role: body.role ?? Role.BHABIN,
      satuanId: sat.id,
      satuanNama: sat.nama,
      wilayah: sat.wilayah,
      noHp: (body.noHp ?? '').trim(),
      isActive: true,
      mustChangePassword: true,
      passwordPlain: body.initialPassword || 'Password#123',
      failedLoginCount: 0
    };
    MOCK_USERS.push(newUser);
    recordAudit(toPublicProfile(currentUser), 'UBAH_USER', 'users', newUser.id, {
      action: 'CREATE_USER',
      nrp: newUser.nrp,
      role: newUser.role
    });
    return okResponse(toPublicProfile(newUser), 'Pengguna baru berhasil ditambahkan.');
  }

  const toggleUserMatch = path.match(/^\/users\/([^/]+)\/status$/);
  if (method === 'PATCH' && toggleUserMatch) {
    if (currentUser.role !== Role.ADMIN) {
      return errorResponse(403, 'Hanya Admin yang dapat mengubah status pengguna.');
    }
    const target = MOCK_USERS.find((u) => u.id === toggleUserMatch[1]);
    if (!target) {
      return errorResponse(404, 'Pengguna tidak ditemukan.');
    }
    target.isActive = !target.isActive;
    recordAudit(toPublicProfile(currentUser), 'UBAH_USER', 'users', target.id, {
      action: target.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      nrp: target.nrp
    });
    return okResponse(toPublicProfile(target), 'Status keaktifan pengguna diperbarui.');
  }

  const resetPwdMatch = path.match(/^\/users\/([^/]+)\/reset-password$/);
  if (method === 'POST' && resetPwdMatch) {
    if (currentUser.role !== Role.ADMIN) {
      return errorResponse(403, 'Hanya Admin yang dapat mereset kata sandi.');
    }
    const target = MOCK_USERS.find((u) => u.id === resetPwdMatch[1]);
    if (!target) {
      return errorResponse(404, 'Pengguna tidak ditemukan.');
    }
    target.passwordPlain = 'Password#123';
    target.mustChangePassword = true;
    target.failedLoginCount = 0;
    target.lockedUntil = undefined;
    recordAudit(toPublicProfile(currentUser), 'UBAH_USER', 'users', target.id, {
      action: 'RESET_PASSWORD',
      nrp: target.nrp
    });
    return okResponse(
      toPublicProfile(target),
      `Kata sandi personel ${target.nrp} direset ke awal (wajib ganti saat login pertama).`
    );
  }

  if (method === 'GET' && path === '/audit-log') {
    if (currentUser.role !== Role.ADMIN) {
      return errorResponse(403, 'Hanya Admin yang dapat melihat jejak audit.');
    }
    const aksiFilter = req.params.get('aksi') ?? '';
    const qFilter = (req.params.get('q') ?? '').toLowerCase().trim();
    const list = MOCK_AUDIT_LOGS.filter((a) => {
      if (aksiFilter && a.aksi !== aksiFilter) return false;
      if (qFilter) {
        const hay = `${a.userNrp} ${a.userNama} ${a.entitasId} ${a.aksi}`.toLowerCase();
        if (!hay.includes(qFilter)) return false;
      }
      return true;
    });
    return okResponse(list);
  }

  return errorResponse(404, `Endpoint ${method} ${path} tidak ditemukan.`);
};
