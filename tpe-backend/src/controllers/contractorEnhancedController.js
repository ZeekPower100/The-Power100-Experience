// Enhanced Contractor Controller for Advanced Search and Management
// Using the same working pattern as Enhanced Partners
const { query } = require('../config/database.sqlite');

// Get enhanced contractor list for admin dashboard
const getEnhancedContractorList = async (req, res) => {
  try {
    console.log('📋 Fetching enhanced contractor list for admin management');
    
    // Use the exact same simple approach that works for partners and the existing contractor endpoint
    const queryText = 'SELECT * FROM contractors ORDER BY created_at DESC';
    const result = await query(queryText);
    
    console.log('Enhanced contractor query result - Has rows:', !!result.rows, 'Rows count:', result.rows ? result.rows.length : 0);
    
    // Make sure we have the rows
    if (!result.rows) {
      console.error('No rows property in result:', result);
      return res.json({
        success: true,
        contractors: [],
        summary: {
          total_contractors: 0,
          active_contractors: 0,
          completed_flow: 0,
          in_progress: 0
        }
      });
    }
    
    const contractors = result.rows;
    
    // Parse JSON fields safely for each contractor
    const enhancedContractors = contractors.map((contractor) => {
      // Safe JSON parsing function
      const safeJsonParse = (jsonString, fallback = []) => {
        if (!jsonString) return fallback;
        if (jsonString === '[object Object]') return fallback;
        try {
          return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
        } catch (error) {
          console.warn('JSON parse error for contractor', contractor.id, ':', error.message);
          return fallback;
        }
      };

      return {
        ...contractor,
        // Parse JSON fields safely
        focus_areas: safeJsonParse(contractor.focus_areas, []),
        services_offered: safeJsonParse(contractor.services_offered, []),
        tags: safeJsonParse(contractor.tags, []),
        tech_stack_sales: safeJsonParse(contractor.tech_stack_sales, []),
        tech_stack_operations: safeJsonParse(contractor.tech_stack_operations, []),
        tech_stack_marketing: safeJsonParse(contractor.tech_stack_marketing, []),
        tech_stack_customer_experience: safeJsonParse(contractor.tech_stack_customer_experience, []),
        tech_stack_project_management: safeJsonParse(contractor.tech_stack_project_management, []),
        tech_stack_accounting_finance: safeJsonParse(contractor.tech_stack_accounting_finance, []),
        
        // Add computed fields for enhanced display
        progress_percentage: contractor.current_stage === 'completed' ? 100 :
                           contractor.current_stage === 'matching' ? 80 :
                           contractor.current_stage === 'profiling' ? 60 :
                           contractor.current_stage === 'focus_selection' ? 40 :
                           contractor.current_stage === 'verification' ? 20 : 0,
        
        stage_display: contractor.current_stage === 'completed' ? 'Completed' :
                      contractor.current_stage === 'matching' ? 'Partner Matching' :
                      contractor.current_stage === 'profiling' ? 'Business Profiling' :
                      contractor.current_stage === 'focus_selection' ? 'Focus Selection' :
                      contractor.current_stage === 'verification' ? 'Phone Verification' : 'Unknown',
        
        // Add display helpers
        focus_areas_display: safeJsonParse(contractor.focus_areas, []).slice(0, 2).join(', ') + 
                           (safeJsonParse(contractor.focus_areas, []).length > 2 ? '...' : ''),
        
        tags_display: safeJsonParse(contractor.tags, []).slice(0, 3).join(', ') + 
                     (safeJsonParse(contractor.tags, []).length > 3 ? '...' : ''),
        
        is_verified: contractor.verification_status === 'verified',
        is_active: contractor.current_stage !== 'completed' && contractor.verification_status === 'verified'
      };
    });

    console.log(`✅ Retrieved ${enhancedContractors.length} contractors with enhanced data`);

    // Calculate summary statistics
    const summary = {
      total_contractors: enhancedContractors.length,
      active_contractors: enhancedContractors.filter(c => c.is_active).length,
      completed_flow: enhancedContractors.filter(c => c.current_stage === 'completed').length,
      in_progress: enhancedContractors.filter(c => c.current_stage !== 'completed' && c.verification_status === 'verified').length,
      pending_verification: enhancedContractors.filter(c => c.verification_status === 'pending').length,
      verified_contractors: enhancedContractors.filter(c => c.verification_status === 'verified').length
    };

    res.json({
      success: true,
      contractors: enhancedContractors,
      summary: summary
    });

  } catch (error) {
    console.error('❌ Error fetching enhanced contractor list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch enhanced contractor list',
      details: error.message
    });
  }
};

// Get detailed contractor view for admin
const getContractorDetailedView = async (req, res) => {
  try {
    const { contractorId } = req.params;
    console.log(`🔍 Fetching detailed view for contractor ID: ${contractorId}`);

    // Use simple query that works (same pattern as enhanced list)
    const contractorQuery = 'SELECT * FROM contractors WHERE id = ?';
    const contractorResult = await query(contractorQuery, [contractorId]);
    
    console.log('Contractor query result:', {
      rowCount: contractorResult.rows?.length || 0,
      hasRows: !!contractorResult.rows,
      contractorId: contractorId
    });
    
    if (!contractorResult.rows || contractorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const contractor = contractorResult.rows[0];

    // Get matches separately - fix column names
    const matchesQuery = `
      SELECT 
        m.*, 
        sp.company_name as partner_name,
        sp.focus_areas_served as service_categories,
        sp.target_revenue_range
      FROM contractor_partner_matches m
      LEFT JOIN strategic_partners sp ON m.partner_id = sp.id
      WHERE m.contractor_id = ?
      ORDER BY m.match_score DESC
    `;
    const matchesResult = await query(matchesQuery, [contractorId]);

    // Get bookings separately  
    const bookingsQuery = `
      SELECT 
        b.*,
        sp.company_name as partner_name,
        sp.contact_email as partner_contact
      FROM demo_bookings b
      LEFT JOIN strategic_partners sp ON b.partner_id = sp.id
      WHERE b.contractor_id = ?
      ORDER BY b.scheduled_date DESC
    `;
    const bookingsResult = await query(bookingsQuery, [contractorId]);

    // Safe JSON parsing function
    const safeJsonParse = (jsonString, fallback = []) => {
      if (!jsonString) return fallback;
      if (jsonString === '[object Object]') return fallback;
      try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      } catch (error) {
        console.warn('JSON parse error for contractor', contractorId, ':', error.message);
        return fallback;
      }
    };

    // Parse JSON fields safely
    const enhancedContractor = {
      ...contractor,
      focus_areas: safeJsonParse(contractor.focus_areas, []),
      services_offered: safeJsonParse(contractor.services_offered, []),
      tags: safeJsonParse(contractor.tags, []),
      tech_stack_sales: safeJsonParse(contractor.tech_stack_sales, []),
      tech_stack_operations: safeJsonParse(contractor.tech_stack_operations, []),
      tech_stack_marketing: safeJsonParse(contractor.tech_stack_marketing, []),
      tech_stack_customer_experience: safeJsonParse(contractor.tech_stack_customer_experience, []),
      tech_stack_project_management: safeJsonParse(contractor.tech_stack_project_management, []),
      tech_stack_accounting_finance: safeJsonParse(contractor.tech_stack_accounting_finance, []),
      
      // Add computed fields
      progress_percentage: contractor.current_stage === 'completed' ? 100 :
                         contractor.current_stage === 'matching' ? 80 :
                         contractor.current_stage === 'profiling' ? 60 :
                         contractor.current_stage === 'focus_selection' ? 40 :
                         contractor.current_stage === 'verification' ? 20 : 0,
      
      stage_display: contractor.current_stage === 'completed' ? 'Completed' :
                    contractor.current_stage === 'matching' ? 'Partner Matching' :
                    contractor.current_stage === 'profiling' ? 'Business Profiling' :
                    contractor.current_stage === 'focus_selection' ? 'Focus Selection' :
                    contractor.current_stage === 'verification' ? 'Phone Verification' : 'Unknown',
      
      is_verified: contractor.verification_status === 'verified',
      is_active: contractor.current_stage !== 'completed' && contractor.verification_status === 'verified',
      
      // Add relationships
      matches: matchesResult.rows || [],
      bookings: bookingsResult.rows || []
    };

    console.log(`✅ Retrieved detailed view for ${enhancedContractor.name || enhancedContractor.email}`);

    res.json({
      success: true,
      contractor: enhancedContractor
    });

  } catch (error) {
    console.error('❌ Error fetching contractor detailed view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contractor detailed view',
      details: error.message
    });
  }
};

module.exports = {
  getEnhancedContractorList,
  getContractorDetailedView
};