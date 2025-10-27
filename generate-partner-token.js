const jwt = require('jsonwebtoken');

// Partner info for demo partner (ID 94)
const partnerPayload = {
  partnerId: 94,
  email: 'demo@techflow.com',
  companyName: 'TechFlow Solutions Updated',
  type: 'partner'
};

// Generate token (expires in 7 days)
const token = jwt.sign(
  partnerPayload,
  'dev-secret-change-in-production-to-something-very-secure', // Same secret as in backend .env.local
  { expiresIn: '7d' }
);

console.log('Partner Token (use in Authorization: Bearer <token>):');
console.log(token);
console.log('\n');
console.log('Test command:');
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5000/api/partner-portal/leads/stats`);
