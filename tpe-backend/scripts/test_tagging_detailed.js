#!/usr/bin/env node

/**
 * Detailed test of tagging service to debug tag matching
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.development') });
const autoTaggingService = require('../src/services/autoTaggingService');

async function testTagging() {
  console.log('🧪 Testing Auto-Tagging Service Directly\n');
  
  // Test content
  const testContent = `
    TechGrowth Solutions provides comprehensive digital marketing services 
    including SEO optimization, PPC advertising, and social media marketing. 
    We specialize in helping residential contractors scale from $1M to $5M 
    in annual revenue through proven online marketing strategies.
  `;
  
  const metadata = {
    revenueRange: '$1M-$3M',
    focusAreas: ['Marketing', 'Sales', 'Technology']
  };
  
  console.log('📝 Test Content:', testContent.trim());
  console.log('📊 Metadata:', metadata);
  console.log('\n----------------------------------------\n');
  
  try {
    // Call the tagging service directly
    const result = await autoTaggingService.tagEntity(
      'partner',
      999,
      testContent,
      metadata
    );
    
    console.log('\n----------------------------------------\n');
    console.log('📋 RESULTS:\n');
    console.log('Success:', result.success);
    console.log('Processing Time:', result.processingTime, 'ms');
    
    console.log('\n🏷️ AI Tags:', result.aiTags?.length || 0);
    if (result.aiTags && result.aiTags.length > 0) {
      result.aiTags.forEach(tag => {
        console.log(`  • ${tag.tagName} (${tag.category}) - ID: ${tag.tagId}, Confidence: ${tag.confidence}`);
      });
    }
    
    console.log('\n📐 Rule Tags:', result.ruleTags?.length || 0);
    
    console.log('\n💡 Insights:');
    if (result.insights) {
      console.log('  Key Themes:', result.insights.key_themes?.join(', '));
      console.log('  Target Audience:', result.insights.target_audience);
      console.log('  Actionable Points:', result.insights.actionable_points?.join(', '));
      console.log('  Revenue Applicability:', result.insights.revenue_applicability);
    }
    
    // Check database for the tags
    console.log('\n----------------------------------------\n');
    console.log('🔍 Checking database for applied tags...');
    const entityTags = await autoTaggingService.getEntityTags('partner', 999);
    console.log('Tags in database for this entity:', entityTags.length);
    entityTags.forEach(tag => {
      console.log(`  • ${tag.tag_name} (${tag.tag_category}) - Confidence: ${tag.confidence_score}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

testTagging();