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
    mappedData.status = 'pending_review'; // Mark as pending
    
    // Map strategic_partners to best_working_partnerships
    if (mappedData.strategic_partners) {
      mappedData.best_working_partnerships = JSON.stringify(mappedData.strategic_partners);
      delete mappedData.strategic_partners;
    }
    
    // Convert arrays/objects to JSON strings for storage
    const jsonFields = [
      'target_revenue_audience', 'service_areas', 'focus_areas_12_months',
      'tech_stack_sales', 'tech_stack_operations', 'tech_stack_marketing',
      'tech_stack_customer_experience', 'tech_stack_installation_pm', 
      'tech_stack_accounting_finance', 'sponsored_events', 'podcast_appearances',
      'client_demos', 'client_references', 'client_testimonials', 'focus_areas_served',
      'target_revenue_range', 'geographic_regions', 'key_differentiators', 'best_working_partnerships'
    ];
    
    jsonFields.forEach(field => {
      if (mappedData[field] && typeof mappedData[field] === 'object') {
        mappedData[field] = JSON.stringify(mappedData[field]);
      }
    });
    
    // Get actual columns from the database that we collected earlier
    const validColumns = [
      'company_name', 'description', 'website', 'logo_url', 'primary_email', 'contact_email', 'contact_phone',
      'focus_areas_served', 'target_revenue_range', 'geographic_regions', 'powerconfidence_score',
      'is_active', 'status', 'established_year', 'employee_count', 'ownership_type',
      'ceo_contact_name', 'ceo_contact_email', 'ceo_contact_phone', 
      'cx_contact_name', 'cx_contact_email', 'cx_contact_phone',
      'sales_contact_name', 'sales_contact_email', 'sales_contact_phone', 
      'onboarding_contact_name', 'onboarding_contact_email', 'onboarding_contact_phone',
      'marketing_contact_name', 'marketing_contact_email', 'marketing_contact_phone',
      'target_revenue_audience', 'service_areas', 'sponsored_events', 'podcast_appearances',
      'value_proposition', 'why_clients_choose_you', 'focus_areas_12_months',
      'tech_stack_marketing', 'tech_stack_crm', 'tech_stack_analytics', 'tech_stack_communication',
      'tech_stack_financial', 'tech_stack_project_management',
      'client_demos', 'client_references', 'landing_page_videos',
      'primary_contact', 'secondary_contact', 'company_description', 'best_working_partnerships'
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
