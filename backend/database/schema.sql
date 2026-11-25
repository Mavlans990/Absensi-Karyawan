-- =====================================================================
-- Skema Database MySQL: Aplikasi Absensi Karyawan
-- Engine: InnoDB | Charset: utf8mb4 | Timezone: Asia/Jakarta (+07:00)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS db_absensi_karyawan
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_absensi_karyawan;

SET time_zone = '+07:00';

-- 1. Tabel admins
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(100) NOT NULL DEFAULT 'Administrator',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel employees
CREATE TABLE IF NOT EXISTS employees (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel attendances
-- Satu baris per jenis absen (MASUK / PULANG) per karyawan per tanggal
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
