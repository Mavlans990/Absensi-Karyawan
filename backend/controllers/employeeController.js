const EmployeeModel = require('../models/employeeModel');
const {
  getJakartaNow,
  MASUK_ON_TIME_LIMIT,
  PULANG_OPEN_TIME
} = require('../utils/timeHelper');
const { deleteSignatureFile } = require('../utils/fileHelper');

const EmployeeController = {
  /**
   * Publik: GET /api/employees/attendance-options
   */
  async getAttendanceOptions(req, res) {
    try {
      const now = getJakartaNow();
      const employees = await EmployeeModel.findAttendanceOptionsByDate(now.date);

      return res.status(200).json({
        server_date: now.date,
        server_time: now.time,
        server_datetime: now.dateTime,
        formatted_date: now.formattedDate,
        server_timestamp_ms: now.timestampMs,
        timezone: now.timezone,
        rules: {
          masuk_deadline: MASUK_ON_TIME_LIMIT,
          pulang_open: PULANG_OPEN_TIME
        },
        data: employees
      });
    } catch (error) {
      console.error('[EmployeeController.getAttendanceOptions]', error);
      return res.status(500).json({
        message: 'Gagal memuat daftar karyawan untuk absensi.'
      });
    }
  },

  /**
   * Admin: GET /api/admin/employees
   */
  async getAllEmployees(req, res) {
    try {
      const search = req.query.search || '';
      const employees = await EmployeeModel.findAll({ search });
      return res.status(200).json({
        total: employees.length,
        data: employees
      });
    } catch (error) {
      console.error('[EmployeeController.getAllEmployees]', error);
      return res.status(500).json({
        message: 'Gagal mengambil data karyawan.'
      });
    }
  },

  /**
   * Admin: POST /api/admin/employees
   */
  async createEmployee(req, res) {
    try {
      const employeeCode = String(req.body?.employee_code || '').trim().toUpperCase();
      const fullName = String(req.body?.full_name || '').trim();
      const isActive =
        req.body?.is_active === undefined || req.body?.is_active === null
          ? 1
          : Number(Boolean(Number(req.body.is_active) || req.body.is_active === true));

      if (!employeeCode || !fullName) {
        return res.status(400).json({
          message: 'Kode karyawan dan nama lengkap wajib diisi.'
        });
      }

      if (employeeCode.length > 30) {
        return res.status(400).json({
          message: 'Kode karyawan maksimal 30 karakter.'
        });
      }

      if (fullName.length > 100) {
        return res.status(400).json({
          message: 'Nama lengkap maksimal 100 karakter.'
        });
      }

      const existing = await EmployeeModel.findByCode(employeeCode);
      if (existing) {
        return res.status(409).json({
          message: `Kode karyawan "${employeeCode}" sudah terdaftar. Gunakan kode unik lainnya.`
        });
      }

      const created = await EmployeeModel.create({
        employee_code: employeeCode,
        full_name: fullName,
        is_active: isActive
      });

      return res.status(201).json({
        message: 'Data karyawan berhasil ditambahkan.',
        data: created
      });
    } catch (error) {
      console.error('[EmployeeController.createEmployee]', error);
      return res.status(500).json({
        message: 'Gagal menambahkan data karyawan.'
      });
    }
  },

  /**
   * Admin: PUT /api/admin/employees/:id
   */
  async updateEmployee(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'ID karyawan tidak valid.' });
      }

      const current = await EmployeeModel.findById(id);
      if (!current) {
        return res.status(404).json({ message: 'Data karyawan tidak ditemukan.' });
      }

      const employeeCode = String(req.body?.employee_code || '').trim().toUpperCase();
      const fullName = String(req.body?.full_name || '').trim();
      const isActive =
        req.body?.is_active === undefined || req.body?.is_active === null
          ? current.is_active
          : Number(Boolean(Number(req.body.is_active) || req.body.is_active === true));

      if (!employeeCode || !fullName) {
        return res.status(400).json({
          message: 'Kode karyawan dan nama lengkap wajib diisi.'
        });
      }

      if (employeeCode.length > 30 || fullName.length > 100) {
        return res.status(400).json({
          message: 'Panjang kode (maks 30) atau nama lengkap (maks 100) melebihi batas.'
        });
      }

      const duplicate = await EmployeeModel.findByCode(employeeCode);
      if (duplicate && Number(duplicate.id) !== id) {
        return res.status(409).json({
          message: `Kode karyawan "${employeeCode}" sudah digunakan oleh karyawan lain.`
        });
      }

      const updated = await EmployeeModel.update(id, {
        employee_code: employeeCode,
        full_name: fullName,
        is_active: isActive
      });

      return res.status(200).json({
        message: 'Data karyawan berhasil diperbarui.',
        data: updated
      });
    } catch (error) {
      console.error('[EmployeeController.updateEmployee]', error);
      return res.status(500).json({
        message: 'Gagal memperbarui data karyawan.'
      });
    }
  },

  /**
   * Admin: DELETE /api/admin/employees/:id
   */
  async deleteEmployee(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: 'ID karyawan tidak valid.' });
      }

      const current = await EmployeeModel.findById(id);
      if (!current) {
        return res.status(404).json({ message: 'Data karyawan tidak ditemukan.' });
      }

      const { signaturePaths } = await EmployeeModel.remove(id);
      for (const sigPath of signaturePaths) {
        deleteSignatureFile(sigPath);
      }

      return res.status(200).json({
        message: 'Data karyawan berhasil dihapus.'
      });
    } catch (error) {
      console.error('[EmployeeController.deleteEmployee]', error);
      return res.status(500).json({
        message: 'Gagal menghapus data karyawan.'
      });
    }
  }
};

module.exports = EmployeeController;
