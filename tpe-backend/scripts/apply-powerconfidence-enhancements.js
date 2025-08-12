const fs = require('fs');
const path = require('path');
const { query, connectDB } = require('../src/config/database.sqlite');

async function applyEnhancements() {
  try {
    // Connect to database first
    await connectDB();
    console.log('🔄 Applying PowerConfidence database enhancements...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, '../src/database/powerconfidence-enhancements.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL statements and execute them one by one
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`\n${i + 1}/${statements.length}: Executing statement...`);
      
      try {
        await query(statement);
        console.log('✅ Success');
      } catch (error) {
        // Some ALTER TABLE statements might fail if columns already exist
        if (error.message.includes('duplicate column name') || 
            error.message.includes('already exists')) {
          console.log('⚠️ Column/table already exists, skipping...');
        } else {
          console.error('❌ Error:', error.message);
        }
      }
    }
    
    console.log('\n🎉 PowerConfidence enhancements applied successfully!');
    
    // Verify the enhancements
    console.log('\n📊 Verifying enhancements...');
    
    // Check partner scores (use safe query in case columns don't exist)
    let partners;
    try {
      partners = await query(`
        SELECT company_name, current_powerconfidence_score, score_trend 
        FROM strategic_partners 
        WHERE is_active = 1 
        ORDER BY current_powerconfidence_score DESC 
        LIMIT 5
      `);
    } catch (error) {
      partners = await query(`
        SELECT company_name, power_confidence_score as current_powerconfidence_score, 'stable' as score_trend 
        FROM strategic_partners 
        WHERE is_active = 1 
        ORDER BY power_confidence_score DESC 
        LIMIT 5
      `);
    }
    
    console.log('Top 5 partners by PowerConfidence score:');
    partners.rows.forEach((partner, index) => {
      const trend = partner.score_trend === 'up' ? '↗' : 
                   partner.score_trend === 'down' ? '↘' : '→';
      console.log(`  ${index + 1}. ${partner.company_name}: ${partner.current_powerconfidence_score} ${trend}`);
    });
    
    // Check history entries
    const historyCount = await query('SELECT COUNT(*) as count FROM powerconfidence_history');
    console.log(`\n📈 PowerConfidence history entries: ${historyCount.rows[0].count}`);
    
    // Check insights
    const insightsCount = await query('SELECT COUNT(*) as count FROM partner_insights');
    console.log(`💡 Partner insights generated: ${insightsCount.rows[0].count}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Failed to apply enhancements:', error);
    process.exit(1);
  }
}

applyEnhancements();