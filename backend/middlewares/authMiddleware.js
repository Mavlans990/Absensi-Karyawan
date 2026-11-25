const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const jwt = require('jsonwebtoken');

// Secret JWT WAJIB dari environment — harus sama dengan yang dipakai
// authController saat membuat token. Tidak ada fallback tertulis di kode.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET belum diisi di environment. Server tidak boleh jalan tanpa secret JWT.');
}

function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Akses ditolak. Token autentikasi tidak ditemukan.'
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      message: 'Akses ditolak. Format token tidak valid.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      message: 'Sesi telah berakhir atau token tidak valid. Silakan login kembali.'
    });
  }
}

module.exports = { verifyAdminToken };
