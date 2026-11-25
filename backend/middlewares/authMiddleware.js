const jwt = require('jsonwebtoken');

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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'stitch-absensi-karyawan-jwt-secret-key-2026'
    );
    req.admin = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({
      message: 'Sesi telah berakhir atau token tidak valid. Silakan login kembali.'
    });
  }
}

module.exports = { verifyAdminToken };
