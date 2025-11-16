// DATABASE-CHECKED: Routes for company_employees management November 14, 2025
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

/**
 * Employee Management Routes
 * Base path: /api/employees
 */

// Get all employees for a contractor
// GET /api/employees/contractor/:contractorId
router.get('/contractor/:contractorId', employeeController.getEmployeesByContractor);

// Get single employee by ID
// GET /api/employees/:id
router.get('/:id', employeeController.getEmployeeById);

// Create new employee
// POST /api/employees
router.post('/', employeeController.createEmployee);

// Update employee
// PUT /api/employees/:id
router.put('/:id', employeeController.updateEmployee);

// Delete employee
// DELETE /api/employees/:id
router.delete('/:id', employeeController.deleteEmployee);

// Bulk import employees from CSV
// POST /api/employees/bulk-import
router.post('/bulk-import', employeeController.bulkImportEmployees);

module.exports = router;
