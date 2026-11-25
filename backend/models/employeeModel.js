const pool = require('../config/connect');

const EmployeeModel = {
  async findAll({ search = '' } = {}) {
    const trimmed = String(search || '').trim();
    if (trimmed) {
      const pattern = `%${trimmed}%`;
      const [rows] = await pool.execute(
        `SELECT id, employee_code, full_name, is_active, created_at, updated_at
         FROM employees
         WHERE employee_code LIKE ? OR full_name LIKE ?
         ORDER BY employee_code ASC`,
        [pattern, pattern]
      );
      return rows;
    }

    const [rows] = await pool.execute(
      `SELECT id, employee_code, full_name, is_active, created_at, updated_at
       FROM employees
       ORDER BY employee_code ASC`
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT id, employee_code, full_name, is_active, created_at, updated_at
       FROM employees
       WHERE id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByCode(employeeCode) {
    const [rows] = await pool.execute(
      `SELECT id, employee_code, full_name, is_active, created_at, updated_at
       FROM employees
       WHERE employee_code = ?
       LIMIT 1`,
      [employeeCode]
    );
    return rows[0] || null;
  },

  /**
   * Daftar karyawan aktif beserta status absensi hari ini (MASUK & PULANG)
   */
  async findAttendanceOptionsByDate(todayDate) {
    const [rows] = await pool.execute(
      `SELECT
         e.id,
         e.employee_code,
         e.full_name,
         e.is_active,
         m.id AS masuk_id,
         m.check_time AS masuk_time,
         m.status AS masuk_status,
         p.id AS pulang_id,
         p.check_time AS pulang_time,
         p.status AS pulang_status
       FROM employees e
       LEFT JOIN attendances m
         ON m.employee_id = e.id
         AND m.attendance_date = ?
         AND m.attendance_type = 'MASUK'
       LEFT JOIN attendances p
         ON p.employee_id = e.id
         AND p.attendance_date = ?
         AND p.attendance_type = 'PULANG'
       WHERE e.is_active = 1
       ORDER BY e.employee_code ASC`,
      [todayDate, todayDate]
    );

    return rows.map((row) => {
      const isLeaveToday = row.masuk_status === 'Izin' || row.masuk_status === 'Sakit';
      return {
        id: row.id,
        employee_code: row.employee_code,
        full_name: row.full_name,
        has_checked_in: Boolean(row.masuk_id),
        has_checked_out: Boolean(row.pulang_id) || isLeaveToday,
        is_leave_today: isLeaveToday,
        masuk_time: row.masuk_time || null,
        pulang_time: row.pulang_time || null,
        today_status: row.masuk_status || null
      };
    });
  },

  async create({ employee_code, full_name, is_active = 1 }) {
    const activeVal = is_active ? 1 : 0;
    const [result] = await pool.execute(
      'INSERT INTO employees (employee_code, full_name, is_active) VALUES (?, ?, ?)',
      [employee_code, full_name, activeVal]
    );
    return this.findById(result.insertId);
  },

  async update(id, { employee_code, full_name, is_active }) {
    const activeVal = is_active ? 1 : 0;
    await pool.execute(
      'UPDATE employees SET employee_code = ?, full_name = ?, is_active = ? WHERE id = ?',
      [employee_code, full_name, activeVal, id]
    );
    return this.findById(id);
  },

  async remove(id) {
    // Ambil daftar file tanda tangan terkait agar tidak menyisakan file yatim
    const [sigRows] = await pool.execute(
      'SELECT signature_path FROM attendances WHERE employee_id = ? AND signature_path IS NOT NULL',
      [id]
    );
    const [result] = await pool.execute('DELETE FROM employees WHERE id = ?', [id]);
    return {
      affectedRows: result.affectedRows,
      signaturePaths: sigRows.map((r) => r.signature_path).filter(Boolean)
    };
  }
};

module.exports = EmployeeModel;
