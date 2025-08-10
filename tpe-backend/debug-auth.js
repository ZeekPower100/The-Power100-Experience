const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function debugAuth() {
  console.log('🔍 Debugging Partner Authentication...\n');
  
  // Step 1: Test direct login
  console.log('Step 1: Testing login credentials...');
  const db = await open({
    filename: './power100.db',
    driver: sqlite3.Database
  });
  
  const user = await db.get(`
    SELECT pu.*, sp.company_name, sp.is_active as partner_active
    FROM partner_users pu
    JOIN strategic_partners sp ON pu.partner_id = sp.id
    WHERE pu.email = ? AND pu.is_active = 1
  `, ['demo@partner.com']);
  
  if (user) {
    console.log('✅ User found:', {
      id: user.id,
      partner_id: user.partner_id,
      email: user.email,
      company_name: user.company_name,
      is_active: user.is_active,
      partner_active: user.partner_active
    });
  } else {
    console.log('❌ User not found');
    await db.close();
    return;
  }
  
  // Step 2: Generate token
  console.log('\nStep 2: Generating JWT token...');
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  console.log('JWT Secret:', JWT_SECRET ? 'SET' : 'NOT SET');
  
  const token = jwt.sign(
    { 
      id: user.id, 
      partnerId: user.partner_id,
      type: 'partner'
    }, 
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  console.log('✅ Token generated');
  
  // Step 3: Verify token
  console.log('\nStep 3: Verifying token...');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('✅ Token verified:', {
      id: decoded.id,
      partnerId: decoded.partnerId,
      type: decoded.type
    });
    
    // Step 4: Test profile lookup with middleware simulation
    console.log('\nStep 4: Testing profile lookup...');
    const middlewareUser = await db.get(`
      SELECT pu.*, sp.is_active as partner_active, sp.company_name
      FROM partner_users pu
      JOIN strategic_partners sp ON pu.partner_id = sp.id
      WHERE pu.id = ? AND pu.is_active = 1
    `, [decoded.id]);
    
    if (middlewareUser) {
      console.log('✅ Middleware user lookup successful');
      
      // Step 5: Test profile data retrieval
      const profile = await db.get(`
        SELECT pu.email, pu.last_login, pu.created_at,
               sp.company_name, sp.description, sp.website, sp.logo_url,
               sp.power_confidence_score, sp.is_active
        FROM partner_users pu
        JOIN strategic_partners sp ON pu.partner_id = sp.id
        WHERE pu.id = ?
      `, [decoded.id]);
      
      if (profile) {
        console.log('✅ Profile data retrieved:', {
          email: profile.email,
          company_name: profile.company_name,
          power_confidence_score: profile.power_confidence_score,
          is_active: profile.is_active
        });
        
        // Step 6: Test analytics data
        console.log('\nStep 5: Testing analytics data...');
        const analytics = await db.all(`
          SELECT metric_type, metric_value
          FROM partner_analytics
          WHERE partner_id = ?
        `, [decoded.partnerId]);
        
        console.log('Analytics records:', analytics.length);
        analytics.forEach(metric => {
          console.log(`   - ${metric.metric_type}: ${metric.metric_value}`);
        });
        
        const leads = await db.get(`
          SELECT COUNT(*) as count
          FROM partner_leads
          WHERE partner_id = ?
        `, [decoded.partnerId]);
        
        console.log('Partner leads:', leads ? leads.count : 0);
        
        console.log('\n🎉 All tests passed! The issue must be with server not restarting or using updated code.');
        
      } else {
        console.log('❌ Profile data not found');
      }
    } else {
      console.log('❌ Middleware user lookup failed');
    }
    
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
  }
  
  await db.close();
}

debugAuth().catch(console.error);