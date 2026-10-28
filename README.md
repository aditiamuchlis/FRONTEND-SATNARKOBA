# SIPINAR — Aplikasi Pelaporan Informasi Terindikasi Narkoba (Frontend Angular + Ionic + Capacitor)

Aplikasi internal Kepolisian Negara Republik Indonesia (**Satresnarkoba**) untuk pelaporan informasi terindikasi tindak pidana narkotika dari lapangan (**Bhabinkamtibmas**) hingga disposisi (**Kasat Narkoba / KBO**) dan pelaporan hasil penyelidikan/penyidikan (**Penyidik / Kanit Lidik**).

Satu basis kode (*single codebase*) menghasilkan **Web (Responsive / PWA)** dan **Android (Capacitor)**.

---

## 1. Fitur Keamanan & Kepatuhan Alur Operasional

1. **Matriks Hak Akses Ketat per Peran (`MENU_BY_ROLE`, `authGuard`, `roleGuard`)**:
   - **`BHABIN`**: Membuat laporan di lapangan (nama objek, koordinat GPS + koreksi peta, multi-foto dengan watermark timestamp & koordinat otomatis, deskripsi), melihat laporan milik sendiri, serta antrean draft offline terenkripsi.
   - **`KAPOLSEK`, `KAPOLRES`, `KASAT_BINMAS`**: Hanya menerima notifikasi ringkas (`no_laporan`, `wilayah`, `waktu`) **tanpa** tautan ke detail laporan, identitas pelapor, koordinat, maupun foto.
   - **`KASAT_NARKOBA`**: Membuka detail laporan, melihat galeri foto via *signed URL* berumur pendek (60 detik), mendisposisikan ke Penyidik, serta membuat/mencabut **Delegasi Akses Berjangka** untuk KBO.
   - **`PENYIDIK`**: Menerima disposisi masuk, membuka detail laporan yang didisposisikan kepadanya, dan mengirimkan hasil penyidikan (**Benar** / **Tidak Benar**, foto, deskripsi) tepat satu kali per disposisi.
   - **`KBO`**: Hanya dapat mengakses menu Daftar Laporan, membuka detail, dan melakukan disposisi selama periode **delegasi aktif** (zona waktu `Asia/Jakarta`) dan belum dicabut.
   - **`ADMIN`**: Mengelola akun personel, satuan kerja (Polres/Polsek), dan meninjau Jejak Audit (*Audit Log*) tanpa akses ke detail laporan narkoba.
2. **Draft Offline Terenkripsi (`OfflineDraftService`)**:
   - Jika tidak ada sinyal saat Bhabin mengirim laporan, seluruh payload laporan + foto dienkripsi menggunakan **AES-GCM 256-bit** (Web Crypto API) pada penyimpanan perangkat dan diberi penanda **"Menunggu terkirim"** beserta `idempotencyKey` anti-duplikat.
   - Saat sinyal kembali online (`NetworkService`), draft dikirim ulang secara otomatis dan langsung dihapus dari perangkat setelah sukses.
3. **Keamanan Klien**:
   - Token disimpan pada **Secure Storage** (`capacitor-secure-storage-plugin`) di Android dan memori/session terproteksi di Web (tidak pernah di `localStorage`).
   - **Auto-logout** setelah *idle* 10 menit atau saat aplikasi kembali dari *background* melebihi batas aman (`IdleService`).
   - Aktivasi **`FLAG_SECURE`** pada halaman **Detail Laporan** untuk memblokir *screenshot* dan *screen recording* di Android (`FlagSecureService`), serta pembersihan cache foto saat keluar sesi.

---

## 2. Daftar Akun Pengujian (Mode Mock API & Seed)

Secara bawaan `useMockApi: true` diaktifkan pada `src/environments/environment.ts` sehingga seluruh alur peran dapat langsung diuji sebelum backend dijalankan. Semua akun menggunakan kata sandi awal: **`Password#123`**.

| Peran | NRP | Nama & Pangkat | Keterangan Uji |
|---|---|---|---|
| `BHABIN` | `88010101` | Aipda Hendra Wijaya | Buat Laporan, GPS, Watermark Foto, Draft Offline |
| `KAPOLSEK` | `79020202` | Kompol Darmawan, S.I.K. | Hanya Notifikasi ringkas (tanpa tautan detail) |
| `KAPOLRES` | `75030303` | Kombes Pol Bambang S. | Hanya Notifikasi ringkas (tanpa tautan detail) |
| `KASAT_BINMAS` | `78040404` | AKBP Rahmat Hidayat | Hanya Notifikasi ringkas (tanpa tautan detail) |
| `KASAT_NARKOBA` | `80050505` | AKBP Yudha Pratama | Daftar & Detail Laporan, Disposisi, Delegasi KBO |
| `PENYIDIK` | `85060606` | Iptu Rian Firmansyah | Disposisi Masuk, Isi Hasil Penyidikan (1x) |
| `KBO` | `83070707` | Iptu Surya Kencana | Detail & Disposisi saat delegasi aktif |
| `ADMIN` | `90080808` | Bripka Aditya Nugraha | Pengguna, Satuan Kerja, Audit Log |
| `BHABIN` (Login 1) | `91090909` | Briptu Fajar Ramadhan | Simulasi paksa ganti password saat login pertama |

---

## 3. Cara Menjalankan di Web

```bash
# 1. Instal dependensi
npm install

# 2. Jalankan server pengembangan (http://localhost:4200)
npm start

# 3. Jalankan unit test (Vitest)
npm test

# 4. Build produksi (menghasilkan bundle di www/browser)
npm run build
```

---

## 4. Konfigurasi Environment (Menghubungkan ke Backend Express)

Buka `src/environments/environment.ts` dan `src/environments/environment.development.ts`:

```ts
export const environment: AppEnvironment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api/v1',
  useMockApi: false, // Ubah ke false untuk terhubung langsung ke Backend Express
  idleTimeoutMinutes: 10,
  backgroundLockMinutes: 5
};
```

---

## 5. Build & Uji di Android (Capacitor)

```bash
# 1. Build aplikasi web terlebih dahulu
npm run build

# 2. Tambahkan platform Android (jika belum ada folder android/)
npx cap add android

# 3. Sinkronkan aset web dan plugin Capacitor ke proyek Android
npx cap sync android

# 4. Buka proyek di Android Studio untuk dijalankan ke perangkat/emulator
npx cap open android
```

### Pengujian Fitur Native di Perangkat Android:
- **Kamera & Watermark**: Buka sebagai Bhabin (`88010101`) -> *Buat Laporan* -> *Ambil Foto Kamera*.
- **GPS & Peta**: Tekan *Ambil Ulang GPS Saat Ini* dan geser pin pada peta Leaflet untuk koreksi titik.
- **Offline -> Online**: Matikan data seluler/Wi-Fi (atau klik tombol indikator sinyal di header), kirim laporan, amati status *"Menunggu terkirim"*, lalu nyalakan kembali koneksi.
- **FLAG_SECURE**: Buka halaman *Detail Laporan* dan coba ambil *screenshot* pada perangkat Android.
