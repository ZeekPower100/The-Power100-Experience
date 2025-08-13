// Standalone server for Railway - NO IMPORTS FROM OTHER FILES
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Request logging middleware (FIRST)
app.use((req, res, next) => {
  console.log(`🔥 INCOMING REQUEST: ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://the-power100-experience.vercel.app',
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:3001'
    ];
    
    // Allow Vercel preview deployments (matches pattern)
    if (!origin || allowedOrigins.includes(origin) || 
        origin.includes('.vercel.app') || 
        origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TPE Backend API Running',
    status: 'active',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database
app.post('/api/init-db', async (req, res) => {
  try {
    // Create tables
    await pool.query(`
      DROP TABLE IF EXISTS demo_bookings CASCADE;
      DROP TABLE IF EXISTS contractor_partner_matches CASCADE;
      DROP TABLE IF EXISTS contractors CASCADE;
      DROP TABLE IF EXISTS strategic_partners CASCADE;
      DROP TABLE IF EXISTS admin_users CASCADE;
      DROP TYPE IF EXISTS verification_status CASCADE;
      DROP TYPE IF EXISTS contractor_stage CASCADE;
      DROP TYPE IF EXISTS booking_status CASCADE;
      
      CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'failed');
      CREATE TYPE contractor_stage AS ENUM ('verification', 'focus_selection', 'profiling', 'matching', 'completed');
      CREATE TYPE booking_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
      
      CREATE TABLE admin_users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE strategic_partners (
          id SERIAL PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL,
          description TEXT,
          logo_url VARCHAR(500),
          website VARCHAR(255),
          contact_email VARCHAR(255) NOT NULL,
          contact_phone VARCHAR(20),
          focus_areas_served TEXT[],
          target_revenue_range TEXT[],
          power_confidence_score INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          key_differentiators TEXT[],
          pricing_model TEXT,
          onboarding_url VARCHAR(500),
          demo_booking_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE contractors (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20) NOT NULL,
          company_name VARCHAR(255) NOT NULL,
          company_website VARCHAR(255),
          service_area VARCHAR(255),
          services_offered TEXT[],
          focus_areas TEXT[],
          primary_focus_area VARCHAR(100),
          annual_revenue VARCHAR(50),
          team_size INTEGER,
          increased_tools BOOLEAN DEFAULT false,
          increased_people BOOLEAN DEFAULT false,
          increased_activity BOOLEAN DEFAULT false,
          opted_in_coaching BOOLEAN DEFAULT false,
          verification_status verification_status DEFAULT 'pending',
          verification_code VARCHAR(6),
          verification_expires_at TIMESTAMP,
          current_stage contractor_stage DEFAULT 'verification',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
      );
      
      CREATE TABLE contractor_partner_matches (
          id SERIAL PRIMARY KEY,
          contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
          partner_id INTEGER REFERENCES strategic_partners(id) ON DELETE CASCADE,
          match_score INTEGER DEFAULT 0,
          match_reasons TEXT[],
          is_primary_match BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(contractor_id, partner_id)
      );
      
      CREATE TABLE demo_bookings (
          id SERIAL PRIMARY KEY,
          contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
          partner_id INTEGER REFERENCES strategic_partners(id) ON DELETE CASCADE,
          scheduled_date TIMESTAMP NOT NULL,
          status booking_status DEFAULT 'scheduled',
          notes TEXT,
          meeting_link VARCHAR(500),
          reminder_sent BOOLEAN DEFAULT false,
          follow_up_sent BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    await pool.query(
      `INSERT INTO admin_users (email, password_hash, full_name)
       VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING`,
      ['admin@power100.io', hashedPassword, 'System Administrator']
    );
    
    // Add sample partners for demo
    const samplePartners = [
      {
        company_name: 'Buildr Pro Solutions',
        description: 'Industry-leading construction management software and services',
        website: 'https://buildrpro.com',
        contact_email: 'partners@buildrpro.com',
        focus_areas_served: ['Technology & Software', 'Operations & Efficiency', 'Financial Management'],
        target_revenue_range: ['$1-5M', '$5-10M', '$10M+'],
        power_confidence_score: 92,
        key_differentiators: ['Cloud-based platform', '24/7 support', 'Industry expertise'],
        pricing_model: 'Monthly subscription starting at $299'
      },
      {
        company_name: 'SafetyFirst Compliance',
        description: 'Comprehensive safety training and OSHA compliance solutions',
        website: 'https://safetyfirst.com',
        contact_email: 'info@safetyfirst.com',
        focus_areas_served: ['Safety & Compliance', 'Training & Development', 'Risk Management'],
        target_revenue_range: ['$500K-1M', '$1-5M', '$5-10M'],
        power_confidence_score: 88,
        key_differentiators: ['OSHA certified trainers', 'Mobile app', 'Custom programs'],
        pricing_model: 'Per employee pricing, volume discounts available'
      },
      {
        company_name: 'GrowthScale Marketing',
        description: 'Digital marketing and lead generation for contractors',
        website: 'https://growthscale.com',
        contact_email: 'hello@growthscale.com',
        focus_areas_served: ['Marketing & Branding', 'Customer Acquisition', 'Sales Enablement'],
        target_revenue_range: ['$1-5M', '$5-10M', '$10M+'],
        power_confidence_score: 85,
        key_differentiators: ['Contractor-specific expertise', 'ROI guarantee', 'Full-service agency'],
        pricing_model: 'Performance-based pricing with monthly retainer'
      }
    ];
    
    for (const partner of samplePartners) {
      // Check if partner already exists
      const existingPartner = await pool.query(
        'SELECT id FROM strategic_partners WHERE contact_email = $1',
        [partner.contact_email]
      );
      
      if (existingPartner.rows.length === 0) {
        await pool.query(
          `INSERT INTO strategic_partners 
           (company_name, description, website, contact_email, focus_areas_served, 
            target_revenue_range, power_confidence_score, key_differentiators, 
            pricing_model, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)`,
          [partner.company_name, partner.description, partner.website, 
           partner.contact_email, partner.focus_areas_served, partner.target_revenue_range,
           partner.power_confidence_score, partner.key_differentiators, partner.pricing_model]
        );
      }
    }
    
    console.log('✅ Sample partners added to database');
    
    res.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'development-secret',
      { expiresIn: '24h' }
    );
    
    res.json({ success: true, token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get partners
app.get('/api/partners', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM strategic_partners WHERE is_active = true ORDER BY power_confidence_score DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch partners' });
  }
});

// Get contractors
app.get('/api/contractors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contractors ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contractors' });
  }
});

// Start contractor verification
app.post('/api/contractors/verify-start', async (req, res) => {
  try {
    console.log('📥 Verification request received:', req.body);
    const { name, email, phone, company_name, company } = req.body;
    const companyName = company_name || company; // Accept both field names
    
    // Validate required fields
    if (!name || !email || !phone || !companyName) {
      console.error('❌ Missing required fields:', { name: !!name, email: !!email, phone: !!phone, companyName: !!companyName });
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: { name: !!name, email: !!email, phone: !!phone, company: !!companyName }
      });
    }
    
    // Generate verification code (for demo, always use 123456)
    const verificationCode = '123456';
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    // Insert or update contractor
    const result = await pool.query(
      `INSERT INTO contractors (name, email, phone, company_name, verification_code, verification_expires_at, current_stage)
       VALUES ($1, $2, $3, $4, $5, $6, 'verification')
       ON CONFLICT (email) DO UPDATE 
       SET name = $1, phone = $3, company_name = $4, 
           verification_code = $5, verification_expires_at = $6,
           current_stage = 'verification', updated_at = CURRENT_TIMESTAMP
       RETURNING id, name, email, phone, company_name`,
      [name, email, phone, companyName, verificationCode, expiresAt]
    );
    
    console.log('📱 Verification started for:', email, 'Code:', verificationCode);
    
    res.json({ 
      success: true, 
      contractorId: result.rows[0].id,
      message: 'Verification code sent',
      // For demo purposes, include the code in response
      demoCode: verificationCode
    });
  } catch (error) {
    console.error('Verification start error:', error);
    res.status(500).json({ error: 'Failed to start verification' });
  }
});

// Verify contractor code
app.post('/api/contractors/verify-code', async (req, res) => {
  try {
    const { contractorId, contractor_id, code } = req.body;
    const id = contractorId || contractor_id; // Accept both field names
    
    // For demo, accept 123456 always
    if (code === '123456') {
      // Update contractor verification status
      await pool.query(
        `UPDATE contractors 
         SET verification_status = 'verified', 
             current_stage = 'focus_selection',
             opted_in_coaching = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [id]
      );
      
      res.json({ 
        success: true, 
        message: 'Verification successful'
      });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid verification code' 
      });
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Update contractor profile handler
const updateContractorProfile = async (req, res) => {
  try {
    const { contractorId } = req.params;
    const profileData = req.body;
    
    console.log('📝 Profile update request:', { contractorId, fields: Object.keys(profileData) });
    
    // Build dynamic update query based on provided fields
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    // Support both camelCase and snake_case field names
    if (profileData.focusAreas || profileData.focus_areas) {
      updates.push(`focus_areas = $${paramCount++}`);
      values.push(profileData.focusAreas || profileData.focus_areas);
    }
    if (profileData.primaryFocusArea || profileData.primary_focus_area) {
      updates.push(`primary_focus_area = $${paramCount++}`);
      values.push(profileData.primaryFocusArea || profileData.primary_focus_area);
    }
    if (profileData.annualRevenue || profileData.annual_revenue) {
      updates.push(`annual_revenue = $${paramCount++}`);
      values.push(profileData.annualRevenue || profileData.annual_revenue);
    }
    if (profileData.teamSize !== undefined || profileData.team_size !== undefined) {
      updates.push(`team_size = $${paramCount++}`);
      values.push(profileData.teamSize ?? profileData.team_size);
    }
    if (profileData.increasedTools !== undefined || profileData.increased_tools !== undefined) {
      updates.push(`increased_tools = $${paramCount++}`);
      values.push(profileData.increasedTools ?? profileData.increased_tools);
    }
    if (profileData.increasedPeople !== undefined || profileData.increased_people !== undefined) {
      updates.push(`increased_people = $${paramCount++}`);
      values.push(profileData.increasedPeople ?? profileData.increased_people);
    }
    if (profileData.increasedActivity !== undefined || profileData.increased_activity !== undefined) {
      updates.push(`increased_activity = $${paramCount++}`);
      values.push(profileData.increasedActivity ?? profileData.increased_activity);
    }
    if (profileData.serviceArea || profileData.service_area) {
      updates.push(`service_area = $${paramCount++}`);
      values.push(profileData.serviceArea || profileData.service_area);
    }
    if (profileData.servicesOffered || profileData.services_offered) {
      updates.push(`services_offered = $${paramCount++}`);
      values.push(profileData.servicesOffered || profileData.services_offered);
    }
    if (profileData.current_stage) {
      updates.push(`current_stage = $${paramCount++}`);
      values.push(profileData.current_stage);
    }
    
    // Don't duplicate current_stage update if already set
    if (!profileData.current_stage) {
      // Auto-determine stage based on data provided
      if ((profileData.annualRevenue || profileData.annual_revenue) && 
          (profileData.teamSize !== undefined || profileData.team_size !== undefined)) {
        updates.push(`current_stage = $${paramCount++}`);
        values.push('matching');
      } else if ((profileData.focusAreas || profileData.focus_areas) && 
                 (profileData.focusAreas?.length > 0 || profileData.focus_areas?.length > 0)) {
        updates.push(`current_stage = $${paramCount++}`);
        values.push('profiling');
      }
    }
    
    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());
    
    values.push(contractorId);
    
    const query = `
      UPDATE contractors 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    res.json({ 
      success: true, 
      contractor: result.rows[0] 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Support both PUT and POST for profile updates
app.put('/api/contractors/:contractorId/profile', updateContractorProfile);
app.post('/api/contractors/:contractorId/profile', updateContractorProfile);

// Get contractor matches
app.get('/api/contractors/:contractorId/matches', async (req, res) => {
  try {
    const { contractorId } = req.params;
    
    // Get contractor data
    const contractorResult = await pool.query(
      'SELECT * FROM contractors WHERE id = $1',
      [contractorId]
    );
    
    if (contractorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }
    
    const contractor = contractorResult.rows[0];
    
    // Get all active partners
    const partnersResult = await pool.query(
      'SELECT * FROM strategic_partners WHERE is_active = true'
    );
    
    // Calculate matches based on focus areas
    const matches = partnersResult.rows.map(partner => {
      let score = 60; // Base score
      const reasons = [];
      
      // Check focus area overlap
      if (contractor.focus_areas && partner.focus_areas_served) {
        const contractorFocus = contractor.focus_areas;
        const partnerFocus = partner.focus_areas_served;
        const overlap = contractorFocus.filter(f => partnerFocus.includes(f));
        
        if (overlap.length > 0) {
          score += overlap.length * 10;
          reasons.push(`Specializes in ${overlap.join(', ')}`);
        }
      }
      
      // Check revenue range compatibility
      if (contractor.annual_revenue && partner.target_revenue_range) {
        if (partner.target_revenue_range.includes(contractor.annual_revenue)) {
          score += 10;
          reasons.push('Revenue range match');
        }
      }
      
      // Add PowerConfidence score bonus
      if (partner.power_confidence_score > 80) {
        score += 10;
        reasons.push(`High PowerConfidence score: ${partner.power_confidence_score}`);
      }
      
      return {
        partnerId: partner.id,
        partnerName: partner.company_name,
        description: partner.description,
        logoUrl: partner.logo_url,
        website: partner.website,
        matchScore: Math.min(score, 100),
        matchReasons: reasons,
        keyDifferentiators: partner.key_differentiators,
        powerConfidenceScore: partner.power_confidence_score
      };
    });
    
    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Take top 3 matches
    const topMatches = matches.slice(0, 3);
    
    // Store matches in database
    for (const match of topMatches) {
      await pool.query(
        `INSERT INTO contractor_partner_matches 
         (contractor_id, partner_id, match_score, match_reasons, is_primary_match)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (contractor_id, partner_id) 
         DO UPDATE SET match_score = $3, match_reasons = $4`,
        [contractorId, match.partnerId, match.matchScore, match.matchReasons, 
         match === topMatches[0]]
      );
    }
    
    res.json({ 
      success: true, 
      matches: topMatches 
    });
  } catch (error) {
    console.error('Match generation error:', error);
    res.status(500).json({ error: 'Failed to generate matches' });
  }
});

// Complete contractor flow
app.post('/api/contractors/:contractorId/complete', async (req, res) => {
  try {
    const { contractorId } = req.params;
    const { selectedPartnerId, selected_partner_id, demoDate, demo_date } = req.body;
    
    // Accept both camelCase and snake_case
    const partnerId = selectedPartnerId || selected_partner_id;
    const scheduledDate = demoDate || demo_date;
    
    console.log('✅ Completing flow:', { contractorId, partnerId, scheduledDate });
    
    // Update contractor as completed
    await pool.query(
      `UPDATE contractors 
       SET current_stage = 'completed',
           completed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [contractorId]
    );
    
    // Create demo booking if partner selected
    if (partnerId && scheduledDate) {
      await pool.query(
        `INSERT INTO demo_bookings 
         (contractor_id, partner_id, scheduled_date, status)
         VALUES ($1, $2, $3, 'scheduled')`,
        [contractorId, partnerId, scheduledDate]
      );
    } else if (partnerId) {
      // If no date provided, use a week from now
      const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await pool.query(
        `INSERT INTO demo_bookings 
         (contractor_id, partner_id, scheduled_date, status)
         VALUES ($1, $2, $3, 'scheduled')`,
        [contractorId, partnerId, defaultDate]
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Contractor flow completed successfully' 
    });
  } catch (error) {
    console.error('Completion error:', error);
    res.status(500).json({ error: 'Failed to complete flow' });
  }
});

// Get contractor stats
app.get('/api/contractors/stats/overview', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN current_stage = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN current_stage = 'verification' THEN 1 END) as in_verification,
        COUNT(CASE WHEN current_stage = 'focus_selection' THEN 1 END) as in_focus,
        COUNT(CASE WHEN current_stage = 'profiling' THEN 1 END) as in_profiling,
        COUNT(CASE WHEN current_stage = 'matching' THEN 1 END) as in_matching
      FROM contractors
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Partner registration
app.post('/api/partner-auth/register', async (req, res) => {
  try {
    const { email, password, company_name, contact_name } = req.body;
    
    // Check if partner user table exists, if not create it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS partner_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      `INSERT INTO partner_users (email, password_hash, company_name, contact_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = $2, company_name = $3, contact_name = $4
       RETURNING id, email, company_name, contact_name`,
      [email, hashedPassword, company_name, contact_name]
    );
    
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Partner registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Feedback survey endpoints
app.get('/api/feedback/surveys', async (req, res) => {
  try {
    const { id, contractor, partner } = req.query;
    
    // If survey ID provided, look up specific survey
    if (id) {
      // For demo purposes, return mock survey data
      const mockSurvey = {
        id: id,
        partner_id: parseInt(partner) || 1,
        contractor_id: parseInt(contractor) || 1,
        partner_name: 'Buildr',
        contractor_name: 'Demo Contractor',
        survey_type: 'quarterly',
        status: 'pending',
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      res.json({ success: true, surveys: [mockSurvey] });
    } else {
      // Return all surveys (empty for now)
      res.json({ success: true, surveys: [] });
    }
  } catch (error) {
    console.error('Survey fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

app.post('/api/feedback/surveys/submit', async (req, res) => {
  try {
    const { surveyId, contractorId, partnerId, responses } = req.body;
    
    // For demo purposes, just return success
    console.log('📝 Feedback survey submitted:', {
      surveyId,
      contractorId,
      partnerId,
      responses: Object.keys(responses || {}).length + ' responses'
    });
    
    res.json({ 
      success: true, 
      message: 'Feedback survey submitted successfully',
      submissionId: `sub_${Date.now()}`
    });
  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

app.post('/api/feedback/submit-response', async (req, res) => {
  try {
    const formData = req.body;
    
    // For demo purposes, just return success
    console.log('📝 Feedback form submitted:', {
      surveyId: formData.surveyId,
      overallSatisfaction: formData.overallSatisfaction,
      communicationRating: formData.communicationRating,
      likelihoodToRecommend: formData.likelihoodToRecommend,
      responseCount: Object.keys(formData).length
    });
    
    res.json({ 
      success: true, 
      message: 'Feedback submitted successfully',
      submissionId: `resp_${Date.now()}`
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Partner login
app.post('/api/partner-auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // First ensure the table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS partner_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const result = await pool.query('SELECT * FROM partner_users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, type: 'partner' },
      process.env.JWT_SECRET || 'development-secret',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true, 
      token, 
      partner: { 
        id: user.id, 
        email: user.email, 
        company_name: user.company_name,
        contact_name: user.contact_name 
      } 
    });
  } catch (error) {
    console.error('Partner login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Error handling middleware (MUST be last)
app.use((err, req, res, next) => {
  console.error('🚨 EXPRESS ERROR:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// Global error handlers (Railway requirement)
process.on('uncaughtException', (err) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('🚨 UNHANDLED REJECTION:', err);
});

// Start server - Railway requires IPv4 binding
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Standalone server running on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database configured: ${!!process.env.DATABASE_URL}`);
  console.log(`Server address: ${JSON.stringify(server.address())}`);
  console.log(`✅ Ready to receive requests on port ${PORT}`);
});

// Server error handler
server.on('error', (err) => {
  console.error('🚨 SERVER ERROR:', err);
});