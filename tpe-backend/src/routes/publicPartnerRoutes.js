const express = require('express');
const router = express.Router();
const { query } = require('../config/database.postgresql');

// Public partner application submission (no auth required)
router.post('/apply', async (req, res) => {
  try {
    const partnerData = req.body;
    
    // Set default values for public submissions
    partnerData.is_active = false; // Inactive until approved
    partnerData.power_confidence_score = 0; // No score until reviewed
    partnerData.status = 'pending_review'; // Mark as pending
    
    // Convert arrays/objects to JSON strings for storage
    const jsonFields = [
      'target_revenue_audience', 'service_areas', 'focus_areas_12_months',
      'tech_stack_sales', 'tech_stack_operations', 'tech_stack_marketing',
      'tech_stack_customer_experience', 'tech_stack_installation_pm', 
      'tech_stack_accounting_finance', 'sponsored_events', 'podcast_appearances',
      'client_demos', 'client_references', 'client_testimonials'
    ];
    
    jsonFields.forEach(field => {
      if (partnerData[field] && typeof partnerData[field] === 'object') {
        partnerData[field] = JSON.stringify(partnerData[field]);
      }
    });
    
    // Build insert query
    const columns = Object.keys(partnerData).filter(key => partnerData[key] !== undefined);
    const values = columns.map((_, index) => `$${index + 1}`);
    const params = columns.map(col => partnerData[col]);
    
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
