require('dotenv').config();
process.env.NODE_ENV = 'production';
const { query, connectDB } = require('./src/config/database');

async function testUpdate() {
  try {
    await connectDB();
    const result = await query(
      `UPDATE contractors 
       SET focus_areas = $1, revenue_tier = $2, team_size = $3, readiness_indicators = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5
       RETURNING *`,
      [
        '["Increasing Revenue","Operational Efficiency","Marketing & Sales"]',
        '$1M-$5M',
        '11-50',
        '["Ready to Scale","Strong Cash Flow","Growing Team"]',
        1
      ]
    );
    console.log('Success! Updated contractor:', result.rows[0].id);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
  process.exit(0);
}

testUpdate();
