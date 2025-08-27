const { query, transaction } = require('../config/database.sqlite');
const { AppError } = require('../middleware/errorHandler');

// Bulk operations for contractors
const bulkUpdateContractors = async (req, res, next) => {
  const { contractor_ids, updates } = req.body;

  if (!contractor_ids || !Array.isArray(contractor_ids) || contractor_ids.length === 0) {
    return res.status(400).json({ error: 'contractor_ids array is required' });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'updates object is required' });
  }

  console.log(`🔄 Bulk updating ${contractor_ids.length} contractors with:`, updates);

  try {
    await transaction(async (client) => {
      const results = [];
      
      // Build dynamic update query
      const allowedFields = [
        'current_stage', 'verification_status', 'annual_revenue', 'team_size',
        'increased_tools', 'increased_people', 'increased_activity'
      ];

      const setClause = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Update each contractor
      for (const contractorId of contractor_ids) {
        const updateValues = [...values, contractorId];
        
        const result = await client.query(
          `UPDATE contractors 
           SET ${setClause.join(', ')}, updated_at = datetime('now') 
           WHERE id = ?`,
          updateValues
        );

        if (result.rowCount > 0) {
          results.push({ id: contractorId, status: 'updated' });
        } else {
          results.push({ id: contractorId, status: 'not_found' });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk update completed for ${contractor_ids.length} contractors`,
        results,
        updated_count: results.filter(r => r.status === 'updated').length
      });
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return next(error);
  }
};

// Bulk delete contractors
const bulkDeleteContractors = async (req, res, next) => {
  const { contractor_ids } = req.body;

  if (!contractor_ids || !Array.isArray(contractor_ids) || contractor_ids.length === 0) {
    return res.status(400).json({ error: 'contractor_ids array is required' });
  }

  console.log(`🗑️ Bulk deleting ${contractor_ids.length} contractors`);

  try {
    await transaction(async (client) => {
      const results = [];
      
      // Delete related records first to maintain referential integrity
      for (const contractorId of contractor_ids) {
        // Delete matches
        await client.query('DELETE FROM contractor_partner_matches WHERE contractor_id = ?', [contractorId]);
        
        // Delete bookings
        await client.query('DELETE FROM demo_bookings WHERE contractor_id = ?', [contractorId]);
        
        // Delete contractor
        const result = await client.query('DELETE FROM contractors WHERE id = ?', [contractorId]);
        
        if (result.rowCount > 0) {
          results.push({ id: contractorId, status: 'deleted' });
        } else {
          results.push({ id: contractorId, status: 'not_found' });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk delete completed for ${contractor_ids.length} contractors`,
        results,
        deleted_count: results.filter(r => r.status === 'deleted').length
      });
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return next(error);
  }
};

// Bulk operations for partners
const bulkUpdatePartners = async (req, res, next) => {
  const { partner_ids, updates } = req.body;

  if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
    return res.status(400).json({ error: 'partner_ids array is required' });
  }

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'updates object is required' });
  }

  console.log(`🔄 Bulk updating ${partner_ids.length} partners with:`, updates);

  try {
    await transaction(async (client) => {
      const results = [];
      
      // Build dynamic update query
      const allowedFields = [
        'is_active', 'power_confidence_score', 'pricing_model', 
        'description', 'contact_email', 'contact_phone'
      ];

      const setClause = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });

      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Update each partner
      for (const partnerId of partner_ids) {
        const updateValues = [...values, partnerId];
        
        const result = await client.query(
          `UPDATE partners 
           SET ${setClause.join(', ')}, updated_at = datetime('now') 
           WHERE id = ?`,
          updateValues
        );

        if (result.rowCount > 0) {
          results.push({ id: partnerId, status: 'updated' });
        } else {
          results.push({ id: partnerId, status: 'not_found' });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk update completed for ${partner_ids.length} partners`,
        results,
        updated_count: results.filter(r => r.status === 'updated').length
      });
    });
  } catch (error) {
    console.error('Bulk update error:', error);
    return next(error);
  }
};

// Bulk toggle partner status
const bulkTogglePartnerStatus = async (req, res, next) => {
  const { partner_ids } = req.body;

  if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
    return res.status(400).json({ error: 'partner_ids array is required' });
  }

  console.log(`🔄 Bulk toggling status for ${partner_ids.length} partners`);

  try {
    await transaction(async (client) => {
      const results = [];
      
      for (const partnerId of partner_ids) {
        const result = await client.query(
          `UPDATE partners 
           SET is_active = NOT is_active, updated_at = datetime('now')
           WHERE id = ?`,
          [partnerId]
        );

        if (result.rowCount > 0) {
          // Get the updated status
          const updated = await client.query('SELECT is_active FROM partners WHERE id = ?', [partnerId]);
          results.push({ 
            id: partnerId, 
            status: 'updated',
            new_status: updated.rows[0]?.is_active ? 'active' : 'inactive'
          });
        } else {
          results.push({ id: partnerId, status: 'not_found' });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk status toggle completed for ${partner_ids.length} partners`,
        results,
        updated_count: results.filter(r => r.status === 'updated').length
      });
    });
  } catch (error) {
    console.error('Bulk toggle error:', error);
    return next(error);
  }
};

// Enhanced export functionality
const exportContractors = async (req, res, next) => {
  const {
    contractor_ids = null,
    format = 'csv',
    fields = null,
    search_filters = null
  } = req.body;

  console.log(`📄 Exporting contractors: format=${format}, count=${contractor_ids?.length || 'all'}`);

  try {
    let queryText = 'SELECT * FROM contractors';
    let values = [];

    // Export specific contractors if IDs provided
    if (contractor_ids && contractor_ids.length > 0) {
      const placeholders = contractor_ids.map(() => '?').join(',');
      queryText += ` WHERE id IN (${placeholders})`;
      values = contractor_ids;
    }
    // Apply search filters if provided
    else if (search_filters) {
      // Reuse search logic from contractorController
      const conditions = [];
      
      if (search_filters.stage) {
        conditions.push('current_stage = ?');
        values.push(search_filters.stage);
      }
      
      if (search_filters.verification_status) {
        conditions.push('verification_status = ?');
        values.push(search_filters.verification_status);
      }

      if (conditions.length > 0) {
        queryText += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, values);
    
    // Parse JSON fields for export
    const contractors = result.rows.map(contractor => ({
      ...contractor,
      focus_areas: typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]'
        ? JSON.parse(contractor.focus_areas || '[]')
        : Array.isArray(contractor.focus_areas) ? contractor.focus_areas : [],
      services_offered: typeof contractor.services_offered === 'string' && contractor.services_offered !== '[object Object]'
        ? JSON.parse(contractor.services_offered || '[]')
        : Array.isArray(contractor.services_offered) ? contractor.services_offered : []
    }));

    if (format === 'json') {
      res.status(200).json({
        success: true,
        data: contractors,
        count: contractors.length,
        exported_at: new Date().toISOString()
      });
    } else {
      // CSV format
      const selectedFields = fields || [
        'id', 'name', 'email', 'company_name', 'phone', 'service_area',
        'annual_revenue', 'team_size', 'current_stage', 'verification_status',
        'focus_areas', 'created_at'
      ];

      const csvHeaders = selectedFields.map(field => 
        field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      );

      const csvRows = contractors.map(contractor => 
        selectedFields.map(field => {
          let value = contractor[field];
          
          // Handle array fields
          if (Array.isArray(value)) {
            value = value.join('; ');
          }
          
          // Handle dates
          if (field.includes('_at') && value) {
            value = new Date(value).toISOString().split('T')[0];
          }
          
          // Escape CSV values
          return `"${(value || '').toString().replace(/"/g, '""')}"`;
        }).join(',')
      );

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="contractors_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    }
  } catch (error) {
    console.error('Export error:', error);
    return next(error);
  }
};

// Export partners
const exportPartners = async (req, res, next) => {
  const {
    partner_ids = null,
    format = 'csv',
    fields = null,
    search_filters = null
  } = req.body;

  console.log(`📄 Exporting partners: format=${format}, count=${partner_ids?.length || 'all'}`);

  try {
    let queryText = 'SELECT * FROM partners';
    let values = [];

    // Export specific partners if IDs provided
    if (partner_ids && partner_ids.length > 0) {
      const placeholders = partner_ids.map(() => '?').join(',');
      queryText += ` WHERE id IN (${placeholders})`;
      values = partner_ids;
    }
    // Apply search filters if provided
    else if (search_filters) {
      const conditions = [];
      
      if (search_filters.is_active !== undefined) {
        conditions.push('is_active = ?');
        values.push(search_filters.is_active ? 1 : 0);
      }

      if (conditions.length > 0) {
        queryText += ` WHERE ${conditions.join(' AND ')}`;
      }
    }

    queryText += ' ORDER BY power_confidence_score DESC';

    const result = await query(queryText, values);
    
    // Parse JSON fields for export
    const partners = result.rows.map(partner => ({
      ...partner,
      focus_areas_served: typeof partner.focus_areas_served === 'string' && partner.focus_areas_served !== '[object Object]'
        ? JSON.parse(partner.focus_areas_served || '[]')
        : Array.isArray(partner.focus_areas_served) ? partner.focus_areas_served : [],
      target_revenue_range: typeof partner.target_revenue_range === 'string' && partner.target_revenue_range !== '[object Object]'
        ? JSON.parse(partner.target_revenue_range || '[]')
        : Array.isArray(partner.target_revenue_range) ? partner.target_revenue_range : []
    }));

    if (format === 'json') {
      res.status(200).json({
        success: true,
        data: partners,
        count: partners.length,
        exported_at: new Date().toISOString()
      });
    } else {
      // CSV format
      const selectedFields = fields || [
        'id', 'company_name', 'description', 'contact_email', 'website',
        'power_confidence_score', 'is_active', 'focus_areas_served',
        'target_revenue_range', 'pricing_model', 'created_at'
      ];

      const csvHeaders = selectedFields.map(field => 
        field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      );

      const csvRows = partners.map(partner => 
        selectedFields.map(field => {
          let value = partner[field];
          
          // Handle array fields
          if (Array.isArray(value)) {
            value = value.join('; ');
          }
          
          // Handle boolean fields
          if (field === 'is_active') {
            value = value ? 'Active' : 'Inactive';
          }
          
          // Handle dates
          if (field.includes('_at') && value) {
            value = new Date(value).toISOString().split('T')[0];
          }
          
          // Escape CSV values
          return `"${(value || '').toString().replace(/"/g, '""')}"`;
        }).join(',')
      );

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="partners_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvContent);
    }
  } catch (error) {
    console.error('Export error:', error);
    return next(error);
  }
};

module.exports = {
  bulkUpdateContractors,
  bulkDeleteContractors,
  bulkUpdatePartners,
  bulkTogglePartnerStatus,
  exportContractors,
  exportPartners
};