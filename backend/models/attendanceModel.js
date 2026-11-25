const pool = require('../config/connect');

const AttendanceModel = {
  async findByEmployeeDateAndType(employeeId, attendanceDate, attendanceType) {
    const [rows] = await pool.execute(
      `SELECT id, employee_id, attendance_date, attendance_type, check_time,
              check_time AS attendance_time, status, signature_path, created_at
       FROM attendances
       WHERE employee_id = ? AND attendance_date = ? AND attendance_type = ?
       LIMIT 1`,
      [employeeId, attendanceDate, attendanceType]
    );
    return rows[0] || null;
  },

  async findByEmployeeAndDate(employeeId, attendanceDate) {
    const [rows] = await pool.execute(
      `SELECT id, employee_id, attendance_date, attendance_type, check_time,
              check_time AS attendance_time, status, signature_path, created_at
       FROM attendances
       WHERE employee_id = ? AND attendance_date = ?
       ORDER BY FIELD(attendance_type, 'MASUK', 'PULANG')`,
      [employeeId, attendanceDate]
    );
    return rows;
  },

  async findByIdWithEmployee(id) {
    const [rows] = await pool.execute(
      `SELECT a.id, a.employee_id, e.employee_code, e.full_name,
              a.attendance_date, a.attendance_type, a.check_time,
              a.check_time AS attendance_time, a.status, a.signature_path, a.created_at
       FROM attendances a
       INNER JOIN employees e ON e.id = a.employee_id
       WHERE a.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ employee_id, attendance_date, attendance_type, check_time, status, signature_path }) {
    const [result] = await pool.execute(
      `INSERT INTO attendances
         (employee_id, attendance_date, attendance_type, check_time, status, signature_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [employee_id, attendance_date, attendance_type, check_time, status, signature_path || null]
    );
    return this.findByIdWithEmployee(result.insertId);
  },

  /**
   * Catat status Izin atau Sakit oleh Admin (disimpan sebagai baris MASUK tanpa tanda tangan)
   */
  async createLeaveRecord({ employee_id, attendance_date, check_time, status }) {
    const [result] = await pool.execute(
      `INSERT INTO attendances
         (employee_id, attendance_date, attendance_type, check_time, status, signature_path)
       VALUES (?, ?, 'MASUK', ?, ?, NULL)`,
      [employee_id, attendance_date, check_time, status]
    );
    return this.findByIdWithEmployee(result.insertId);
  },

  /**
   * Rekap harian terpadu untuk tabel Admin (menggabungkan Jam Masuk + Jam Pulang per karyawan & tanggal)
   * Seluruh filter memakai parameterized query (?)
   */
  async findAdminDailySummary({ date = '', employee_id = '', status = '', search = '' } = {}) {
    const params = [];
    const outerConditions = [];

    let sql = `
      SELECT * FROM (
        SELECT
          d.employee_id,
          e.employee_code,
          e.full_name,
          e.is_active,
          d.attendance_date,
          m.id AS masuk_id,
          m.check_time AS jam_masuk,
          m.status AS status_masuk,
          m.signature_path AS signature_masuk,
          p.id AS pulang_id,
          p.check_time AS jam_pulang,
          p.status AS status_pulang,
          p.signature_path AS signature_pulang,
          COALESCE(m.status, p.status) AS daily_status,
          COALESCE(m.id, p.id) AS primary_id,
          COALESCE(m.created_at, p.created_at) AS created_at
        FROM (
          SELECT DISTINCT employee_id, attendance_date
          FROM attendances
        ) d
        INNER JOIN employees e
          ON e.id = d.employee_id
        LEFT JOIN attendances m
          ON m.employee_id = d.employee_id
          AND m.attendance_date = d.attendance_date
          AND m.attendance_type = 'MASUK'
        LEFT JOIN attendances p
          ON p.employee_id = d.employee_id
          AND p.attendance_date = d.attendance_date
          AND p.attendance_type = 'PULANG'
      ) summary
    `;

    if (date) {
      outerConditions.push('summary.attendance_date = ?');
      params.push(date);
    }

    if (employee_id) {
      outerConditions.push('summary.employee_id = ?');
      params.push(Number(employee_id));
    }

    if (status && status !== 'Semua') {
      outerConditions.push('summary.daily_status = ?');
      params.push(status);
    }

    if (search && String(search).trim()) {
      const pattern = `%${String(search).trim()}%`;
      outerConditions.push('(summary.employee_code LIKE ? OR summary.full_name LIKE ?)');
      params.push(pattern, pattern);
    }

    if (outerConditions.length > 0) {
      sql += ` WHERE ${outerConditions.join(' AND ')}`;
    }

    sql += ' ORDER BY summary.attendance_date DESC, COALESCE(summary.jam_masuk, summary.jam_pulang) DESC, summary.employee_code ASC';

    const [rows] = await pool.execute(sql, params);

    return rows.map((r) => {
      const isLeave = r.daily_status === 'Izin' || r.daily_status === 'Sakit';
      return {
        id: r.primary_id,
        employee_id: r.employee_id,
        employee_code: r.employee_code,
        full_name: r.full_name,
        is_active: r.is_active,
        attendance_date: r.attendance_date,
        attendance_type: r.pulang_id ? 'MASUK & PULANG' : 'MASUK',
        jam_masuk: isLeave ? null : r.jam_masuk,
        jam_pulang: isLeave ? null : r.jam_pulang,
        check_time: r.jam_masuk || r.jam_pulang,
        attendance_time: r.jam_masuk || r.jam_pulang,
        status: r.daily_status,
        signature_masuk: r.signature_masuk || null,
        signature_pulang: r.signature_pulang || null,
        signature_path: r.signature_masuk || r.signature_pulang || null,
        created_at: r.created_at
      };
    });
  },

  /**
   * Daftar baris mentah tabel attendances (1 baris per jenis absen)
   */
  async findRawRecords({ date = '', employee_id = '', status = '' } = {}) {
    const conditions = [];
    const params = [];

    if (date) {
      conditions.push('a.attendance_date = ?');
      params.push(date);
    }
    if (employee_id) {
      conditions.push('a.employee_id = ?');
      params.push(Number(employee_id));
    }
    if (status && status !== 'Semua') {
      conditions.push('a.status = ?');
      params.push(status);
    }

    let sql = `
      SELECT
        a.id,
        a.employee_id,
        e.employee_code,
        e.full_name,
        a.attendance_date,
        a.attendance_type,
        a.check_time,
        a.check_time AS attendance_time,
        a.status,
        a.signature_path,
        a.created_at
      FROM attendances a
      INNER JOIN employees e ON e.id = a.employee_id
    `;

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY a.attendance_date DESC, a.check_time DESC';

    const [rows] = await pool.execute(sql, params);
    return rows;
  }
};

module.exports = AttendanceModel;
