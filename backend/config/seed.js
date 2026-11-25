const bcrypt = require('bcryptjs');
const pool = require('./connect');
const { getRelativeJakartaDate } = require('../utils/timeHelper');
const { generateDemoSignaturePng } = require('../utils/fileHelper');

async function initializeAndSeedDatabase() {
  // 1. Buat tabel jika belum ada
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nama_lengkap VARCHAR(100) NOT NULL DEFAULT 'Administrator',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      employee_code VARCHAR(30) NOT NULL UNIQUE,
      full_name VARCHAR(100) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendances (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      employee_id INT UNSIGNED NOT NULL,
      attendance_date DATE NOT NULL,
      attendance_type ENUM('MASUK', 'PULANG') NOT NULL,
      check_time TIME NOT NULL,
      attendance_time TIME GENERATED ALWAYS AS (check_time) VIRTUAL,
      status ENUM('Hadir', 'Terlambat', 'Izin', 'Sakit') NOT NULL,
      signature_path VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_attendances_employee
        FOREIGN KEY (employee_id) REFERENCES employees(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      UNIQUE KEY uq_employee_date_type (employee_id, attendance_date, attendance_type),
      INDEX idx_attendance_date (attendance_date),
      INDEX idx_attendance_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // 2. Seed akun Admin default (tanpa registrasi publik)
  const [existingAdmins] = await pool.execute('SELECT COUNT(*) AS total FROM admins');
  if (Number(existingAdmins[0].total) === 0) {
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await pool.execute(
      'INSERT INTO admins (username, password_hash, nama_lengkap) VALUES (?, ?, ?)',
      ['admin', passwordHash, 'Administrator Utama']
    );
    console.log('[Seed] Akun demo admin berhasil dibuat (username: admin).');
  }

  // 3. Seed demo karyawan sesuai spesifikasi PRD/Prompt
  const [existingEmployees] = await pool.execute('SELECT COUNT(*) AS total FROM employees');
  if (Number(existingEmployees[0].total) === 0) {
    const demoEmployees = [
      ['KRY-001', 'Budi Santoso', 1],
      ['KRY-002', 'Siti Rahayu', 1],
      ['KRY-003', 'Andi Pratama', 1]
    ];

    for (const [code, name, active] of demoEmployees) {
      await pool.execute(
        'INSERT INTO employees (employee_code, full_name, is_active) VALUES (?, ?, ?)',
        [code, name, active]
      );
    }
    console.log('[Seed] Demo karyawan (KRY-001, KRY-002, KRY-003) berhasil dibuat.');

    // 4. Seed riwayat absensi historis (kemarin & 2 hari lalu) agar tabel Admin
    // memiliki contoh lengkap Hadir, Terlambat, Izin, Sakit + tanda tangan PNG,
    // sementara hari ini tetap kosong dan siap diuji langsung di form publik.
    const [empRows] = await pool.execute(
      'SELECT id, employee_code FROM employees ORDER BY employee_code ASC'
    );
    const empByCode = {};
    for (const r of empRows) {
      empByCode[r.employee_code] = r.id;
    }

    const yesterday = getRelativeJakartaDate(-1);
    const twoDaysAgo = getRelativeJakartaDate(-2);
    const compactY = yesterday.replace(/-/g, '');
    const compact2 = twoDaysAgo.replace(/-/g, '');

    const sig1M = generateDemoSignaturePng(`sig_${empByCode['KRY-001']}_${compactY}_MASUK_seed1.png`, 1);
    const sig1P = generateDemoSignaturePng(`sig_${empByCode['KRY-001']}_${compactY}_PULANG_seed2.png`, 2);
    const sig2M = generateDemoSignaturePng(`sig_${empByCode['KRY-002']}_${compactY}_MASUK_seed3.png`, 3);
    const sig2P = generateDemoSignaturePng(`sig_${empByCode['KRY-002']}_${compactY}_PULANG_seed4.png`, 4);
    const sig1M2 = generateDemoSignaturePng(`sig_${empByCode['KRY-001']}_${compact2}_MASUK_seed5.png`, 5);
    const sig1P2 = generateDemoSignaturePng(`sig_${empByCode['KRY-001']}_${compact2}_PULANG_seed6.png`, 6);
    const sig2M2 = generateDemoSignaturePng(`sig_${empByCode['KRY-002']}_${compact2}_MASUK_seed7.png`, 7);
    const sig2P2 = generateDemoSignaturePng(`sig_${empByCode['KRY-002']}_${compact2}_PULANG_seed8.png`, 8);

    const historicalAttendances = [
      // Kemarin (H-1)
      [empByCode['KRY-001'], yesterday, 'MASUK', '07:48:15', 'Hadir', sig1M],
      [empByCode['KRY-001'], yesterday, 'PULANG', '16:12:40', 'Hadir', sig1P],
      [empByCode['KRY-002'], yesterday, 'MASUK', '08:19:05', 'Terlambat', sig2M],
      [empByCode['KRY-002'], yesterday, 'PULANG', '16:35:22', 'Hadir', sig2P],
      [empByCode['KRY-003'], yesterday, 'MASUK', '08:00:00', 'Izin', null],
      // 2 Hari Lalu (H-2)
      [empByCode['KRY-001'], twoDaysAgo, 'MASUK', '07:55:30', 'Hadir', sig1M2],
      [empByCode['KRY-001'], twoDaysAgo, 'PULANG', '15:45:10', 'Hadir', sig1P2],
      [empByCode['KRY-002'], twoDaysAgo, 'MASUK', '07:51:08', 'Hadir', sig2M2],
      [empByCode['KRY-002'], twoDaysAgo, 'PULANG', '16:02:51', 'Hadir', sig2P2],
      [empByCode['KRY-003'], twoDaysAgo, 'MASUK', '08:00:00', 'Sakit', null]
    ];

    for (const [empId, attDate, attType, checkTime, status, sigPath] of historicalAttendances) {
      await pool.execute(
        `INSERT INTO attendances
          (employee_id, attendance_date, attendance_type, check_time, status, signature_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [empId, attDate, attType, checkTime, status, sigPath]
      );
    }
    console.log('[Seed] Riwayat contoh absensi (Hadir, Terlambat, Izin, Sakit) berhasil dibuat.');
  }
}

if (require.main === module) {
  initializeAndSeedDatabase()
    .then(() => {
      console.log('[Seed] Selesai.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed] Gagal:', err);
      process.exit(1);
    });
}

module.exports = { initializeAndSeedDatabase };
