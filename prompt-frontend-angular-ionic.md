# PROMPT FRONTEND: Aplikasi Pelaporan Informasi Terindikasi Narkoba (Angular + Ionic)

> Pasangkan dengan `prompt-backend-express.md` (kontrak API) dan `alur-aplikasi.md` (alur dan matriks akses). Ketiganya harus dibaca sebelum mulai.

## 1. Peran dan tujuan

Kamu adalah senior frontend engineer sekaligus UI designer. Bangun aplikasi **Pelaporan Informasi Terindikasi Narkoba** untuk internal kepolisian. Satu codebase menghasilkan **web (responsive/PWA)** dan **Android** (Capacitor).

Data yang ditangani sangat sensitif. Utamakan **kerahasiaan, kepatuhan pada hak akses per peran, dan kemudahan pemakaian di lapangan** (sinyal lemah, satu tangan, cahaya terang).

## 2. Tech stack

- **Angular stable terbaru** dan **Ionic Framework terbaru** (`@ionic/angular` standalone). Cek dokumentasi resmi dulu agar versi dan sintaks tidak usang.
- Standalone components, **signals**, control flow baru (`@if`, `@for`, `@switch`), lazy-loaded routes, functional guards dan interceptors, typed reactive forms.
- **Capacitor** untuk Android dengan plugin: Camera, Geolocation, Push Notifications, Preferences, Network, App, dan Secure Storage (mis. `capacitor-secure-storage-plugin`).
- Peta: **Leaflet + OpenStreetMap** (ringan, tanpa API key). Siapkan abstraksi agar mudah diganti.
- State: signals + service (tanpa NgRx kecuali benar-benar perlu).
- HTTP: satu `ApiService`, interceptor untuk JWT, refresh token otomatis (antrekan request saat refresh berlangsung), dan error handling global.
- Environment: `environment.ts` berisi `apiBaseUrl`. Sediakan opsi **mock API (MSW atau json-server)** agar UI bisa jalan sebelum backend siap.

## 3. Struktur folder

```
src/app/
  core/          # api.service, interceptors, guards, auth.service, storage, push, network, audit-safe logger
  shared/        # ui components, pipes, directives, models, constants
  layout/        # shell-mobile (tab bar), shell-web (sidebar + header)
  features/
    auth/        # login, ganti-password
    beranda/
    laporan/     # buat, saya, daftar, detail
    disposisi/
    penyidikan/
    delegasi/
    notifikasi/
    profil/
    admin/       # pengguna, satuan, audit-log
  styles/        # _tokens.scss, _typography.scss, _ionic-overrides.scss
```

## 4. Peran dan menu

| Peran | Kode | Menu yang tampil |
|---|---|---|
| Bhabin | `BHABIN` | Beranda, Buat Laporan, Laporan Saya, Notifikasi, Profil |
| Kapolsek / Kapolres / Kasat Binmas | `KAPOLSEK`, `KAPOLRES`, `KASAT_BINMAS` | Beranda (ringkasan notifikasi), Notifikasi, Profil. **Tanpa** daftar atau detail laporan |
| Kasat Narkoba | `KASAT_NARKOBA` | Beranda, Daftar Laporan, Delegasi Akses, Notifikasi, Profil |
| Penyidik | `PENYIDIK` | Beranda, Disposisi Masuk, Notifikasi, Profil |
| KBO | `KBO` | Beranda, Daftar Laporan (hanya jika delegasi aktif), Delegasi Diterima, Notifikasi, Profil |
| Admin | `ADMIN` | Pengguna, Satuan, Audit Log, Profil |

Menu disusun dari satu konfigurasi (`MENU_BY_ROLE`). Peran tanpa hak tidak melihat menu terkait, dan setiap route dilindungi `authGuard` + `roleGuard`. Guard di UI hanya kenyamanan, **penegakan sebenarnya ada di backend**. Selalu tangani respons `403` dengan halaman "Tidak punya akses".

## 5. Alur layar (ringkas, detail di `alur-aplikasi.md`)

- **Bhabin:** Login → Buat Laporan (nama, lokasi, foto + timestamp, deskripsi) → Kirim → Laporan Saya.
- **Kapolsek/Kapolres/Kasat Binmas:** Notifikasi "Laporan baru" (nomor, wilayah, waktu). Item **tidak bisa diketuk ke detail**.
- **Kasat Narkoba:** Notifikasi → Daftar Laporan → Detail → Disposisikan ke Penyidik. Delegasi Akses (NRP + rentang tanggal) bila berhalangan.
- **Penyidik:** Disposisi Masuk → Detail → Isi Hasil Penyidikan (status Benar/Tidak Benar, foto, deskripsi).
- **KBO:** Detail dan disposisi hanya selama periode delegasi aktif; di luar itu menu tertutup.

## 6. Spesifikasi layar

**Login**: NRP + password, tombol "Masuk", pesan error spesifik (kredensial salah, akun terkunci sementara, tidak ada koneksi). Paksa ganti password saat login pertama.

**Beranda** (menurut peran): angka ringkas (mis. laporan baru, menunggu disposisi, dalam penyidikan) dan daftar aktivitas terbaru. Tanpa grafik dekoratif.

**Buat Laporan (Bhabin)**
- Field: `nama_objek`, lokasi (lat/lng otomatis dari GPS, tampil di peta kecil, bisa digeser untuk koreksi), foto (kamera, bisa banyak, tiap foto ditempeli **timestamp** dan koordinat), deskripsi.
- Validasi lengkap di sisi klien, tombol "Kirim Laporan" dinonaktifkan sampai valid.
- **Draft offline:** jika tidak ada sinyal, simpan terenkripsi di perangkat dan kirim ulang otomatis saat online, dengan penanda "Menunggu terkirim".
- Konfirmasi sebelum kirim, lalu tampilkan nomor laporan.

**Laporan Saya (Bhabin)**: daftar milik sendiri dengan badge status, tarik untuk memuat ulang.

**Daftar Laporan (Kasat, KBO)**: tabel rapat di web (No. Laporan, Waktu, Wilayah, Status, Aksi), daftar baris di mobile. Filter status, tanggal, satuan, pencarian.

**Detail Laporan**: peta lokasi, galeri foto (foto dimuat lewat signed URL, jangan di-cache permanen), deskripsi, pelapor, **riwayat disposisi dan penyidikan** berbentuk timeline sederhana. Aksi menurut peran: "Disposisikan" (Kasat/KBO aktif), "Isi Hasil Penyidikan" (Penyidik). Di Android aktifkan **FLAG_SECURE** (blokir screenshot) pada halaman ini.

**Form Disposisi**: pilih Penyidik (dari `GET /penyidik`), catatan, konfirmasi.

**Form Hasil Penyidikan**: status Benar / Tidak Benar (pilihan tegas), foto (bisa banyak), deskripsi. Tidak bisa dikirim dua kali.

**Delegasi Akses (Kasat)**: daftar delegasi (aktif, akan datang, selesai, dicabut) dan form: input **NRP KBO** (cek langsung lewat `GET /users/lookup?nrp=` dan tampilkan nama + pangkat untuk konfirmasi), tanggal mulai s.d. selesai, cakupan (Semua laporan / Laporan tertentu). Tombol "Cabut Akses" dengan konfirmasi.

**Notifikasi**: daftar dengan penanda belum dibaca, "Tandai semua dibaca". Untuk Kapolsek/Kapolres/Kasat Binmas, item hanya teks tanpa tautan detail.

**Profil dan Ganti Password**, serta **Admin** (Pengguna, Satuan, Audit Log dengan filter).

## 7. Integrasi API

- Ikuti kontrak di `prompt-backend-express.md` bagian 6 (prefix `/api/v1`, respons `{ success, data, message, errors? }`, pagination `page` dan `limit`).
- Buat model TypeScript untuk semua DTO dan enum (`Role`, `StatusLaporan`, `HasilPenyidikan`, `CakupanDelegasi`).
- Upload memakai `FormData`. Tampilkan progres, dan lanjutkan dengan aman bila koneksi putus.
- Tangani `401` (refresh lalu ulangi sekali, gagal → logout), `403`, `404`, `422` (tampilkan error per field), `429`, dan error jaringan.

## 8. Keamanan di sisi klien

- Token disimpan di **Secure Storage** pada Android, bukan localStorage. Di web gunakan memori + cookie/penyimpanan sesuai keputusan backend.
- **Auto-logout** setelah idle (mis. 10 menit) dan saat aplikasi kembali dari background lebih lama dari batas.
- Jangan menaruh data sensitif di log, URL, atau penyimpanan yang tidak terenkripsi. Bersihkan cache foto saat logout.
- Draft offline dienkripsi. Hapus draft setelah terkirim.
- Isi push notification tidak memuat data sensitif. Ketuk notifikasi diarahkan sesuai peran (Kapolsek/Kapolres/Kasat Binmas hanya ke daftar notifikasi).

## 9. Arahan desain: terlihat dirancang manusia, bukan template AI

**Larangan:**
- Tanpa gradasi ungu/biru-ke-pink, glassmorphism, glow, atau neon.
- Tanpa hero section besar, ilustrasi 3D generik, dan emoji sebagai ikon.
- Tanpa kartu bertumpuk dengan bayangan tebal dan sudut sangat membulat di mana-mana.
- Tanpa teks marketing ("Selamat datang di masa depan…"), tanpa placeholder "Lorem ipsum" atau "John Doe".
- Tanpa animasi berlebihan (bounce, parallax, konfeti).

**Arah yang dipakai:**
- Nuansa **institusional dan fungsional** seperti aplikasi dinas: tenang, padat informasi, mudah dipindai.
- Palet terbatas: dasar **navy gelap atau hijau tua**, satu aksen (kuning emas redup), abu-abu netral, dan warna status (merah, kuning, hijau) khusus untuk status laporan. Mode terang sebagai default. Definisikan semua sebagai design tokens di `_tokens.scss` dan petakan ke variabel Ionic.
- Tipografi: satu keluarga sans (mis. **IBM Plex Sans** atau **Source Sans 3**), hierarki jelas, **tabular figures** untuk angka dan NRP. Bundel font secara lokal, jangan bergantung CDN.
- Layout: tabel rapat di web, form satu kolom lurus di mobile, header sederhana, **tab bar bawah** di mobile dan **sidebar tipis** di web.
- Radius kecil (4–6px), garis pembatas tipis alih-alih bayangan, spasi kelipatan 4px.
- Satu set ikon saja (Ionicons atau Lucide), ukuran dan ketebalan konsisten.
- Bahasa antarmuka **Bahasa Indonesia baku**, singkat dan lugas ("Kirim Laporan", "Disposisikan", "Cabut Akses").
- Wajib ada empty state, skeleton loading sederhana, dan pesan error informatif.
- Aksesibilitas: kontras cukup, target sentuh ≥ 44px, label form jelas, fokus keyboard terlihat.
- Badge status konsisten: `Baru`, `Didisposisi`, `Selesai – Benar`, `Selesai – Tidak Benar`.

## 10. Kualitas

- Strict TypeScript, ESLint + Prettier, komponen kecil dan bisa dipakai ulang.
- Test unit untuk service inti (auth, interceptor refresh, guard, draft offline) dan test komponen untuk form utama.
- Uji manual di Android: kamera, GPS, push, offline → online, auto-logout, FLAG_SECURE.
- `README.md`: cara run web, build Android (`ionic cap sync android`, buka di Android Studio), konfigurasi environment.

## 11. Urutan pengerjaan

1. Inisialisasi proyek, struktur folder, design tokens, layout per peran, mock API.
2. Auth, guard, interceptor, secure storage, auto-logout.
3. Buat Laporan (kamera, GPS, timestamp foto, draft offline).
4. Notifikasi + daftar dan detail laporan dengan aturan akses.
5. Disposisi dan penyidikan.
6. Delegasi KBO.
7. Admin dan audit log.
8. Hubungkan ke backend sungguhan, build Android (Capacitor), uji di perangkat, tulis README.

Kerjakan bertahap. Setelah tiap tahap, jelaskan singkat apa yang sudah jadi dan tunggu konfirmasi sebelum lanjut.
