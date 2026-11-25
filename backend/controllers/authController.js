const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminModel = require('../models/adminModel');

// Secret JWT WAJIB dari environment — tidak ada fallback tertulis di kode,
// supaya tidak ada yang bisa memalsukan token admin dari salinan kode ini.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET belum diisi di environment. Server tidak boleh jalan tanpa secret JWT.');
}

const AuthController = {
  async login(req, res) {
    try {
      const username = String(req.body?.username || '').trim();
      const password = String(req.body?.password || '');

      if (!username || !password) {
        return res.status(400).json({
          message: 'Username dan kata sandi wajib diisi.'
        });
      }

      const admin = await AdminModel.findByUsername(username);
      if (!admin) {
        return res.status(401).json({
          message: 'Username atau kata sandi salah.'
        });
      }

      const isMatch = await bcrypt.compare(password, admin.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          message: 'Username atau kata sandi salah.'
        });
      }

      const payload = {
        id: admin.id,
        username: admin.username,
        nama_lengkap: admin.nama_lengkap
      };

      const token = jwt.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '12h'
      });

      return res.status(200).json({
        message: 'Login berhasil.',
        token,
        admin: payload
      });
    } catch (error) {
      console.error('[AuthController.login]', error);
      return res.status(500).json({
        message: 'Terjadi kesalahan pada server saat memproses login.'
      });
    }
  },

  async me(req, res) {
    try {
      const admin = await AdminModel.findById(req.admin.id);
      if (!admin) {
        return res.status(401).json({
          message: 'Akun administrator tidak ditemukan.'
        });
      }
      return res.status(200).json({ admin });
    } catch (error) {
      console.error('[AuthController.me]', error);
      return res.status(500).json({
        message: 'Gagal memuat profil administrator.'
      });
    }
  }
};

module.exports = AuthController;
