const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const express = require('express');
const router = express.Router();
const { query } = require('../config/database.postgresql');

// Search partners for autocomplete (no auth required)
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.json([]);
    }
    
    const searchTerm = `%${q.trim().toLowerCase()}%`;
    
    // Search for active partners matching the query
    const result = await query(
      `SELECT 
        id, 
        company_name,
        description,
        logo_url,
        website
      FROM strategic_partners 
      WHERE is_active = true 
        AND LOWER(company_name) LIKE $1
      ORDER BY company_name
      LIMIT 10`,
      [searchTerm]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching partners:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to search partners' 
    });
  }
});

// Public partner application submission (no auth required)
router.post('/apply', async (req, res) => {
  try {
    const partnerData = req.body;
    
    // Map frontend field names to database column names
    const fieldMapping = {
      // Contact mappings
      'ceo_name': 'ceo_contact_name',
      'ceo_email': 'ceo_contact_email', 
      'ceo_phone': 'ceo_contact_phone',
      'ceo_primary_email': 'ceo_contact_email',
      'ceo_primary_phone': 'ceo_contact_phone',
      
      'cx_name': 'cx_contact_name',
      'cx_email': 'cx_contact_email',
      'cx_phone': 'cx_contact_phone',
      'cx_primary_email': 'cx_contact_email',
      'cx_primary_phone': 'cx_contact_phone',
      
      'sales_name': 'sales_contact_name',
      'sales_email': 'sales_contact_email',
      'sales_phone': 'sales_contact_phone',
      'sales_primary_email': 'sales_contact_email',
      'sales_primary_phone': 'sales_contact_phone',
      
      'onboarding_name': 'onboarding_contact_name',
      'onboarding_email': 'onboarding_contact_email',
      'onboarding_phone': 'onboarding_contact_phone',
      'onboarding_primary_email': 'onboarding_contact_email',
      'onboarding_primary_phone': 'onboarding_contact_phone',
      
      'marketing_name': 'marketing_contact_name',
      'marketing_email': 'marketing_contact_email',
      'marketing_phone': 'marketing_contact_phone',
      'marketing_primary_email': 'marketing_contact_email',
      'marketing_primary_phone': 'marketing_contact_phone',
      
      // Other field mappings
      'contact_person': 'primary_contact',
      'email': 'contact_email',
      'phone': 'contact_phone'
    };
    
    // Apply field mappings
    const mappedData = {};
    for (const [key, value] of Object.entries(partnerData)) {
      const mappedKey = fieldMapping[key] || key;
      mappedData[mappedKey] = value;
    }
    
    // Set default values for public submissions
    mappedData.is_active = false; // Inactive until approved
    mappedData.powerconfidence_score = 0; // No score until reviewed
    
    // Check if this is a partial submission (Step 7 only)
    if (partnerData.submission_type === 'partial') {
      mappedData.status = 'partial_submission'; // Mark as partial
      mappedData.completed_steps = partnerData.completed_steps || 7;
    } else {
      mappedData.status = 'pending_review'; // Mark as complete pending review
      mappedData.completed_steps = 8;
    }
    
    // Map partner_relationships to best_working_partnerships
    if (mappedData.partner_relationships) {
      mappedData.best_working_partnerships = safeJsonStringify(mappedData.partner_relationships);
      delete mappedData.partner_relationships;
    }
    
    // Convert arrays/objects to JSON strings for storage
    const jsonFields = [
      'target_revenue_audience', 'service_areas', 'focus_areas_12_months',
      'tech_stack_sales', 'tech_stack_operations', 'tech_stack_marketing',
      'tech_stack_customer_experience', 'tech_stack_installation_pm',
      'tech_stack_accounting_finance', 'sponsored_events', 'other_sponsored_events',
      'podcast_appearances', 'other_podcast_appearances',
      'client_demos', 'client_references', 'employee_references', 'client_testimonials', 'focus_areas_served',
      'target_revenue_range', 'geographic_regions', 'key_differentiators', 'best_working_partnerships',
      'books_read_recommended'
    ];
    
    jsonFields.forEach(field => {
      if (mappedData[field] && typeof mappedData[field] === 'object') {
        mappedData[field] = safeJsonStringify(mappedData[field]);
      }
    });
    
    // Get actual columns from the database that we collected earlier
    const validColumns = [
      'company_name', 'description', 'website', 'logo_url', 'primary_email', 'contact_email', 'contact_phone',
      'focus_areas_served', 'target_revenue_range', 'geographic_regions', 'powerconfidence_score',
      'is_active', 'status', 'established_year', 'employee_count', 'client_count', 'ownership_type',
      'ceo_contact_name', 'ceo_contact_email', 'ceo_contact_phone', 
      'cx_contact_name', 'cx_contact_email', 'cx_contact_phone',
      'sales_contact_name', 'sales_contact_email', 'sales_contact_phone', 
      'onboarding_contact_name', 'onboarding_contact_email', 'onboarding_contact_phone',
      'marketing_contact_name', 'marketing_contact_email', 'marketing_contact_phone',
      'target_revenue_audience', 'service_areas', 'sponsored_events', 'other_sponsored_events',
      'podcast_appearances', 'other_podcast_appearances',
      'value_proposition', 'why_clients_choose_you', 'why_clients_choose_competitors', 'focus_areas_12_months',
      'tech_stack_marketing', 'tech_stack_crm', 'tech_stack_analytics', 'tech_stack_communication',
      'tech_stack_financial', 'tech_stack_project_management',
      'client_demos', 'client_references', 'employee_references', 'landing_page_videos',
      'primary_contact', 'secondary_contact', 'company_description', 'best_working_partnerships',
      'books_read_recommended', 'completed_steps'
    ];
    
    // Filter to only include valid columns
    const columns = Object.keys(mappedData)
      .filter(key => mappedData[key] !== undefined && validColumns.includes(key));
    const values = columns.map((_, index) => `$${index + 1}`);
    const params = columns.map(col => mappedData[col]);
    
    if (columns.length === 0) {
      throw new Error('No valid columns to insert. Check field mappings.');
    }
    
    const insertQuery = `
      INSERT INTO strategic_partners (${columns.join(', ')})
      VALUES (${values.join(', ')})
      RETURNING id, company_name, status
    `;
    
    const result = await query(insertQuery, params);
    
    // Log the application for review
    console.log(`New partner application received: ${result.rows[0].company_name} (ID: ${result.rows[0].id})`);
    
    res.json({
      success: true,
      message: 'Partner application submitted successfully. Our team will review and contact you soon.',
      applicationId: result.rows[0].id
    });
    
  } catch (error) {
    console.error('Error submitting partner application:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application. Please try again.'
    });
  }
});

// Update pre-onboarding data for existing partner application
router.post('/update-portfolio/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const preOnboardingData = req.body;
    
    // Convert arrays/objects to JSON strings for storage
    const jsonFields = ['client_demos', 'client_references', 'employee_references'];
    const updateData = {};
    
    jsonFields.forEach(field => {
      if (preOnboardingData[field]) {
        updateData[field] = typeof preOnboardingData[field] === 'object' 
          ? safeJsonStringify(preOnboardingData[field]) 
          : preOnboardingData[field];
      }
    });
    
    // Add logo_url if provided
    if (preOnboardingData.logo_url) {
      updateData.logo_url = preOnboardingData.logo_url;
    }
    
    // Update status to complete if portfolio is being added
    updateData.status = 'pending_review';
    updateData.completed_steps = 8;
    
    // Build UPDATE query
    const updateColumns = Object.keys(updateData);
    const setClause = updateColumns.map((col, index) => `${col} = $${index + 2}`).join(', ');
    const values = [partnerId, ...updateColumns.map(col => updateData[col])];
    
    const updateQuery = `
      UPDATE strategic_partners 
      SET ${setClause}
      WHERE id = $1
      RETURNING id, company_name, status
    `;
    
    const result = await query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner application not found'
      });
    }
    
    console.log(`Pre-onboarding updated for partner: ${result.rows[0].company_name} (ID: ${result.rows[0].id})`);
    
    res.json({
      success: true,
      message: 'Pre-onboarding data updated successfully',
      partner: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error updating pre-onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update pre-onboarding data'
    });
  }
});

// Delegate pre-onboarding completion to team member
router.post('/delegate-portfolio', async (req, res) => {
  try {
    const { partnerId, delegateTo, companyName } = req.body;
    
    // In production, this would send an actual email
    // For now, we'll just log and return success
    console.log(`Delegating pre-onboarding for ${companyName} (ID: ${partnerId}) to ${delegateTo.name} (${delegateTo.email})`);
    
    // Generate a unique delegation token
    const delegationToken = Buffer.from(`${partnerId}:${Date.now()}`).toString('base64');
    
    // Store delegation info in database (optional)
    // You could create a delegations table to track these
    
    // Email would contain a link like:
    // https://tpx.power100.io/partner/onboarding/complete-portfolio?token=${delegationToken}
    
    res.json({
      success: true,
      message: `Pre-onboarding delegation sent to ${delegateTo.name}`,
      delegationToken: delegationToken
    });
    
  } catch (error) {
    console.error('Error delegating pre-onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delegate pre-onboarding'
    });
  }
});

// Public endpoint to check application status (optional)
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await query(
      'SELECT company_name, status, created_at FROM strategic_partners WHERE primary_email = $1 OR ceo_primary_email = $1',
      [email]
    );
    
    if (result.rows.length > 0) {
      res.json({
        success: true,
        application: {
          company: result.rows[0].company_name,
          status: result.rows[0].status || 'pending_review',
          submitted: result.rows[0].created_at
        }
      });
    } else {
      res.json({
        success: false,
        message: 'No application found with this email'
      });
    }
    
  } catch (error) {
    console.error('Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
});

module.exports = router;
