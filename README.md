# Aplikasi Absensi Karyawan Berbasis Web

Aplikasi pencatatan kehadiran harian karyawan berbasis web sesuai spesifikasi **PRD Aplikasi Absensi Karyawan** dan sistem desain **Google Stitch (`Aplikasi Absensi Karyawan UI`)**.

## Fitur Utama
1. **Form Absensi Publik (Tanpa Login)**
   - Jam digital live zona waktu otoritatif server **Asia/Jakarta (WIB)**.
   - Toggle jenis absensi **Masuk** / **Pulang**.
   - Dropdown karyawan yang dapat dicari (*searchable select*) menampilkan **Kode + Nama**; karyawan yang sudah melakukan absen untuk jenis terpilih pada hari ini tetap tampil namun **DISABLED** dengan badge **`Sudah Absen`**.
   - Kanvas tanda tangan digital (`<canvas>`) mendukung mouse & layar sentuh beserta tombol **Hapus Tanda Tangan**; disimpan sebagai file gambar `.png` di `backend/uploads/signatures/` dan hanya path relatifnya disimpan ke MySQL.
   - Modal **Bukti Absensi** seketika setelah pengiriman berhasil.
2. **Aturan Bisnis Otoritatif di Backend**
   - Masuk `<= 08:00:00 WIB` tercatat **Hadir** (hijau `#059669`), lewat `08:00:00 WIB` otomatis tercatat **Terlambat** (amber `#D97706`).
   - Pulang baru dibuka mulai pukul `15:00:00 WIB` (sebelum 15:00 ditolak HTTP 400) dan wajib sudah memiliki catatan **Masuk** di hari yang sama.
   - Duplikasi absen pada jenis & tanggal yang sama ditolak (HTTP 409 Conflict).
   - Mendukung status **Hadir**, **Terlambat**, **Izin**, dan **Sakit**.
3. **Dashboard Admin Terproteksi JWT**
   - Login Admin berbasis JWT + password ter-hash `bcrypt` (tanpa registrasi publik).
   - Halaman **Pemantauan Absensi**: filter Tanggal, Karyawan, dan Status (`Semua / Hadir / Terlambat / Izin / Sakit`), pratinjau tanda tangan `.png` Masuk & Pulang di dalam modal, serta pencatatan status `Izin` / `Sakit`.
   - Halaman **Manajemen Data Karyawan**: daftar karyawan (`Kode`, `Nama`, `Status Aktif`), tambah/edit melalui modal, dan hapus dengan dialog konfirmasi.

## Akun Demo Admin
- **Username**: `admin`
- **Password**: `Admin123!`

## Struktur Proyek
```
.
├── backend/                        # Node.js + Express REST API + MySQL (Port 4000)
│   ├── config/
│   │   ├── connect.js              # mysql2/promise pool (timezone +07:00)
│   │   └── seed.js                 # Bootstrap skema & seeding admin + demo karyawan
│   ├── controllers/
│   │   ├── attendanceController.js
│   │   ├── authController.js
│   │   └── employeeController.js
│   ├── database/
│   │   └── schema.sql              # DDL SQL InnoDB utf8mb4
│   ├── middlewares/
│   │   └── authMiddleware.js       # Proteksi JWT untuk /api/admin/*
│   ├── models/
│   │   ├── adminModel.js           # Parameterized SQL queries
│   │   ├── attendanceModel.js
│   │   └── employeeModel.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   └── publicRoutes.js
│   ├── uploads/
│   │   └── signatures/             # Penyimpanan file PNG tanda tangan
│   ├── utils/
│   │   ├── fileHelper.js
│   │   └── timeHelper.js
│   ├── .env
│   └── app.js
└── frontend/                       # HTML + Tailwind CSS + Vanilla JS (Port 3000)
    ├── admin/
    │   ├── login.html
    │   ├── index.html
    │   └── karyawan.html
    ├── user/
    │   └── index.html
    ├── public/
    │   ├── css/tailwind.css
    │   └── js/
    └── app.js
```
