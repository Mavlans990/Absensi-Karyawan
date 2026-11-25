const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Kredensial database WAJIB dari environment — tidak ada fallback tertulis di kode.
// Kalau ada yang kurang, server gagal start dengan pesan jelas; itu lebih aman
// daripada diam-diam jalan memakai kredensial bawaan yang diketahui siapa pun
// yang memegang kode ini.
const requiredEnv = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(
    `Konfigurasi database tidak lengkap. Environment variable belum diisi: ${missingEnv.join(', ')}`
  );
}

// SSL untuk database cloud (Aiven mewajibkan ssl-mode=REQUIRED).
// Isi salah satu:
// - environment variable DB_SSL_CA berisi sertifikat CA (teks PEM) dari penyedia
//   database (di Aiven: Overview service > CA certificate > Download), atau
// - file ca.pem di folder config/ ini.
// Tanpa keduanya, koneksi dibuat tanpa SSL (cocok untuk MySQL lokal).
function buildSslConfig() {
  if (process.env.DB_SSL_CA) {
    return {
      ca: process.env.DB_SSL_CA.replace(/\\n/g, '\n'),
      rejectUnauthorized: true
    };
  }
  const caPath = path.join(__dirname, 'ca.pem');
  if (fs.existsSync(caPath)) {
    return { ca: fs.readFileSync(caPath, 'utf8'), rejectUnauthorized: true };
  }
  return undefined;
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: buildSslConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
  dateStrings: true,
  charset: 'utf8mb4'
});

// Pastikan setiap koneksi sesi MySQL menggunakan zona waktu WIB (+07:00)
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+07:00'");
});

module.exports = pool;
