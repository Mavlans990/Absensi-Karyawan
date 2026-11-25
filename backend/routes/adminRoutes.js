const express = require('express');
const AuthController = require('../controllers/authController');
const EmployeeController = require('../controllers/employeeController');
const AttendanceController = require('../controllers/attendanceController');
const { verifyAdminToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// Autentikasi Admin (publik untuk login)
router.post('/login', AuthController.login);

// Seluruh endpoint di bawah ini wajib JWT valid
router.use(verifyAdminToken);

router.get('/me', AuthController.me);

// Pemantauan Absensi
router.get('/attendances', AttendanceController.getAdminAttendances);
router.post('/attendances/leave', AttendanceController.createAdminLeaveStatus);

// Manajemen Master Karyawan (CRUD)
router.get('/employees', EmployeeController.getAllEmployees);
router.post('/employees', EmployeeController.createEmployee);
router.put('/employees/:id', EmployeeController.updateEmployee);
router.delete('/employees/:id', EmployeeController.deleteEmployee);

module.exports = router;
