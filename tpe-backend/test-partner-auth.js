const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

// Test partner authentication flow
async function testPartnerAuth() {
  console.log('🔍 Testing partner authentication flow...');
  
  // Connect to database
  const db = await open({
    filename: './power100.db',
    driver: sqlite3.Database
  });
  
  // Step 1: Check if our test user exists
  const user = await db.get(`
    SELECT pu.*, sp.company_name, sp.is_active as partner_active
    FROM partner_users pu
    JOIN strategic_partners sp ON pu.partner_id = sp.id
    WHERE pu.email = ? AND pu.is_active = 1
  `, ['demo@partner.com']);
  
  if (!user) {
    console.log('❌ Demo user not found');
    await db.close();
    return;
  }
  
  console.log('✅ Found demo user:', {
    id: user.id,
    email: user.email,
    partner_id: user.partner_id,
    company_name: user.company_name
  });
  
  // Step 2: Test password verification
  const password = 'testpass123';
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  console.log('✅ Password verification:', passwordMatch);
  
  // Step 3: Create JWT token
  const token = jwt.sign(
    { 
      id: user.id, 
      partnerId: user.partner_id,
      type: 'partner'
    }, 
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
  
  console.log('✅ Generated token');
  
  // Step 4: Test token verification
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  console.log('✅ Token decoded:', decoded);
  
  // Step 5: Test profile lookup
  const profile = await db.get(`
    SELECT pu.email, pu.last_login, pu.created_at,
           sp.company_name, sp.description, sp.website, sp.logo_url,
           sp.power_confidence_score, sp.is_active
    FROM partner_users pu
    JOIN strategic_partners sp ON pu.partner_id = sp.id
    WHERE pu.id = ?
  `, [decoded.id]);
  
  if (profile) {
    console.log('✅ Profile found:', profile);
  } else {
    console.log('❌ Profile not found for user ID:', decoded.id);
  }
  
  await db.close();
  console.log('🎉 Test complete!');
}

testPartnerAuth().catch(console.error);