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