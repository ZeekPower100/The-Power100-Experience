// DATABASE-CHECKED: company_employees columns verified November 14, 2025
const { query } = require('../config/database');
const csv = require('csv-parser');
const { Readable } = require('stream');

/**
 * Get all employees for a contractor
 * GET /api/employees/contractor/:contractorId
 */
const getEmployeesByContractor = async (req, res, next) => {
  try {
    const { contractorId } = req.params;

    // DATABASE FIELDS: company_employees (all columns)
    const result = await query(`
      SELECT
        id,
        contractor_id,
        first_name,
        last_name,
        email,
        phone,
        department,
        role_title,
        hire_date,
        termination_date,
        is_active,
        sms_opt_in,
        email_opt_in,
        last_survey_sent,
        last_survey_completed,
        total_surveys_completed,
        created_at,
        updated_at
      FROM company_employees
      WHERE contractor_id = $1
      ORDER BY last_name, first_name
    `, [contractorId]);

    res.json({
      success: true,
      employees: result.rows,
      total: result.rows.length,
      active: result.rows.filter(e => e.is_active).length
    });
  } catch (error) {
    console.error('[Employee Controller] Error fetching employees:', error);
    next(error);
  }
};

/**
 * Get single employee by ID
 * GET /api/employees/:id
 */
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // DATABASE FIELDS: company_employees (all columns)
    const result = await query(`
      SELECT
        id,
        contractor_id,
        first_name,
        last_name,
        email,
        phone,
        department,
        role_title,
        hire_date,
        termination_date,
        is_active,
        sms_opt_in,
        email_opt_in,
        last_survey_sent,
        last_survey_completed,
        total_surveys_completed,
        created_at,
        updated_at
      FROM company_employees
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('[Employee Controller] Error fetching employee:', error);
    next(error);
  }
};

/**
 * Create single employee
 * POST /api/employees
 */
const createEmployee = async (req, res, next) => {
  try {
    const {
      contractor_id,
      first_name,
      last_name,
      email,
      phone,
      department,
      role_title,
      hire_date,
      sms_opt_in = true,
      email_opt_in = true
    } = req.body;

    // Validation
    if (!contractor_id || !first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'contractor_id, first_name, last_name, and email are required'
      });
    }

    // DATABASE FIELDS: company_employees (insert columns)
    const result = await query(`
      INSERT INTO company_employees (
        contractor_id, first_name, last_name, email, phone,
        department, role_title, hire_date, sms_opt_in, email_opt_in
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [contractor_id, first_name, last_name, email, phone, department, role_title, hire_date, sms_opt_in, email_opt_in]);

    // Update contractor total_employees count
    // DATABASE FIELDS: contractors (total_employees)
    await query(`
      UPDATE contractors
      SET total_employees = (
        SELECT COUNT(*) FROM company_employees WHERE contractor_id = $1 AND is_active = true
      )
      WHERE id = $1
    `, [contractor_id]);

    console.log(`[Employee Controller] ✅ Employee created: ${email} for contractor ${contractor_id}`);

    res.status(201).json({
      success: true,
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('[Employee Controller] Error creating employee:', error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'Employee with this email already exists for this contractor'
      });
    }

    next(error);
  }
};

/**
 * Update employee
 * PUT /api/employees/:id
 */
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone,
      department,
      role_title,
      hire_date,
      termination_date,
      is_active,
      sms_opt_in,
      email_opt_in
    } = req.body;

    // DATABASE FIELDS: company_employees (update columns)
    const result = await query(`
      UPDATE company_employees
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        department = COALESCE($5, department),
        role_title = COALESCE($6, role_title),
        hire_date = COALESCE($7, hire_date),
        termination_date = $8,
        is_active = COALESCE($9, is_active),
        sms_opt_in = COALESCE($10, sms_opt_in),
        email_opt_in = COALESCE($11, email_opt_in),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [first_name, last_name, email, phone, department, role_title, hire_date, termination_date, is_active, sms_opt_in, email_opt_in, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // Update contractor total_employees count
    const employee = result.rows[0];
    await query(`
      UPDATE contractors
      SET total_employees = (
        SELECT COUNT(*) FROM company_employees WHERE contractor_id = $1 AND is_active = true
      )
      WHERE id = $1
    `, [employee.contractor_id]);

    console.log(`[Employee Controller] ✅ Employee updated: ${id}`);

    res.json({
      success: true,
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('[Employee Controller] Error updating employee:', error);
    next(error);
  }
};

/**
 * Delete employee
 * DELETE /api/employees/:id
 */
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get employee first to get contractor_id
    const employeeResult = await query(`
      SELECT contractor_id FROM company_employees WHERE id = $1
    `, [id]);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const contractorId = employeeResult.rows[0].contractor_id;

    // DATABASE FIELDS: company_employees (delete)
    await query(`DELETE FROM company_employees WHERE id = $1`, [id]);

    // Update contractor total_employees count
    await query(`
      UPDATE contractors
      SET total_employees = (
        SELECT COUNT(*) FROM company_employees WHERE contractor_id = $1 AND is_active = true
      )
      WHERE id = $1
    `, [contractorId]);

    console.log(`[Employee Controller] ✅ Employee deleted: ${id}`);

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('[Employee Controller] Error deleting employee:', error);
    next(error);
  }
};

/**
 * Bulk import employees from CSV
 * POST /api/employees/bulk-import
 */
const bulkImportEmployees = async (req, res, next) => {
  try {
    const { contractor_id, csv_data } = req.body;

    if (!csv_data || !contractor_id) {
      return res.status(400).json({
        success: false,
        error: 'contractor_id and csv_data required'
      });
    }

    const employees = [];
    const errors = [];

    console.log(`[Employee Controller] Starting bulk import for contractor ${contractor_id}...`);

    // Parse CSV
    const stream = Readable.from([csv_data]);

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (row) => {
          employees.push({
            contractor_id,
            first_name: row.first_name || row['First Name'],
            last_name: row.last_name || row['Last Name'],
            email: row.email || row['Email'],
            phone: row.phone || row['Phone'] || null,
            department: row.department || row['Department'] || null,
            role_title: row.role_title || row['Role'] || row['Title'] || null,
            hire_date: row.hire_date || row['Hire Date'] || null
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`[Employee Controller] Parsed ${employees.length} employees from CSV`);

    // Insert employees
    let successCount = 0;
    for (const emp of employees) {
      try {
        // Validate required fields
        if (!emp.first_name || !emp.last_name || !emp.email) {
          errors.push({
            email: emp.email || 'unknown',
            error: 'Missing required fields (first_name, last_name, email)'
          });
          continue;
        }

        // DATABASE FIELDS: company_employees (bulk insert)
        await query(`
          INSERT INTO company_employees (
            contractor_id, first_name, last_name, email, phone, department, role_title, hire_date
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (contractor_id, email) DO NOTHING
        `, [emp.contractor_id, emp.first_name, emp.last_name, emp.email, emp.phone, emp.department, emp.role_title, emp.hire_date]);

        successCount++;
      } catch (err) {
        errors.push({ email: emp.email, error: err.message });
      }
    }

    // Update contractor total_employees count
    // DATABASE FIELDS: contractors (total_employees)
    await query(`
      UPDATE contractors
      SET total_employees = (
        SELECT COUNT(*) FROM company_employees WHERE contractor_id = $1 AND is_active = true
      )
      WHERE id = $1
    `, [contractor_id]);

    console.log(`[Employee Controller] ✅ Bulk import complete: ${successCount} imported, ${errors.length} errors`);

    res.json({
      success: true,
      imported: successCount,
      total_processed: employees.length,
      errors: errors.length,
      error_details: errors
    });
  } catch (error) {
    console.error('[Employee Controller] Error bulk importing employees:', error);
    next(error);
  }
};

module.exports = {
  getEmployeesByContractor,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkImportEmployees
};
