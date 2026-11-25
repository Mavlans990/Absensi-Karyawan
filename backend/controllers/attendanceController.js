const EmployeeModel = require('../models/employeeModel');
const AttendanceModel = require('../models/attendanceModel');
const {
  getJakartaNow,
  evaluateMasukStatus,
  isPulangOpen,
  isValidDateString
} = require('../utils/timeHelper');
const { saveSignaturePng, deleteSignatureFile } = require('../utils/fileHelper');

const VALID_STATUSES = ['Semua', 'Hadir', 'Terlambat', 'Izin', 'Sakit'];

const AttendanceController = {
  /**
   * Publik: POST /api/attendances
   * Seluruh tanggal & jam dievaluasi mutlak menggunakan waktu server Asia/Jakarta (WIB)
   */
  async submitAttendance(req, res) {
    let savedSignaturePath = null;
    try {
      const employeeId = Number(req.body?.employee_id);
      const attendanceType = String(req.body?.attendance_type || '').trim().toUpperCase();
      const signatureImage = req.body?.signature_image;

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({
          message: 'Silakan pilih nama karyawan terlebih dahulu.'
        });
      }

      if (attendanceType !== 'MASUK' && attendanceType !== 'PULANG') {
        return res.status(400).json({
          message: 'Jenis absensi tidak valid. Pilih MASUK atau PULANG.'
        });
      }

      if (!signatureImage || typeof signatureImage !== 'string') {
        return res.status(400).json({
          message: 'Tanda tangan digital wajib diisi sebelum mengirim absensi.'
        });
      }

      // 1. Pastikan karyawan terdaftar dan aktif
      const employee = await EmployeeModel.findById(employeeId);
      if (!employee || Number(employee.is_active) !== 1) {
        return res.status(404).json({
          message: 'Data karyawan tidak ditemukan atau status karyawan sedang nonaktif.'
        });
      }

      // 2. Ambil waktu otoritatif server WIB
      const now = getJakartaNow();

      // 3. Periksa riwayat absensi karyawan pada tanggal hari ini
      const todayRecords = await AttendanceModel.findByEmployeeAndDate(employeeId, now.date);
      const masukRecord = todayRecords.find((r) => r.attendance_type === 'MASUK') || null;
      const pulangRecord = todayRecords.find((r) => r.attendance_type === 'PULANG') || null;

      // Jika sudah tercatat Izin atau Sakit hari ini
      if (masukRecord && (masukRecord.status === 'Izin' || masukRecord.status === 'Sakit')) {
        return res.status(409).json({
          message: `Karyawan ${employee.full_name} telah tercatat berstatus ${masukRecord.status} pada hari ini.`
        });
      }

      // 4. Tolak duplikasi jenis absensi yang sama di hari yang sama
      if (attendanceType === 'MASUK' && masukRecord) {
        return res.status(409).json({
          message: `${employee.full_name} sudah melakukan absen Masuk hari ini pada pukul ${masukRecord.check_time} WIB.`
        });
      }

      if (attendanceType === 'PULANG' && pulangRecord) {
        return res.status(409).json({
          message: `${employee.full_name} sudah melakukan absen Pulang hari ini pada pukul ${pulangRecord.check_time} WIB.`
        });
      }

      // 5. Evaluasi aturan bisnis berdasarkan jenis absen
      let status = 'Hadir';
      if (attendanceType === 'MASUK') {
        // <= 08:00:00 WIB -> Hadir, > 08:00:00 WIB -> Terlambat
        status = evaluateMasukStatus(now.time);
      } else {
        // Aturan Absen Pulang:
        // (a) Hanya dibuka mulai pukul 15:00:00 WIB
        if (!isPulangOpen(now.time)) {
          return res.status(400).json({
            message: `Absen Pulang belum dibuka. Absen Pulang baru dapat dilakukan mulai pukul 15:00 WIB (waktu server saat ini: ${now.time} WIB).`
          });
        }

        // (b) Wajib sudah memiliki catatan Absen Masuk pada hari yang sama
        if (!masukRecord) {
          return res.status(400).json({
            message: `${employee.full_name} belum melakukan absen Masuk hari ini. Wajib absen Masuk terlebih dahulu sebelum absen Pulang.`
          });
        }

        status = 'Hadir';
      }

      // 6. Validasi & simpan gambar tanda tangan sebagai file PNG di disk
      savedSignaturePath = saveSignaturePng(
        signatureImage,
        employeeId,
        now.compactDate,
        attendanceType
      );

      // 7. Simpan catatan ke database MySQL (hanya menyimpan signature_path)
      const created = await AttendanceModel.create({
        employee_id: employeeId,
        attendance_date: now.date,
        attendance_type: attendanceType,
        check_time: now.time,
        status,
        signature_path: savedSignaturePath
      });

      return res.status(201).json({
        message: 'Absensi berhasil dicatat.',
        data: {
          id: created.id,
          employee_id: created.employee_id,
          employee_code: created.employee_code,
          full_name: created.full_name,
          attendance_type: created.attendance_type,
          attendance_date: created.attendance_date,
          formatted_date: now.formattedDate,
          check_time: created.check_time,
          attendance_time: created.attendance_time,
          status: created.status,
          daily_status: attendanceType === 'PULANG' && masukRecord ? masukRecord.status : created.status,
          signature_path: created.signature_path
        }
      });
    } catch (error) {
      if (savedSignaturePath) {
        deleteSignatureFile(savedSignaturePath);
      }

      if (error.statusCode) {
        return res.status(error.statusCode).json({ message: error.message });
      }

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          message: 'Data absensi untuk jenis ini pada hari ini sudah tercatat sebelumnya.'
        });
      }

      console.error('[AttendanceController.submitAttendance]', error);
      return res.status(500).json({
        message: 'Terjadi kesalahan pada server saat menyimpan absensi.'
      });
    }
  },

  /**
   * Admin: GET /api/admin/attendances?date=YYYY-MM-DD&employee_id=1&status=Terlambat&search=...
   */
  async getAdminAttendances(req, res) {
    try {
      const date = String(req.query.date || '').trim();
      const employeeId = String(req.query.employee_id || '').trim();
      const status = String(req.query.status || 'Semua').trim();
      const search = String(req.query.search || '').trim();

      if (date && !isValidDateString(date)) {
        return res.status(400).json({
          message: 'Format filter tanggal tidak valid (gunakan YYYY-MM-DD).'
        });
      }

      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          message: 'Filter status tidak valid.'
        });
      }

      const now = getJakartaNow();
      const [dailyRows, rawRows] = await Promise.all([
        AttendanceModel.findAdminDailySummary({
          date,
          employee_id: employeeId,
          status,
          search
        }),
        AttendanceModel.findRawRecords({
          date,
          employee_id: employeeId,
          status
        })
      ]);

      const summary = {
        total: dailyRows.length,
        hadir: dailyRows.filter((r) => r.status === 'Hadir').length,
        terlambat: dailyRows.filter((r) => r.status === 'Terlambat').length,
        izin: dailyRows.filter((r) => r.status === 'Izin').length,
        sakit: dailyRows.filter((r) => r.status === 'Sakit').length
      };

      return res.status(200).json({
        server_date: now.date,
        server_time: now.time,
        timezone: now.timezone,
        summary,
        data: dailyRows,
        records: rawRows
      });
    } catch (error) {
      console.error('[AttendanceController.getAdminAttendances]', error);
      return res.status(500).json({
        message: 'Gagal memuat data riwayat absensi.'
      });
    }
  },

  /**
   * Admin: POST /api/admin/attendances/leave
   * Mencatat status Izin atau Sakit karyawan oleh Admin
   */
  async createAdminLeaveStatus(req, res) {
    try {
      const now = getJakartaNow();
      const employeeId = Number(req.body?.employee_id);
      const status = String(req.body?.status || '').trim();
      const attendanceDate = String(req.body?.attendance_date || now.date).trim();

      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return res.status(400).json({ message: 'Karyawan wajib dipilih.' });
      }

      if (status !== 'Izin' && status !== 'Sakit') {
        return res.status(400).json({ message: 'Status hanya boleh diisi Izin atau Sakit.' });
      }

      if (!isValidDateString(attendanceDate)) {
        return res.status(400).json({ message: 'Format tanggal tidak valid (YYYY-MM-DD).' });
      }

      const employee = await EmployeeModel.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: 'Data karyawan tidak ditemukan.' });
      }

      const existing = await AttendanceModel.findByEmployeeAndDate(employeeId, attendanceDate);
      if (existing.length > 0) {
        return res.status(409).json({
          message: `Karyawan ${employee.full_name} sudah memiliki catatan absensi pada tanggal ${attendanceDate}.`
        });
      }

      const created = await AttendanceModel.createLeaveRecord({
        employee_id: employeeId,
        attendance_date: attendanceDate,
        check_time: now.time,
        status
      });

      return res.status(201).json({
        message: `Status ${status} untuk ${employee.full_name} berhasil dicatat.`,
        data: created
      });
    } catch (error) {
      console.error('[AttendanceController.createAdminLeaveStatus]', error);
      return res.status(500).json({
        message: 'Gagal mencatat status Izin/Sakit.'
      });
    }
  }
};

module.exports = AttendanceController;
