# Phase 1: Employee Management & Feedback Collection - Implementation Plan

**Document Version:** 1.0
**Date:** November 14, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** Verified against local database November 14, 2025

---

## 📋 Executive Summary

**Goal:** Build employee tracking system and PowerCard-based quarterly feedback collection for CEO culture ratings.

### What Phase 1 Delivers
- ✅ Employee management database tables
- ✅ Employee CRUD operations (Create, Read, Update, Delete)
- ✅ CSV bulk import for employees
- ✅ PowerCard campaign creation for employee surveys
- ✅ Anonymous survey token system
- ✅ Response aggregation service
- ✅ CEO PCR calculation engine (employee feedback only)
- ✅ Admin interface for employee management

---

## 🗄️ Database Schema Changes

### Prerequisites Verification ✅

**DATABASE-CHECKED: contractors table - November 14, 2025**
- Existing table: 72 columns verified
- No CEO PCR fields exist yet (new additions required)

**DATABASE-CHECKED: power_card_campaigns table - November 14, 2025**
- Existing table: 14 columns verified
- Will be reused for employee surveys

**DATABASE-CHECKED: power_card_responses table - November 14, 2025**
- Existing fields PERFECT for CEO PCR:
  - `leadership_score` INTEGER ✅
  - `culture_score` INTEGER ✅
  - `growth_opportunity_score` INTEGER ✅
  - `satisfaction_score` INTEGER ✅
  - `recommendation_score` INTEGER (NPS) ✅

---

### Migration 1: Create company_employees Table

**File:** `tpe-database/migrations/20251114_create_company_employees.sql`

**DATABASE-CHECKED: All field names follow TPE naming conventions**

```sql
-- ================================================================
-- Migration: Create Company Employees Table
-- Date: November 14, 2025
-- Purpose: Track contractor employees for CEO PCR feedback collection
-- ================================================================

CREATE TABLE company_employees (
  id SERIAL PRIMARY KEY,

  -- Contractor Linkage (DATABASE-CHECKED: contractors.id exists)
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Employee Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),

  -- Job Details
  department VARCHAR(100),
  role_title VARCHAR(100),
  hire_date DATE,
  termination_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Communication Preferences
  sms_opt_in BOOLEAN DEFAULT true,
  email_opt_in BOOLEAN DEFAULT true,

  -- Survey Tracking
  last_survey_sent DATE,
  last_survey_completed DATE,
  total_surveys_completed INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_employee_email UNIQUE(contractor_id, email)
);

-- ================================================================
-- Indexes for Performance
-- ================================================================

CREATE INDEX idx_employees_contractor ON company_employees(contractor_id);
CREATE INDEX idx_employees_active ON company_employees(is_active);
CREATE INDEX idx_employees_email ON company_employees(email);
CREATE INDEX idx_employees_contractor_active ON company_employees(contractor_id, is_active);

-- ================================================================
-- Comments
-- ================================================================

COMMENT ON TABLE company_employees IS 'Stores contractor employees for CEO PCR feedback surveys';
COMMENT ON COLUMN company_employees.contractor_id IS 'Links to contractors.id';
COMMENT ON COLUMN company_employees.is_active IS 'False when employee is terminated';
COMMENT ON COLUMN company_employees.sms_opt_in IS 'SMS survey reminders enabled';
COMMENT ON COLUMN company_employees.email_opt_in IS 'Email survey invitations enabled';
```

---

### Migration 2: Create ceo_pcr_scores Table

**File:** `tpe-database/migrations/20251114_create_ceo_pcr_scores.sql`

**DATABASE-CHECKED: All field names follow TPE naming conventions**

```sql
-- ================================================================
-- Migration: Create CEO PCR Scores Table
-- Date: November 14, 2025
-- Purpose: Store quarterly CEO PCR calculations and history
-- ================================================================

CREATE TABLE ceo_pcr_scores (
  id SERIAL PRIMARY KEY,

  -- Contractor Linkage (DATABASE-CHECKED: contractors.id exists)
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Quarter Identification
  quarter VARCHAR(10) NOT NULL,  -- 'Q1', 'Q2', 'Q3', 'Q4'
  year INTEGER NOT NULL,

  -- Survey Metrics
  total_employees INTEGER DEFAULT 0,
  total_responses INTEGER DEFAULT 0,
  response_rate NUMERIC(5,2),

  -- Category Scores (DATABASE-CHECKED: matches power_card_responses fields)
  leadership_score NUMERIC(5,2),           -- Avg of leadership_score from responses
  culture_score NUMERIC(5,2),              -- Avg of culture_score from responses
  growth_score NUMERIC(5,2),               -- Avg of growth_opportunity_score from responses
  satisfaction_score NUMERIC(5,2),         -- Avg of satisfaction_score from responses
  nps_score NUMERIC(5,2),                  -- Avg of recommendation_score from responses

  -- Overall Scores
  base_score NUMERIC(5,2),                 -- Average of all category scores
  trend_modifier INTEGER DEFAULT 0,        -- -5, 0, or +5
  final_ceo_pcr NUMERIC(5,2),              -- base_score + trend_modifier

  -- Metadata (DATABASE-CHECKED: power_card_campaigns.id exists)
  campaign_id INTEGER REFERENCES power_card_campaigns(id) ON DELETE SET NULL,
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_contractor_quarter UNIQUE(contractor_id, quarter, year),
  CONSTRAINT valid_trend_modifier CHECK (trend_modifier IN (-5, 0, 5)),
  CONSTRAINT valid_base_score CHECK (base_score >= 0 AND base_score <= 100),
  CONSTRAINT valid_final_pcr CHECK (final_ceo_pcr >= 0 AND final_ceo_pcr <= 105)
);

-- ================================================================
-- Indexes for Performance
-- ================================================================

CREATE INDEX idx_ceo_pcr_contractor ON ceo_pcr_scores(contractor_id);
CREATE INDEX idx_ceo_pcr_quarter ON ceo_pcr_scores(quarter, year);
CREATE INDEX idx_ceo_pcr_contractor_quarter ON ceo_pcr_scores(contractor_id, quarter, year);

-- ================================================================
-- Comments
-- ================================================================

COMMENT ON TABLE ceo_pcr_scores IS 'Stores quarterly CEO PowerConfidence Rating scores based on employee feedback';
COMMENT ON COLUMN ceo_pcr_scores.campaign_id IS 'Links to power_card_campaigns.id for the employee survey';
COMMENT ON COLUMN ceo_pcr_scores.trend_modifier IS 'Performance trend bonus: +5 (improving), 0 (stable), -5 (declining)';
```

---

### Migration 3: Add CEO PCR Fields to contractors Table

**File:** `tpe-database/migrations/20251114_add_ceo_pcr_to_contractors.sql`

**DATABASE-CHECKED: contractors table verified with 72 existing columns**

```sql
-- ================================================================
-- Migration: Add CEO PCR Fields to Contractors Table
-- Date: November 14, 2025
-- Purpose: Track current CEO PCR scores and employee counts
-- ================================================================

ALTER TABLE contractors
ADD COLUMN IF NOT EXISTS current_ceo_pcr NUMERIC(5,2)
  CHECK (current_ceo_pcr IS NULL OR (current_ceo_pcr >= 0 AND current_ceo_pcr <= 105)),
ADD COLUMN IF NOT EXISTS previous_ceo_pcr NUMERIC(5,2)
  CHECK (previous_ceo_pcr IS NULL OR (previous_ceo_pcr >= 0 AND previous_ceo_pcr <= 105)),
ADD COLUMN IF NOT EXISTS ceo_pcr_trend VARCHAR(20)
  CHECK (ceo_pcr_trend IS NULL OR ceo_pcr_trend IN ('improving', 'stable', 'declining', 'new')),
ADD COLUMN IF NOT EXISTS total_employees INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_employee_survey DATE,
ADD COLUMN IF NOT EXISTS ceo_pcr_last_calculated TIMESTAMP;

-- ================================================================
-- Comments
-- ================================================================

COMMENT ON COLUMN contractors.current_ceo_pcr IS 'Most recent CEO PowerConfidence Rating (0-105)';
COMMENT ON COLUMN contractors.previous_ceo_pcr IS 'Previous quarter CEO PCR for trend calculation';
COMMENT ON COLUMN contractors.ceo_pcr_trend IS 'Performance trend: improving, stable, declining, new';
COMMENT ON COLUMN contractors.total_employees IS 'Count of active employees for this contractor';
COMMENT ON COLUMN contractors.last_employee_survey IS 'Date of most recent employee survey campaign';
COMMENT ON COLUMN contractors.ceo_pcr_last_calculated IS 'Timestamp of last CEO PCR calculation';
```

---

## 🏗️ Backend Implementation

### Service Layer: ceoPcrService.js

**File:** `tpe-backend/src/services/ceoPcrService.js`

**DATABASE-CHECKED: All queries reference verified field names**

```javascript
// DATABASE-CHECKED: company_employees, ceo_pcr_scores, power_card_responses columns verified November 14, 2025
// ================================================================
// CEO PCR Calculation Service
// ================================================================
// Purpose: Calculate CEO PowerConfidence Rating from employee feedback
// Formula: Final CEO PCR = Average(Employee Scores) ± Trend Modifier
// ================================================================

const { query } = require('../config/database');

/**
 * Calculate CEO PCR from employee PowerCard responses
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} campaignId - PowerCard campaign ID
 * @param {string} quarter - Quarter identifier (Q1, Q2, Q3, Q4)
 * @param {number} year - Year (2025, 2026, etc.)
 * @returns {Object} Calculated CEO PCR scores
 */
async function calculateCeoPCR(contractorId, campaignId, quarter, year) {
  console.log(`[CEO PCR] Calculating for contractor ${contractorId}, ${quarter}-${year}`);

  // Step 1: Get all employee responses for this campaign
  // DATABASE FIELDS: power_card_responses (leadership_score, culture_score, growth_opportunity_score, satisfaction_score, recommendation_score)
  const responsesResult = await query(`
    SELECT
      COUNT(*) as total_responses,
      AVG(leadership_score) as avg_leadership,
      AVG(culture_score) as avg_culture,
      AVG(growth_opportunity_score) as avg_growth,
      AVG(satisfaction_score) as avg_satisfaction,
      AVG(recommendation_score) as avg_nps
    FROM power_card_responses
    WHERE campaign_id = $1
      AND recipient_id IN (
        SELECT id FROM company_employees
        WHERE contractor_id = $2 AND is_active = true
      )
  `, [campaignId, contractorId]);

  const responses = responsesResult.rows[0];

  // Step 2: Get total active employees for response rate
  // DATABASE FIELDS: company_employees (contractor_id, is_active)
  const employeeCountResult = await query(`
    SELECT COUNT(*) as total_employees
    FROM company_employees
    WHERE contractor_id = $1 AND is_active = true
  `, [contractorId]);

  const totalEmployees = parseInt(employeeCountResult.rows[0].total_employees);
  const totalResponses = parseInt(responses.total_responses);
  const responseRate = totalEmployees > 0 ? (totalResponses / totalEmployees) * 100 : 0;

  // Step 3: Calculate category scores
  const leadershipScore = parseFloat(responses.avg_leadership) || 0;
  const cultureScore = parseFloat(responses.avg_culture) || 0;
  const growthScore = parseFloat(responses.avg_growth) || 0;
  const satisfactionScore = parseFloat(responses.avg_satisfaction) || 0;
  const npsScore = parseFloat(responses.avg_nps) || 0;

  // Step 4: Calculate base score (average of all categories)
  const baseScore = (leadershipScore + cultureScore + growthScore + satisfactionScore + npsScore) / 5;
  const roundedBaseScore = Math.round(baseScore * 100) / 100;

  // Step 5: Calculate trend modifier
  const trendModifier = await calculateTrendModifier(contractorId, quarter, year);

  // Step 6: Calculate final CEO PCR
  const finalCeoPcr = roundedBaseScore + trendModifier;

  console.log(`[CEO PCR] Base: ${roundedBaseScore}, Trend: ${trendModifier > 0 ? '+' : ''}${trendModifier}, Final: ${finalCeoPcr}`);

  // Step 7: Save to ceo_pcr_scores table
  // DATABASE FIELDS: ceo_pcr_scores (all columns verified)
  await query(`
    INSERT INTO ceo_pcr_scores (
      contractor_id, quarter, year, campaign_id,
      total_employees, total_responses, response_rate,
      leadership_score, culture_score, growth_score, satisfaction_score, nps_score,
      base_score, trend_modifier, final_ceo_pcr
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (contractor_id, quarter, year)
    DO UPDATE SET
      campaign_id = EXCLUDED.campaign_id,
      total_employees = EXCLUDED.total_employees,
      total_responses = EXCLUDED.total_responses,
      response_rate = EXCLUDED.response_rate,
      leadership_score = EXCLUDED.leadership_score,
      culture_score = EXCLUDED.culture_score,
      growth_score = EXCLUDED.growth_score,
      satisfaction_score = EXCLUDED.satisfaction_score,
      nps_score = EXCLUDED.nps_score,
      base_score = EXCLUDED.base_score,
      trend_modifier = EXCLUDED.trend_modifier,
      final_ceo_pcr = EXCLUDED.final_ceo_pcr,
      calculated_at = NOW()
  `, [
    contractorId, quarter, year, campaignId,
    totalEmployees, totalResponses, responseRate,
    leadershipScore, cultureScore, growthScore, satisfactionScore, npsScore,
    roundedBaseScore, trendModifier, finalCeoPcr
  ]);

  // Step 8: Update contractors table with current score
  // DATABASE FIELDS: contractors (current_ceo_pcr, previous_ceo_pcr, ceo_pcr_trend, ceo_pcr_last_calculated)
  const trend = determineTrend(trendModifier);
  await query(`
    UPDATE contractors
    SET
      previous_ceo_pcr = current_ceo_pcr,
      current_ceo_pcr = $1,
      ceo_pcr_trend = $2,
      ceo_pcr_last_calculated = NOW()
    WHERE id = $3
  `, [finalCeoPcr, trend, contractorId]);

  console.log(`[CEO PCR] ✅ CEO PCR calculated and saved for contractor ${contractorId}`);

  return {
    contractorId,
    quarter,
    year,
    totalEmployees,
    totalResponses,
    responseRate,
    categoryScores: {
      leadership: leadershipScore,
      culture: cultureScore,
      growth: growthScore,
      satisfaction: satisfactionScore,
      nps: npsScore
    },
    baseScore: roundedBaseScore,
    trendModifier,
    finalCeoPcr,
    trend
  };
}

/**
 * Calculate trend modifier based on quarterly history
 *
 * @param {number} contractorId - Contractor ID
 * @param {string} currentQuarter - Current quarter
 * @param {number} currentYear - Current year
 * @returns {number} Trend modifier (-5, 0, or +5)
 */
async function calculateTrendModifier(contractorId, currentQuarter, currentYear) {
  // Get last 3 quarters of scores
  // DATABASE FIELDS: ceo_pcr_scores (base_score, quarter, year)
  const historyResult = await query(`
    SELECT base_score, quarter, year
    FROM ceo_pcr_scores
    WHERE contractor_id = $1
    ORDER BY year DESC, quarter DESC
    LIMIT 3
  `, [contractorId]);

  const history = historyResult.rows;

  // Need at least 2 previous quarters for trend analysis
  if (history.length < 2) {
    return 0; // New contractor, no trend
  }

  // Check for improving trend (3+ consecutive quarters)
  if (history.length >= 3) {
    const isImproving = history[0].base_score > history[1].base_score &&
                       history[1].base_score > history[2].base_score;
    if (isImproving) {
      return 5; // Hot streak bonus
    }
  }

  // Check for declining trend (2+ consecutive quarters)
  if (history.length >= 2) {
    const isDeclining = history[0].base_score < history[1].base_score &&
                       history[1].base_score < history[2].base_score;
    if (isDeclining) {
      return -5; // Decline penalty
    }
  }

  return 0; // Stable
}

/**
 * Determine trend label from modifier
 */
function determineTrend(modifier) {
  if (modifier > 0) return 'improving';
  if (modifier < 0) return 'declining';
  return 'stable';
}

module.exports = {
  calculateCeoPCR,
  calculateTrendModifier
};
```

---

### Controller: employeeController.js

**File:** `tpe-backend/src/controllers/employeeController.js`

**DATABASE-CHECKED: company_employees table verified**

```javascript
// DATABASE-CHECKED: company_employees columns verified November 14, 2025
const { query } = require('../config/database');
const csv = require('csv-parser');
const fs = require('fs');
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
    console.error('Error fetching employees:', error);
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

    res.status(201).json({
      success: true,
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating employee:', error);
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
            phone: row.phone || row['Phone'],
            department: row.department || row['Department'],
            role_title: row.role_title || row['Role'] || row['Title'],
            hire_date: row.hire_date || row['Hire Date'] || null
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Insert employees
    let successCount = 0;
    for (const emp of employees) {
      try {
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

    res.json({
      success: true,
      imported: successCount,
      errors: errors.length,
      error_details: errors
    });
  } catch (error) {
    console.error('Error bulk importing employees:', error);
    next(error);
  }
};

module.exports = {
  getEmployeesByContractor,
  createEmployee,
  bulkImportEmployees
};
```

---

## 📊 Testing Checklist

### Database Verification
- [ ] Run all 3 migration files in sequence
- [ ] Verify `company_employees` table created with correct indexes
- [ ] Verify `ceo_pcr_scores` table created with correct constraints
- [ ] Verify contractors table has new CEO PCR columns
- [ ] Test foreign key constraints work correctly

### Service Layer Testing
- [ ] Create test contractor with employees
- [ ] Generate PowerCard campaign for employees
- [ ] Submit test responses with various scores
- [ ] Verify CEO PCR calculation matches expected formula
- [ ] Test trend modifier calculation with historical data

### API Endpoint Testing
- [ ] Test GET /api/employees/contractor/:id
- [ ] Test POST /api/employees (single create)
- [ ] Test POST /api/employees/bulk-import (CSV upload)
- [ ] Test employee count updates in contractors table

### Integration Testing
- [ ] End-to-end: Upload employees → Launch campaign → Collect responses → Calculate CEO PCR
- [ ] Verify PowerCard responses link correctly to employees
- [ ] Verify anonymity is maintained in results

---

## 🎯 Success Criteria

- ✅ Company employees can be uploaded and managed
- ✅ PowerCard campaigns can be created for employee surveys
- ✅ Employee responses are collected anonymously
- ✅ CEO PCR scores calculated correctly from employee feedback
- ✅ Quarterly history tracked in ceo_pcr_scores table
- ✅ Contractors table shows current CEO PCR score

---

**Next Step:** Complete [Phase 1 Pre-Flight Checklist](./PHASE-1-PRE-FLIGHT-CHECKLIST.md)
