# Product Requirements Document (PRD): Aplikasi Absensi Karyawan Berbasis Web

> Dibuat di Gemini AI pada 2026-11-25 (chat: https://gemini.google.com/app/18d15e54952b15db)
> Status: MENUNGGU REVIEW Maulana — belum lanjut ke Stitch sebelum di-acc.

## (a) Latar Belakang & Tujuan

### Latar Belakang
Usaha membutuhkan pencatatan kehadiran harian karyawan yang cepat, akurat, dan terpusat tanpa bergantung pada pencatatan manual di atas kertas maupun manipulasi jam pada perangkat pengguna. Pencatatan kehadiran harus dapat dilakukan secara mandiri oleh karyawan melalui satu perangkat bersama atau perangkat masing-masing tanpa proses login yang rumit, namun tetap memiliki validasi identitas visual berupa tanda tangan digital serta pengawasan terpusat oleh administrator.

### Tujuan Produk
1. Mempercepat proses absensi harian karyawan melalui satu halaman antarmuka tanpa autentikasi login, dilengkapi pencarian nama dan kanvas tanda tangan wajib.
2. Menjamin akurasi waktu dan mencegah duplikasi absensi dengan menjadikan waktu server (zona waktu Asia/Jakarta) sebagai acuan tunggal serta membatasi satu kali absen Masuk dan satu kali absen Pulang per hari.
3. Menyediakan pemantauan dan manajemen data terpusat bagi Admin melalui dashboard terproteksi JWT untuk memantau riwayat kehadiran, memverifikasi bukti tanda tangan, dan mengelola data master karyawan.

## (b) Ruang Lingkup

### In Scope
- Halaman input absensi karyawan publik (tanpa login) dengan komponen pilihan (select) dinamis yang dapat dicari dan kanvas tanda tangan digital.
- Penyimpanan file tanda tangan dalam format gambar .png di direktori server lokal serta pencatatan path file ke database.
- Penampilan bukti absensi langsung setelah pengiriman data berhasil (nama, jenis absen, tanggal, dan jam server).
- Validasi aturan bisnis absensi harian (1x Masuk dan 1x Pulang per karyawan per hari, batas jam masuk 08:00, jam mulai pulang 15:00, serta status Hadir, Terlambat, Izin, Sakit).
- Halaman login Admin berbasis JWT (akun dibuat melalui seeding database, tanpa registrasi publik).
- Halaman manajemen data karyawan oleh Admin (CRUD).
- Halaman tabel pemantauan absensi oleh Admin dengan filter tanggal, karyawan, dan status, serta pratinjau gambar tanda tangan.
- Arsitektur terpisah antara Backend REST API (Node.js + Express + MySQL di port 4000) dan Frontend (HTML + Tailwind CSS + Vanilla JS di port 3000).

### Out of Scope (Diparkir untuk Fase Berikutnya)
- Fitur keamanan PIN atau kata sandi khusus karyawan saat melakukan absensi.
- Pengambilan foto selfie dan pelacakan titik koordinat lokasi GPS saat absensi.
- Penentuan jumlah pasti karyawan serta struktur pembagian divisi atau jabatan.
- Fitur ekspor laporan/rekapitulasi absensi ke format Excel (.xlsx) maupun PDF (.pdf).
- Mekanisme alur kerja rinci untuk pengajuan dan persetujuan status Izin maupun Sakit.
- Pembatasan jam paling awal (jendela waktu buka) untuk melakukan absen Masuk.
- Perencanaan infrastruktur dan konfigurasi deployment (hosting, domain, CI/CD, reverse proxy).

## (c) Role & Hak Akses

| Role | Mekanisme Akses | Hak Akses & Kapabilitas |
|---|---|---|
| Karyawan (User) | Publik (Tanpa Login) | Mengakses halaman form absensi; melihat daftar karyawan aktif beserta status ketersediaan absen hari ini; mengirimkan data absen Masuk atau Pulang beserta tanda tangan digital; melihat bukti konfirmasi absensi setelah submit; tidak dapat mengakses halaman atau endpoint milik Admin. |
| Admin | Autentikasi Wajib (JWT) | Login menggunakan kredensial yang telah di-seed di database; melihat daftar seluruh data absensi karyawan; melakukan filter absensi berdasarkan tanggal, karyawan, dan status kehadiran; melihat gambar tanda tangan digital karyawan pada setiap catatan absensi; melakukan CRUD (Tambah, Lihat, Ubah, Hapus/Nonaktifkan) data master karyawan; logout dari sesi Admin. |

## (d) Alur Pengguna (User Flows)

### 1. Alur Karyawan (Input Absensi)
Karyawan membuka halaman utama absensi karyawan (frontend/user). Sistem memuat daftar karyawan dan status absensi hari berjalan dari API Backend. Karyawan memilih jenis absen: Masuk atau Pulang. Sistem menyesuaikan opsi pada dropdown pencarian karyawan: nama karyawan yang sudah melakukan jenis absen tersebut pada hari ini tetap tampil tetapi dalam kondisi disabled. Karyawan mencari dan memilih ID + Nama mereka dari dropdown dinamis. Karyawan menggambar tanda tangan pada area kanvas tanda tangan. Karyawan menekan tombol Submit Absen. Backend memvalidasi kelengkapan data, memverifikasi aturan waktu dan duplikasi harian, menyimpan gambar tanda tangan ke folder backend/uploads/signatures/, dan menyimpan transaksi ke MySQL. Halaman menampilkan Bukti Absensi berisi Nama Karyawan, Jenis Absen, Tanggal, dan Jam Absen berdasarkan waktu server (Asia/Jakarta).

### 2. Alur Admin (Pemantauan & Manajemen Data)
Admin membuka halaman login Admin (frontend/admin). Admin memasukkan username/email dan password, lalu menekan tombol Login. Backend memverifikasi kredensial terhadap data akun ter-seed di database dan mengembalikan token JWT. Frontend menyimpan token JWT dan mengarahkan Admin ke halaman utama Admin (Tabel Absensi). Pemantauan Absensi: Admin memfilter data berdasarkan rentang/tanggal tertentu, nama karyawan, atau status (Hadir, Terlambat, Izin, Sakit), lalu mengklik tombol lihat tanda tangan untuk membuka pratinjau file PNG tanda tangan. Manajemen Karyawan: Admin berpindah ke halaman Data Karyawan untuk menambahkan karyawan baru, memperbarui data (ID/kode karyawan, nama, status aktif), atau menghapus data karyawan. Admin menekan tombol Logout untuk menghapus sesi token di sisi klien.

## (e) Kebutuhan Fungsional Frontend per Halaman

Frontend berjalan di port 3000, dibangun menggunakan HTML, Tailwind CSS, dan JavaScript murni (fetch API, tanpa template engine seperti EJS), dilayani oleh server ringan frontend/app.js.

### 1. Halaman Form Absensi Karyawan (frontend/user/index.html)
- Pemilih Jenis Absen: Radio button atau toggle tab untuk memilih Masuk atau Pulang.
- Select Dinamis Pencarian Karyawan: Komponen dropdown yang dapat diketik untuk memfilter daftar berdasarkan ID Karyawan atau Nama. Opsi karyawan yang telah tercatat absen pada jenis dan tanggal hari ini (menurut server) harus dirender dalam kondisi disabled dengan indikator visual (misalnya label "Sudah Absen Masuk").
- Kanvas Tanda Tangan: Area canvas interaktif yang mendukung input mouse maupun sentuhan layar (touchscreen), dilengkapi tombol Hapus/Reset Kanvas untuk mengulang goresan. Validasi frontend mencegah submit jika kanvas masih kosong.
- Modal / Kartu Bukti Absensi: Muncul seketika setelah respons sukses dari API, menampilkan ringkasan: Nama Karyawan, Jenis Absen (Masuk / Pulang), Tanggal (YYYY-MM-DD), Jam Server (HH:mm:ss WIB), serta status kehadiran (misalnya Hadir atau Terlambat).

### 2. Halaman Login Admin (frontend/admin/login.html)
- Form Autentikasi: Input field untuk username/email dan password, serta tombol submit.
- Penanganan Sesi: Menyimpan JWT (misalnya di localStorage) saat login berhasil, menampilkan pesan galat jika kredensial salah, dan otomatis mengalihkan pengguna ke halaman tabel absensi jika token valid sudah tersimpan.

### 3. Halaman Tabel Absensi Admin (frontend/admin/index.html atau absensi.html)
- Proteksi Halaman: Memeriksa keberadaan JWT sebelum memuat data; mengarahkan kembali ke halaman login jika tidak terautentikasi atau menerima respons HTTP 401.
- Panel Filter: Input tanggal (default hari ini berdasarkan waktu server atau tanggal yang dipilih); Dropdown/pencarian karyawan; Dropdown status kehadiran (Semua, Hadir, Terlambat, Izin, Sakit).
- Tabel Data Absensi: Menampilkan kolom Tanggal, ID Karyawan, Nama Karyawan, Jam Masuk, Jam Pulang, Status, dan Aksi.
- Modal Pratinjau Tanda Tangan: Tombol pada baris tabel untuk menampilkan gambar .png tanda tangan Masuk dan/atau Pulang yang diambil dari static file server backend.

### 4. Halaman Manajemen Data Karyawan (frontend/admin/karyawan.html)
- Tabel Master Karyawan: Menampilkan daftar ID/Kode Karyawan, Nama Lengkap, Status Aktif, dan tombol aksi (Edit, Hapus).
- Form / Modal Tambah & Edit Karyawan: Input untuk memasukkan atau mengubah kode identitas karyawan, nama lengkap, dan status aktif/nonaktif.
- Konfirmasi Hapus: Dialog konfirmasi sebelum mengirimkan permintaan penghapusan data karyawan ke API.

## (f) Kebutuhan Fungsional Backend

Backend berjalan di port 4000 menggunakan Node.js, Express, REST API, dan database MySQL (mysql2 connection pool).

- Konfigurasi Server & CORS: Membuka akses CORS secara spesifik untuk origin frontend di http://localhost:3000. Menyajikan folder backend/uploads/signatures/ secara statis agar frontend dapat merender gambar tanda tangan melalui URL path.
- Manajemen Waktu Server: Mengonfigurasi runtime dan koneksi database pada zona waktu Asia/Jakarta (WIB / UTC+7). Seluruh pencatatan tanggal, jam masuk, jam pulang, dan evaluasi keterlambatan mutlak menggunakan waktu server saat request diterima, mengabaikan timestamp dari perangkat klien.
- Aturan Validasi Absensi: Validasi Harian: Memeriksa apakah karyawan sudah memiliki catatan absen pada tanggal hari ini untuk jenis yang dipilih (Masuk atau Pulang). Jika sudah ada, tolak dengan HTTP 409 Conflict.
- Aturan Absen Masuk: Jika waktu server ≤ 08:00:00, status tercatat sebagai Hadir (Tepat Waktu). Jika waktu server > 08:00:00, status tercatat sebagai Terlambat.
- Aturan Absen Pulang: Hanya diizinkan apabila waktu server ≥ 15:00:00. Jika dikirim sebelum pukul 15:00:00, tolak dengan pesan error yang jelas (HTTP 400 Bad Request). Wajib memeriksa apakah karyawan sudah melakukan absen Masuk pada hari yang sama sebelum melakukan absen Pulang (atau memperbarui record absensi hari tersebut). *(Catatan review: aturan "harus sudah absen Masuk sebelum Pulang" ini tambahan dari Gemini, belum diputuskan eksplisit.)*
- Pemrosesan File Tanda Tangan: Menerima data gambar tanda tangan dari frontend (seperti payload data URL / multipart file), memvalidasi format gambar, mengonversinya menjadi file fisik .png, dan menyimpannya ke backend/uploads/signatures/ dengan penamaan unik (contoh: sig_{employee_id}_{YYYYMMDD}_{jenis}_{timestamp}.png). Menyimpan hanya path relatif file (contoh: /uploads/signatures/nama_file.png) ke kolom database.
- Arsitektur Lapisan Kode: Seluruh kueri SQL dan operasi CRUD ditempatkan di dalam backend/models/. backend/controllers/ menangani logika bisnis, validasi HTTP, dan pemanggilan model. backend/utils/ hanya berisi fungsi pembantu (helper) murni seperti format tanggal zona Asia/Jakarta, penyimpanan file PNG dari canvas, dan helper respons standar. backend/middlewares/ menangani verifikasi token JWT untuk seluruh rute /api/admin/*.

## (g) Desain Database MySQL

Database menggunakan engine InnoDB dengan character set utf8mb4.

### 1. Tabel admins
Menyimpan akun administrator (diisi melalui proses seeding database).
- id INT UNSIGNED PRIMARY KEY, AUTO_INCREMENT — ID internal admin
- username VARCHAR(50) NOT NULL, UNIQUE — Username login admin
- password_hash VARCHAR(255) NOT NULL — Hash password bcrypt
- nama_lengkap VARCHAR(100) NOT NULL — Nama tampilan admin
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### 2. Tabel employees
Menyimpan data master karyawan yang dikelola oleh Admin.
- id INT UNSIGNED PRIMARY KEY, AUTO_INCREMENT
- employee_code VARCHAR(30) NOT NULL, UNIQUE — ID/Kode karyawan yang tampil di select, misal: KRY-001
- full_name VARCHAR(100) NOT NULL — Nama lengkap karyawan
- is_active TINYINT(1) NOT NULL, DEFAULT 1 — 1 = Aktif, 0 = Nonaktif
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

### 3. Tabel attendances
Menyimpan catatan transaksi absensi harian karyawan (satu baris per jenis absen).
- id INT UNSIGNED PRIMARY KEY, AUTO_INCREMENT
- employee_id INT UNSIGNED NOT NULL, FOREIGN KEY → employees(id), ON DELETE RESTRICT
- attendance_date DATE NOT NULL — Tanggal absensi berdasarkan waktu server Asia/Jakarta
- attendance_type ENUM('MASUK', 'PULANG') NOT NULL
- attendance_time TIME NOT NULL — Jam absensi aktual berdasarkan waktu server HH:mm:ss
- status ENUM('Hadir', 'Terlambat', 'Izin', 'Sakit') NOT NULL
- signature_path VARCHAR(255) NULL — Path relatif file PNG di backend/uploads/signatures/, wajib terisi untuk Masuk/Pulang
- created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

Relasi & Constraint Penting:
- Relasi employees → attendances: One-to-Many (1:N).
- Unique Constraint Harian: UNIQUE KEY uq_employee_date_type (employee_id, attendance_date, attendance_type) — menjamin satu karyawan hanya dapat absen MASUK maksimal 1 kali dan absen PULANG maksimal 1 kali pada tanggal yang sama.

## (h) Daftar Endpoint REST API

Base URL Backend: http://localhost:4000/api

### Endpoint Publik (Sisi Karyawan)
- GET /employees/attendance-options — Publik — Response 200: Daftar karyawan aktif beserta flag has_checked_in dan has_checked_out untuk tanggal server hari ini, serta waktu server saat ini.
- POST /attendances — Publik — Request JSON: { "employee_id": 1, "attendance_type": "MASUK", "signature_image": "data:image/png;base64,..." } — Response 201: { "message": "Absensi berhasil", "data": { "full_name": "Budi", "attendance_type": "MASUK", "attendance_date": "2025-11-25", "attendance_time": "07:55:12", "status": "Hadir" } }

### Endpoint Autentikasi Admin
- POST /admin/login — Publik — Request JSON: { "username": "admin", "password": "******" } — Response 200: { "token": "<jwt_token>", "admin": { "id": 1, "username": "admin", "nama_lengkap": "Administrator" } }

### Endpoint Terproteksi Admin (Header: Authorization: Bearer <token>)
- GET /admin/attendances — JWT — Query opsional: ?date=YYYY-MM-DD&employee_id=1&status=Terlambat — 200: Array daftar absensi lengkap dengan employee_code, full_name, attendance_date, attendance_type, attendance_time, status, signature_path.
- GET /admin/employees — JWT — Query opsional: ?search=budi — 200: Array seluruh data karyawan.
- POST /admin/employees — JWT — Request JSON: { "employee_code": "KRY-005", "full_name": "Siti Aminah", "is_active": 1 } — 201: Objek karyawan baru.
- PUT /admin/employees/:id — JWT — Request JSON yang sama — 200: Objek karyawan yang diperbarui.
- DELETE /admin/employees/:id — JWT — 200: { "message": "Data karyawan berhasil dihapus" }

## (i) Struktur Folder Project

```
project-absensi/
├── backend/                            # port 4000
│   ├── config/
│   │   └── connect.js                  # mysql2 connection pool & .env
│   ├── controllers/
│   │   ├── attendanceController.js
│   │   ├── authController.js
│   │   └── employeeController.js
│   ├── middlewares/
│   │   └── authMiddleware.js           # verifikasi JWT rute admin
│   ├── models/
│   │   ├── adminModel.js
│   │   ├── attendanceModel.js
│   │   └── employeeModel.js
│   ├── routes/
│   │   ├── adminRoutes.js              # /api/admin/*
│   │   └── publicRoutes.js             # /api/employees/* & /api/attendances
│   ├── uploads/
│   │   └── signatures/                 # file PNG tanda tangan
│   ├── utils/
│   │   ├── fileHelper.js
│   │   └── timeHelper.js
│   ├── .env                            # DB_HOST, DB_USER, DB_PASS, DB_NAME, JWT_SECRET, PORT=4000
│   ├── package.json
│   └── app.js
└── frontend/                           # port 3000
    ├── admin/
    │   ├── login.html
    │   ├── index.html                  # tabel absensi & modal tanda tangan
    │   └── karyawan.html               # CRUD karyawan
    ├── user/
    │   └── index.html                  # form absensi & modal bukti
    ├── public/
    │   ├── css/
    │   └── js/
    ├── package.json
    └── app.js                          # server/routing halaman frontend
```

## (j) Kebutuhan Non-Fungsional

- Keamanan: Endpoint Admin wajib dilindungi middleware JWT (Authorization: Bearer <token>) dengan masa berlaku token terdefinisi (misalnya 8 jam atau 24 jam). Password Admin di-hash bcrypt, tidak pernah plain text. CORS dibatasi hanya untuk origin frontend (http://localhost:3000). Seluruh kueri database memakai parameterized queries (? placeholders pada mysql2) untuk mencegah SQL Injection.
- Validasi Data & Integritas File: Validasi ganda di frontend (UX) dan backend (otoritas utama). Payload gambar tanda tangan divalidasi tipe MIME/header PNG dan dibatasi ukuran maksimalnya (misalnya maksimal 2 MB) sebelum ditulis ke backend/uploads/signatures/. Nama file di-generate server untuk mencegah path traversal / penimpaan file.
- Zona Waktu & Sinkronisasi: Seluruh pencatatan dan aturan waktu (08:00 batas masuk, 15:00 batas mulai pulang) mengacu pada jam server Asia/Jakarta (WIB). Koneksi pool MySQL memakai timezone '+07:00'.

## (k) Open Questions (Diparkir untuk Fase Berikutnya)

- PIN karyawan: apakah fase berikutnya karyawan memerlukan verifikasi PIN pribadi saat memilih nama di form publik?
- Selfie & GPS: apakah perlu foto selfie dan validasi radius GPS (geofencing) lokasi usaha saat absensi?
- Skala & struktur organisasi: berapa jumlah total karyawan, dan apakah perlu pengelompokan divisi/departemen/jabatan?
- Export laporan Excel/PDF: format kolom, periode rekap (harian/mingguan/bulanan), dan tata letak yang dibutuhkan?
- Mekanisme Izin dan Sakit: diinput manual oleh Admin, atau karyawan mengajukan sendiri lewat form publik beserta surat keterangan?
- Jendela waktu paling awal absen Masuk: dibuka mulai jam berapa (misal 05:00 / 06:00 WIB, atau tidak dibatasi)?
