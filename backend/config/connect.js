const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  // DATABASE_URL: process.env.DATABASE_URL || '',
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME || 'db_absensi_karyawan',
  user: process.env.DB_USER || 'absensi_user',
  password: process.env.DB_PASS || 'absensi_pass_2026',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+07:00',
  dateStrings: true,
  charset: 'utf8mb4'
});

// const pool = mysql.createPool({
//     host: 'sql.freedb.tech',
//     user: 'root',
//     password: '',
//     database: 'db_absensi_karyawan',
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//     timezone: '+07:00',
//     dateStrings: true,
//     charset: 'utf8mb4'
// });

// Pastikan setiap koneksi sesi MySQL menggunakan zona waktu WIB (+07:00)
pool.on('connection', (connection) => {
  connection.query("SET time_zone = '+07:00'");
});

module.exports = pool;
