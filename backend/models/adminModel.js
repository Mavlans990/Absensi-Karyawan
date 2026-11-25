const pool = require('../config/connect');

const AdminModel = {
  async findByUsername(username) {
    const [rows] = await pool.execute(
      'SELECT id, username, password_hash, nama_lengkap, created_at FROM admins WHERE username = ? LIMIT 1',
      [username]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, username, nama_lengkap, created_at FROM admins WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] || null;
  }
};

module.exports = AdminModel;
