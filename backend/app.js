const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Pastikan runtime Node menggunakan zona waktu Asia/Jakarta
process.env.TZ = process.env.TZ || 'Asia/Jakarta';

const express = require('express');
const cors = require('cors');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { initializeAndSeedDatabase } = require('./config/seed');
const { ensureSignaturesDir, SIGNATURES_DIR } = require('./utils/fileHelper');
const { getJakartaNow } = require('./utils/timeHelper');

const app = express();
const PORT = Number(process.env.PORT || 4000);
const configuredFrontendOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

// Konfigurasi CORS untuk mengizinkan origin frontend (http://localhost:3000 & preview host)
const allowedOrigins = new Set([
  configuredFrontendOrigin,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin) || /\.e2b\.app$/.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  })
);

// Batas ukuran payload JSON 4 MB untuk mengakomodasi base64 PNG tanda tangan (maks file 2 MB)
app.use(express.json({ limit: '4mb' }));
app.use(express.urlencoded({ extended: true, limit: '4mb' }));

// Sajikan file tanda tangan PNG secara statis di /uploads/signatures/*
ensureSignaturesDir();
app.use('/uploads/signatures', express.static(SIGNATURES_DIR));

// Health / Info endpoint
app.get('/', (req, res) => {
  const now = getJakartaNow();
  res.status(200).json({
    service: 'Aplikasi Absensi Karyawan - Backend REST API',
    status: 'running',
    server_date: now.date,
    server_time: now.time,
    timezone: now.timezone
  });
});

app.get('/api/health', (req, res) => {
  const now = getJakartaNow();
  res.status(200).json({
    status: 'ok',
    server_date: now.date,
    server_time: now.time,
    timezone: now.timezone
  });
});

// Rute REST API
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler untuk rute API
app.use((req, res) => {
  res.status(404).json({
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`
  });
});

async function startServer() {
  try {
    await initializeAndSeedDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      const now = getJakartaNow();
      console.log(
        `[Backend] REST API berjalan di http://0.0.0.0:${PORT} | Waktu Server: ${now.dateTime} WIB`
      );
    });
  } catch (error) {
    console.error('[Backend] Gagal menginisialisasi server atau database MySQL:', error);
    process.exit(1);
  }
}

startServer();
