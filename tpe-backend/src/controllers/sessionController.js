const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Generate session token for contractor
const generateContractorToken = (contractorId, step = 1) => {
  return jwt.sign(
    { 
      contractorId,
      step,
      type: 'contractor_session'
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: '7d' // Session expires after 7 days
    }
  );
};

// Create or update contractor session
const createSession = async (req, res, next) => {
  try {
    const { contractorId, step } = req.body;

    if (!contractorId) {
      return next(new AppError('Contractor ID is required', 400));
    }

    // Verify contractor exists
    const contractorResult = await query(
      'SELECT id, CONCAT(first_name, \' \', last_name) as name, email, current_stage FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (contractorResult.rows.length === 0) {
      return next(new AppError('Contractor not found', 404));
    }

    const contractor = contractorResult.rows[0];

    // Generate session token
    const token = generateContractorToken(contractorId, step);

    // Update contractor's last active timestamp
    await query(
      'UPDATE contractors SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [contractorId]
    );

    res.status(200).json({
      success: true,
      token,
      contractor: {
        id: contractor.id,
        name: contractor.name,
        email: contractor.email,
        currentStage: contractor.current_stage
      },
      expiresIn: '7d'
    });

  } catch (error) {
    console.error('Error creating contractor session:', error);
    return next(new AppError('Failed to create session', 500));
  }
};

// Validate and restore contractor session
const restoreSession = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError('Session token is required', 400));
    }

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return next(new AppError('Session has expired', 401));
      }
      return next(new AppError('Invalid session token', 401));
    }

    // Check if it's a contractor session token
    if (decoded.type !== 'contractor_session') {
      return next(new AppError('Invalid session type', 401));
    }

    // Get contractor data
    const contractorResult = await query(
      'SELECT * FROM contractors WHERE id = $1',
      [decoded.contractorId]
    );

    if (contractorResult.rows.length === 0) {
      return next(new AppError('Contractor not found', 404));
    }

    const contractor = contractorResult.rows[0];

    // Parse JSON fields
    const parsedContractor = {
      ...contractor,
      focus_areas: typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]'
        ? safeJsonParse(contractor.focus_areas || '[]')
        : Array.isArray(contractor.focus_areas) ? contractor.focus_areas : [],
      services_offered: typeof contractor.services_offered === 'string' && contractor.services_offered !== '[object Object]'
        ? safeJsonParse(contractor.services_offered || '[]')
        : Array.isArray(contractor.services_offered) ? contractor.services_offered : [],
      readiness_indicators: {
        increased_tools: contractor.increased_tools,
        increased_people: contractor.increased_people,
        increased_activity: contractor.increased_activity
      },
      // Parse tech stack fields
      tech_stack_sales: typeof contractor.tech_stack_sales === 'string' 
        ? safeJsonParse(contractor.tech_stack_sales || '[]') 
        : contractor.tech_stack_sales || [],
      tech_stack_operations: typeof contractor.tech_stack_operations === 'string' 
        ? safeJsonParse(contractor.tech_stack_operations || '[]') 
        : contractor.tech_stack_operations || [],
      tech_stack_marketing: typeof contractor.tech_stack_marketing === 'string' 
        ? safeJsonParse(contractor.tech_stack_marketing || '[]') 
        : contractor.tech_stack_marketing || [],
      tech_stack_customer_experience: typeof contractor.tech_stack_customer_experience === 'string' 
        ? safeJsonParse(contractor.tech_stack_customer_experience || '[]') 
        : contractor.tech_stack_customer_experience || [],
      tech_stack_project_management: typeof contractor.tech_stack_project_management === 'string' 
        ? safeJsonParse(contractor.tech_stack_project_management || '[]') 
        : contractor.tech_stack_project_management || [],
      tech_stack_accounting_finance: typeof contractor.tech_stack_accounting_finance === 'string' 
        ? safeJsonParse(contractor.tech_stack_accounting_finance || '[]') 
        : contractor.tech_stack_accounting_finance || []
    };

    // Determine current step based on contractor's stage
    const stepMapping = {
      'verification': 1,
      'focus_selection': 2,
      'profiling': 3,
      'tech_stack': 4,
      'matching': 5,
      'demo_booked': 6,
      'completed': 6
    };

    const currentStep = stepMapping[contractor.current_stage] || decoded.step || 1;

    // Update contractor's last active timestamp
    await query(
      'UPDATE contractors SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [decoded.contractorId]
    );

    res.status(200).json({
      success: true,
      contractor: parsedContractor,
      currentStep,
      sessionValid: true
    });

  } catch (error) {
    console.error('Error restoring contractor session:', error);
    return next(new AppError('Failed to restore session', 500));
  }
};

// Refresh contractor session token
const refreshSession = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new AppError('Session token is required', 400));
    }

    // Verify current token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      return next(new AppError('Invalid or expired session token', 401));
    }

    if (decoded.type !== 'contractor_session') {
      return next(new AppError('Invalid session type', 401));
    }

    // Verify contractor still exists
    const contractorResult = await query(
      'SELECT id, current_stage FROM contractors WHERE id = $1',
      [decoded.contractorId]
    );

    if (contractorResult.rows.length === 0) {
      return next(new AppError('Contractor not found', 404));
    }

    const contractor = contractorResult.rows[0];

    // Determine current step
    const stepMapping = {
      'verification': 1,
      'focus_selection': 2,
      'profiling': 3,
      'tech_stack': 4,
      'matching': 5,
      'demo_booked': 6,
      'completed': 6
    };

    const currentStep = stepMapping[contractor.current_stage] || decoded.step || 1;

    // Generate new token
    const newToken = generateContractorToken(decoded.contractorId, currentStep);

    res.status(200).json({
      success: true,
      token: newToken,
      expiresIn: '7d'
    });

  } catch (error) {
    console.error('Error refreshing contractor session:', error);
    return next(new AppError('Failed to refresh session', 500));
  }
};

// Clear contractor session
const clearSession = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Session cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing contractor session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear session'
    });
  }
};

module.exports = {
  createSession,
  restoreSession,
  refreshSession,
  clearSession,
  generateContractorToken
};