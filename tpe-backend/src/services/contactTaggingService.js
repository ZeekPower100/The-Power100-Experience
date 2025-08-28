// Contact Tagging Service - Automatic contact classification and tagging
const { query } = require('../config/database.sqlite');

class ContactTaggingService {
  
  /**
   * Extract email domain from email address
   */
  extractEmailDomain(email) {
    if (!email || typeof email !== 'string') return null;
    return email.split('@')[1]?.toLowerCase() || null;
  }

  /**
   * Determine contact type based on email domain and onboarding source
   */
  async determineContactType(email, onboardingSource = 'contractor_flow', associatedPartnerId = null) {
    const emailDomain = this.extractEmailDomain(email);
    
    // If they came through contractor flow, they're a contractor
    if (onboardingSource === 'contractor_flow') {
      return {
        contact_type: 'contractor',
        onboarding_source: 'contractor_flow',
        email_domain: emailDomain,
        tags: ['contractor', 'customer'],
        associated_partner_id: null
      };
    }
    
    // If they came through partner portal, they're likely an employee
    if (onboardingSource === 'partner_portal' && associatedPartnerId) {
      // Get partner domain to cross-reference
      const partner = await query('SELECT contact_email, website FROM strategic_partners WHERE id = $1', [associatedPartnerId]);
      
      let tags = ['employee'];
      
      if (partner.rows.length > 0) {
        const partnerDomain = this.extractEmailDomain(partner.rows[0].contact_email);
        const partnerWebsite = partner.rows[0].website?.replace(/^https?:\/\//, '').replace(/^www\./, '');
        
        // If email domain matches partner's domain, they're definitely an employee
        if (emailDomain === partnerDomain || emailDomain === partnerWebsite) {
          tags.push('verified_employee');
        } else {
          tags.push('external_contact');
        }
      }
      
      return {
        contact_type: 'employee',
        onboarding_source: 'partner_portal',
        email_domain: emailDomain,
        tags,
        associated_partner_id: associatedPartnerId
      };
    }
    
    // If they came through admin import, check email domain patterns
    if (onboardingSource === 'admin_import') {
      // Common business domains suggest employee
      const businessDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const isPersonalEmail = businessDomains.includes(emailDomain);
      
      return {
        contact_type: isPersonalEmail ? 'contractor' : 'employee',
        onboarding_source: 'admin_import',
        email_domain: emailDomain,
        tags: isPersonalEmail ? ['contractor', 'imported'] : ['employee', 'imported'],
        associated_partner_id: associatedPartnerId
      };
    }
    
    // Default to contractor
    return {
      contact_type: 'contractor',
      onboarding_source: onboardingSource || 'unknown',
      email_domain: emailDomain,
      tags: ['contractor'],
      associated_partner_id: null
    };
  }

  /**
   * Auto-tag contractor during onboarding
   */
  async tagContractorOnboarding(contractorId, email, additionalTags = []) {
    try {
      const taggingData = await this.determineContactType(email, 'contractor_flow');
      const allTags = [...taggingData.tags, ...additionalTags];
      
      await query(`
        UPDATE contractors 
        SET contact_type = $1, 
            onboarding_source = $2, 
            email_domain = $3, 
            tags = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [
        taggingData.contact_type,
        taggingData.onboarding_source,
        taggingData.email_domain,
        JSON.stringify(allTags),
        contractorId
      ]);
      
      console.log(`✅ Tagged contractor ${contractorId} as:`, {
        contact_type: taggingData.contact_type,
        tags: allTags,
        email_domain: taggingData.email_domain
      });
      
      return { success: true, taggingData: { ...taggingData, tags: allTags } };
    } catch (error) {
      console.error('Error tagging contractor:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contacts by tag for Power Cards campaigns
   */
  async getContactsByTag(tags = [], contactType = null) {
    try {
      let whereClause = '1=1';
      const params = [];
      
      if (contactType) {
        whereClause += ' AND contact_type = ?';
        params.push(contactType);
      }
      
      if (tags.length > 0) {
        // Check if any of the provided tags exist in the JSON tags field
        const tagConditions = tags.map(() => 'tags LIKE ?').join(' OR ');
        whereClause += ` AND (${tagConditions})`;
        tags.forEach(tag => {
          params.push(`%"${tag}"%`);
        });
      }
      
      const result = await query(`
        SELECT id, name, email, contact_type, onboarding_source, 
               email_domain, tags, associated_partner_id,
               created_at, updated_at
        FROM contractors 
        WHERE ${whereClause}
        ORDER BY created_at DESC
      `, params);
      
      return result.rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags || '[]')
      }));
    } catch (error) {
      console.error('Error getting contacts by tag:', error);
      return [];
    }
  }

  /**
   * Get contact statistics for admin dashboard
   */
  async getContactStats() {
    try {
      const stats = await query(`
        SELECT 
          contact_type,
          onboarding_source,
          COUNT(*) as count
        FROM contractors 
        WHERE contact_type IS NOT NULL
        GROUP BY contact_type, onboarding_source
        ORDER BY contact_type, count DESC
      `);
      
      const tagStats = await query(`
        SELECT 
          contact_type,
          tags,
          COUNT(*) as count
        FROM contractors 
        WHERE tags IS NOT NULL AND tags != '[]'
        GROUP BY contact_type, tags
        ORDER BY count DESC
      `);
      
      return {
        byType: stats.rows,
        byTags: tagStats.rows.map(row => ({
          ...row,
          tags: JSON.parse(row.tags || '[]')
        }))
      };
    } catch (error) {
      console.error('Error getting contact stats:', error);
      return { byType: [], byTags: [] };
    }
  }

  /**
   * Add additional tags to a contact
   */
  async addTagsToContact(contractorId, newTags = []) {
    try {
      const result = await query('SELECT tags FROM contractors WHERE id = $1', [contractorId]);
      
      if (result.rows.length === 0) {
        throw new Error('Contact not found');
      }
      
      const existingTags = JSON.parse(result.rows[0].tags || '[]');
      const updatedTags = [...new Set([...existingTags, ...newTags])]; // Remove duplicates
      
      await query('UPDATE contractors SET tags = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [
        JSON.stringify(updatedTags),
        contractorId
      ]);
      
      return { success: true, tags: updatedTags };
    } catch (error) {
      console.error('Error adding tags to contact:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ContactTaggingService();