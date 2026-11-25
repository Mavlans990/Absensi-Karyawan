const path = require('path');
const http = require('http');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BACKEND_URL = new URL(process.env.BACKEND_URL || 'http://127.0.0.1:4000');

/**
 * Reverse proxy transparan untuk /api/* dan /uploads/* menuju Backend REST API (port 4000).
 * Memastikan browser pengguna di Live Preview dapat memanggil path relatif (/api & /uploads)
 * tanpa memanggil localhost dari sisi klien, sambil tetap menjaga arsitektur terpisah port 3000 -> 4000.
 */
function proxyToBackend(req, res) {
  const options = {
    hostname: BACKEND_URL.hostname,
    port: BACKEND_URL.port || 4000,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_URL.hostname}:${BACKEND_URL.port || 4000}`
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('[Frontend Proxy Error]', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        message: 'Layanan Backend REST API (port 4000) sedang tidak dapat dihubungi.'
      });
    }
  });

  req.pipe(proxyReq, { end: true });
}

app.use('/api', proxyToBackend);
app.use('/uploads', proxyToBackend);

// Static assets publik (CSS, JS)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Rute halaman utama (Form Absensi Publik)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'user', 'index.html'));
});

app.get(['/user', '/user/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'user', 'index.html'));
});

// Rute halaman Admin
app.get(['/admin/login', '/admin/login.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

app.get(['/admin', '/admin/index.html', '/admin/absensi', '/admin/absensi.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.get(['/admin/karyawan', '/admin/karyawan.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'karyawan.html'));
});

// Static fallback untuk direktori user & admin
app.use('/user', express.static(path.join(__dirname, 'user')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Fallback 404 mengarah ke halaman utama
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'user', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Frontend] Aplikasi Absensi Karyawan berjalan di http://0.0.0.0:${PORT}`);
});
