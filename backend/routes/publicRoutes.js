const express = require('express');
const EmployeeController = require('../controllers/employeeController');
const AttendanceController = require('../controllers/attendanceController');

const router = express.Router();

// Endpoint Publik (tanpa login)
router.get('/employees/attendance-options', EmployeeController.getAttendanceOptions);
router.post('/attendances', AttendanceController.submitAttendance);

module.exports = router;
