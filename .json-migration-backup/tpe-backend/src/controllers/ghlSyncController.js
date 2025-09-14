// GHL Sync Controller - Manages contact synchronization between TPE and GHL
const { query } = require('../config/database');

// Sync all contacts (contractors, partners, employees) to GHL
const syncAllContactsToGHL = async (req, res) => {
  try {
    console.log('🔄 Starting full contact sync to GHL...');
    
    // Get contractors
    const contractors = await getContractorsForSync();
    // Get partners (CEOs/Owners)
    const partners = await getPartnersForSync();
    // Get partner employees
    const employees = await getPartnerEmployeesForSync();
    
    const allContacts = [
      ...contractors,
      ...partners, 
      ...employees
    ];
    
    console.log(`📋 Total contacts to sync: ${allContacts.length}`);
    console.log(`  - Contractors: ${contractors.length}`);
    console.log(`  - Partners: ${partners.length}`);
    console.log(`  - Employees: ${employees.length}`);
    
    res.json({
      success: true,
      message: `${allContacts.length} contacts ready for GHL sync`,
      contacts: allContacts,
      breakdown: {
        contractors: contractors.length,
        partners: partners.length,
        employees: employees.length
      },
      syncUrl: `${req.protocol}://${req.get('host')}/api/ghl-sync/trigger-sync`
    });
    
  } catch (error) {
    console.error('❌ Error syncing contacts to GHL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync contacts to GHL',
      details: error.message
    });
  }
};

// Get contractors formatted for GHL
const getContractorsForSync = async () => {
  const sql = `SELECT id, name, email, phone, company_name, 
           annual_revenue, team_size, service_area,
           focus_areas, current_stage, created_at
    FROM contractors 
    WHERE email IS NOT NULL 
    ORDER BY created_at DESC`.trim();
    
  console.log('🔍 Running contractors query:', sql);
  const contractorsResult = await query(sql);
  
  console.log('🔍 Contractors query result:', contractorsResult);
  console.log('🔍 Rows length:', contractorsResult.rows?.length);
  
  if (!contractorsResult.rows) {
    console.log('⚠️ No rows property in contractors result');
    return [];
  }
  
  return contractorsResult.rows.map(contractor => {
    // Parse focus areas
    let focusAreas = [];
    try {
      if (contractor.focus_areas) {
        focusAreas = JSON.parse(contractor.focus_areas);
      }
    } catch (e) {
      focusAreas = contractor.focus_areas ? [contractor.focus_areas] : [];
    }
    
    // Generate contractor tags
    const tags = [
      'tpe-contractor',
      'customer',
      `stage-${contractor.current_stage || 'unknown'}`,
      `revenue-${contractor.annual_revenue || 'unknown'}`,
      `team-size-${contractor.team_size || 'unknown'}`
    ];
    
    // Add focus area tags
    focusAreas.forEach(area => {
      tags.push(`focus-${area.toLowerCase().replace(/\s+/g, '-')}`);
    });
    
    return {
      contactType: 'contractor',
      tpeId: contractor.id,
      firstName: contractor.name?.split(' ')[0] || 'Unknown',
      lastName: contractor.name?.split(' ').slice(1).join(' ') || '',
      email: contractor.email,
      phone: contractor.phone,
      companyName: contractor.company_name || '',
      tags: tags,
      customFields: {
        tpe_contractor_id: contractor.id,
        contact_type: 'contractor',
        annual_revenue: contractor.annual_revenue,
        team_size: contractor.team_size,
        service_area: contractor.service_area,
        focus_areas: focusAreas.join(', '),
        current_stage: contractor.current_stage,
        source: 'tpe_platform'
      }
    };
  });
};

// Get partners (CEOs/Owners) formatted for GHL
const getPartnersForSync = async () => {
  const partnersResult = await query(`
    SELECT id, company_name, ceo_contact_name, ceo_contact_email, 
           ceo_contact_phone, ceo_contact_title,
           service_category, target_revenue_audience, 
           employee_count, established_year, created_at
    FROM partners 
    WHERE ceo_contact_email IS NOT NULL
    ORDER BY created_at DESC
  `);
  
  return partnersResult.rows.map(partner => {
    // Parse service categories for tags
    let serviceCategories = [];
    try {
      if (partner.service_category) {
        serviceCategories = JSON.parse(partner.service_category);
      }
    } catch (e) {
      serviceCategories = partner.service_category ? [partner.service_category] : [];
    }
    
    const tags = [
      'tpe-partner',
      'strategic-partner', 
      'ceo',
      `company-${partner.company_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`,
      `employees-${partner.employee_count || 'unknown'}`
    ];
    
    // Add service category tags
    serviceCategories.forEach(category => {
      tags.push(`service-${category.toLowerCase().replace(/\s+/g, '-')}`);
    });
    
    return {
      contactType: 'partner',
      tpeId: partner.id,
      firstName: partner.ceo_contact_name?.split(' ')[0] || 'Unknown',
      lastName: partner.ceo_contact_name?.split(' ').slice(1).join(' ') || '',
      email: partner.ceo_contact_email,
      phone: partner.ceo_contact_phone,
      companyName: partner.company_name || '',
      tags: tags,
      customFields: {
        tpe_partner_id: partner.id,
        contact_type: 'partner',
        role: 'ceo',
        title: partner.ceo_contact_title || 'CEO',
        company_name: partner.company_name,
        employee_count: partner.employee_count,
        established_year: partner.established_year,
        service_categories: serviceCategories.join(', '),
        source: 'tpe_platform'
      }
    };
  });
};

// Get partner employees formatted for GHL
const getPartnerEmployeesForSync = async () => {
  const partnersResult = await query(`
    SELECT id, company_name,
           sales_contact_name, sales_contact_email, sales_contact_phone, sales_contact_title,
           cx_contact_name, cx_contact_email, cx_contact_phone, cx_contact_title,
           marketing_contact_name, marketing_contact_email, marketing_contact_phone, marketing_contact_title,
           onboarding_contact_name, onboarding_contact_email, onboarding_contact_phone, onboarding_contact_title
    FROM partners 
    ORDER BY created_at DESC
  `);
  
  const employees = [];
  
  partnersResult.rows.forEach(partner => {
    const companyTag = `company-${partner.company_name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}`;
    
    // Sales contact
    if (partner.sales_contact_email) {
      employees.push({
        contactType: 'partner-employee',
        tpeId: `${partner.id}-sales`,
        firstName: partner.sales_contact_name?.split(' ')[0] || 'Unknown',
        lastName: partner.sales_contact_name?.split(' ').slice(1).join(' ') || '',
        email: partner.sales_contact_email,
        phone: partner.sales_contact_phone,
        companyName: partner.company_name || '',
        tags: ['tpe-partner-employee', 'sales-head', companyTag],
        customFields: {
          tpe_partner_id: partner.id,
          contact_type: 'partner-employee',
          role: 'sales',
          title: partner.sales_contact_title || 'Sales Manager',
          company_name: partner.company_name,
          source: 'tpe_platform'
        }
      });
    }
    
    // CX contact
    if (partner.cx_contact_email) {
      employees.push({
        contactType: 'partner-employee',
        tpeId: `${partner.id}-cx`,
        firstName: partner.cx_contact_name?.split(' ')[0] || 'Unknown',
        lastName: partner.cx_contact_name?.split(' ').slice(1).join(' ') || '',
        email: partner.cx_contact_email,
        phone: partner.cx_contact_phone,
        companyName: partner.company_name || '',
        tags: ['tpe-partner-employee', 'cx-head', companyTag],
        customFields: {
          tpe_partner_id: partner.id,
          contact_type: 'partner-employee',
          role: 'customer-experience',
          title: partner.cx_contact_title || 'CX Manager',
          company_name: partner.company_name,
          source: 'tpe_platform'
        }
      });
    }
    
    // Marketing contact
    if (partner.marketing_contact_email) {
      employees.push({
        contactType: 'partner-employee',
        tpeId: `${partner.id}-marketing`,
        firstName: partner.marketing_contact_name?.split(' ')[0] || 'Unknown',
        lastName: partner.marketing_contact_name?.split(' ').slice(1).join(' ') || '',
        email: partner.marketing_contact_email,
        phone: partner.marketing_contact_phone,
        companyName: partner.company_name || '',
        tags: ['tpe-partner-employee', 'marketing-head', companyTag],
        customFields: {
          tpe_partner_id: partner.id,
          contact_type: 'partner-employee',
          role: 'marketing',
          title: partner.marketing_contact_title || 'Marketing Manager',
          company_name: partner.company_name,
          source: 'tpe_platform'
        }
      });
    }
    
    // Operations contact (onboarding)
    if (partner.onboarding_contact_email) {
      employees.push({
        contactType: 'partner-employee',
        tpeId: `${partner.id}-operations`,
        firstName: partner.onboarding_contact_name?.split(' ')[0] || 'Unknown',
        lastName: partner.onboarding_contact_name?.split(' ').slice(1).join(' ') || '',
        email: partner.onboarding_contact_email,
        phone: partner.onboarding_contact_phone,
        companyName: partner.company_name || '',
        tags: ['tpe-partner-employee', 'operations-head', companyTag],
        customFields: {
          tpe_partner_id: partner.id,
          contact_type: 'partner-employee',
          role: 'operations',
          title: partner.onboarding_contact_title || 'Operations Manager',
          company_name: partner.company_name,
          source: 'tpe_platform'
        }
      });
    }
  });
  
  return employees;
};

// Send targeted SMS campaigns
const sendTargetedSMS = async (req, res) => {
  try {
    const { 
      targetType, // 'contractors', 'partners', 'employees', or 'custom'
      tags = [], // Specific tags to target
      contractorIds = [], // Specific contractor IDs
      message,
      campaignName = 'TPE SMS Campaign'
    } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'message is required'
      });
    }
    
    let contacts = [];
    
    if (targetType === 'contractors') {
      contacts = await getContractorsForSync();
    } else if (targetType === 'partners') {
      contacts = await getPartnersForSync();
    } else if (targetType === 'employees') {
      contacts = await getPartnerEmployeesForSync();
    } else if (contractorIds.length > 0) {
      // Custom contractor list
      const placeholders = contractorIds.map(() => '?').join(',');
      const contractorsResult = await query(`
        SELECT id, name, email, phone, company_name
        FROM contractors 
        WHERE id IN (${placeholders}) AND phone IS NOT NULL
      `, contractorIds);
      
      contacts = contractorsResult.rows.map(c => ({
        firstName: c.name?.split(' ')[0] || 'Unknown',
        lastName: c.name?.split(' ').slice(1).join(' ') || '',
        email: c.email,
        phone: c.phone,
        companyName: c.company_name || ''
      }));
    }
    
    // Filter by tags if specified
    if (tags.length > 0) {
      contacts = contacts.filter(contact => 
        contact.tags && contact.tags.some(tag => tags.includes(tag))
      );
    }
    
    const validContacts = contacts.filter(c => c.phone);
    
    res.json({
      success: true,
      message: `SMS campaign prepared for ${validContacts.length} contacts`,
      campaign: {
        name: campaignName,
        targetType: targetType,
        tags: tags,
        contactCount: validContacts.length,
        message: message
      },
      contacts: validContacts,
      triggerUrl: `${req.protocol}://${req.get('host')}/api/ghl-sync/trigger-sms`
    });
    
  } catch (error) {
    console.error('Error preparing targeted SMS campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to prepare SMS campaign',
      details: error.message
    });
  }
};

module.exports = {
  syncAllContactsToGHL,
  getContractorsForSync,
  getPartnersForSync, 
  getPartnerEmployeesForSync,
  sendTargetedSMS
};