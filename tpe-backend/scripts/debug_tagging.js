#!/usr/bin/env node

/**
 * Debug tagging to find why aiTags is empty
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.development') });
const axios = require('axios');

async function debugTagging() {
  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in');
    
    // Test tagging
    const testEntityId = 5000 + Math.floor(Math.random() * 1000);
    console.log(`\n🧪 Testing with entity ID: ${testEntityId}`);
    
    const tagResponse = await axios.post(
      'http://localhost:5000/api/tagging/tag-entity',
      {
        entityType: 'partner',
        entityId: testEntityId,
        content: 'Digital marketing and SEO services for contractors in the $1M-$3M range',
        metadata: {}
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('\n📋 API Response:');
    console.log('  Success:', tagResponse.data.success);
    console.log('  AI Tags array:', tagResponse.data.aiTags);
    console.log('  AI Tags length:', tagResponse.data.aiTags?.length || 0);
    
    if (tagResponse.data.aiTags && tagResponse.data.aiTags.length > 0) {
      console.log('\n  Tags details:');
      tagResponse.data.aiTags.forEach(tag => {
        console.log(`    - ${tag.tagName} (${tag.category}) - Confidence: ${tag.confidence}`);
        if (tag.error) {
          console.log(`      ⚠️ Error: ${tag.error}`);
        }
      });
    }
    
    console.log('\n  Insights:', tagResponse.data.insights ? 'Present' : 'Missing');
    if (tagResponse.data.insights) {
      console.log('    - Key themes:', tagResponse.data.insights.key_themes);
    }
    
    // Check database directly
    const pool = require('../src/config/database');
    const dbResult = await pool.query(
      'SELECT * FROM tagged_content WHERE entity_id = $1 AND entity_type = $2',
      [testEntityId, 'partner']
    );
    
    console.log(`\n🗄️ Database check for entity ${testEntityId}:`);
    console.log('  Tags in database:', dbResult.rows.length);
    
    if (dbResult.rows.length > 0) {
      for (const row of dbResult.rows) {
        const tagInfo = await pool.query('SELECT tag_name FROM content_tags WHERE id = $1', [row.tag_id]);
        console.log(`    - ${tagInfo.rows[0].tag_name} (Confidence: ${row.confidence_score})`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
  
  process.exit(0);
}

debugTagging();