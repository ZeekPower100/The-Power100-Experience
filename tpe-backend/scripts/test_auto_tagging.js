#!/usr/bin/env node

/**
 * Test Auto-Tagging Service
 * Demonstrates the complete auto-tagging workflow
 */

// Load environment variables first
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let authToken = null;

// Test data
const testPartner = {
  company_name: "TechGrowth Solutions",
  service_capabilities: "Digital marketing, SEO optimization, lead generation, marketing automation",
  value_proposition: "We help contractors scale from $1M to $5M through proven digital marketing strategies",
  target_market: "Residential contractors in the $500K-$3M revenue range",
  success_stories: "Helped ABC Plumbing grow from $800K to $2.5M in 18 months",
  focus_areas: ["Marketing", "Sales", "Technology"]
};

const testBook = {
  title: "The E-Myth Contractor",
  author: "Michael E. Gerber",
  content: `Why Contractors Fail and What to Do About It. 
    This book addresses the struggles contractors face when trying to grow their business.
    Topics include: systems development, hiring and training, financial management, 
    marketing strategies for contractors, building a scalable business model.
    Perfect for contractors in the $1M-$5M revenue range looking to systematize operations.`
};

const testPodcast = {
  title: "Contractor Growth Series - Episode 42",
  content: `In this episode, we discuss cash flow management for growing contractors.
    Key topics: managing receivables, project financing, dealing with seasonal fluctuations,
    when to hire your first CFO, financial KPIs every contractor should track.
    Guest expert shares how they scaled from $2M to $8M by improving cash flow.`
};

// Helper function to login
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    authToken = response.data.token;
    console.log('✅ Logged in successfully');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Test tagging a partner
async function testPartnerTagging() {
  console.log('\n📊 Testing Partner Auto-Tagging...');
  
  const content = `
    Company: ${testPartner.company_name}
    Services: ${testPartner.service_capabilities}
    Value Proposition: ${testPartner.value_proposition}
    Target Market: ${testPartner.target_market}
    Success Stories: ${testPartner.success_stories}
    Focus Areas: ${testPartner.focus_areas.join(', ')}
  `;
  
  try {
    const response = await axios.post(
      `${API_BASE}/tagging/tag-entity`,
      {
        entityType: 'partner',
        entityId: 1,
        content: content,
        metadata: {
          revenueRange: '$500K-$3M',
          focusAreas: testPartner.focus_areas
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✅ Partner tagged successfully');
    console.log('   AI Tags:', response.data.aiTags?.map(t => t.tagName).join(', '));
    console.log('   Rule Tags:', response.data.ruleTags?.length || 0, 'tags');
    console.log('   Processing Time:', response.data.processingTime, 'ms');
    
    if (response.data.insights) {
      console.log('   Key Themes:', response.data.insights.key_themes?.join(', '));
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Partner tagging failed:', error.response?.data || error.message);
    return null;
  }
}

// Test tagging a book
async function testBookTagging() {
  console.log('\n📚 Testing Book Auto-Tagging...');
  
  try {
    const response = await axios.post(
      `${API_BASE}/tagging/tag-entity`,
      {
        entityType: 'book',
        entityId: 1,
        content: testBook.content,
        metadata: {
          title: testBook.title,
          author: testBook.author,
          revenueRange: '$1M-$5M'
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✅ Book tagged successfully');
    console.log('   AI Tags:', response.data.aiTags?.map(t => t.tagName).join(', '));
    console.log('   Insights:', response.data.insights?.key_themes?.join(', '));
    
    return response.data;
  } catch (error) {
    console.error('❌ Book tagging failed:', error.response?.data || error.message);
    return null;
  }
}

// Test tagging a podcast
async function testPodcastTagging() {
  console.log('\n🎙️ Testing Podcast Auto-Tagging...');
  
  try {
    const response = await axios.post(
      `${API_BASE}/tagging/tag-entity`,
      {
        entityType: 'podcast',
        entityId: 1,
        content: testPodcast.content,
        metadata: {
          title: testPodcast.title,
          revenueRange: '$2M-$8M'
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    console.log('✅ Podcast tagged successfully');
    console.log('   AI Tags:', response.data.aiTags?.map(t => t.tagName).join(', '));
    console.log('   Actionable Points:', response.data.insights?.actionable_points?.join(', '));
    
    return response.data;
  } catch (error) {
    console.error('❌ Podcast tagging failed:', error.response?.data || error.message);
    return null;
  }
}

// Test searching by tags
async function testSearchByTags() {
  console.log('\n🔍 Testing Search by Tags...');
  
  try {
    // First get available tags
    const tagsResponse = await axios.get(`${API_BASE}/tagging/tags`);
    const marketingTag = tagsResponse.data.tags.find(t => t.tag_name === 'Marketing');
    
    if (!marketingTag) {
      console.log('   No Marketing tag found');
      return;
    }
    
    // Search for entities with Marketing tag
    const searchResponse = await axios.post(
      `${API_BASE}/tagging/search-by-tags`,
      {
        tagIds: [marketingTag.id],
        entityType: null // Search all entity types
      }
    );
    
    console.log('✅ Search completed');
    console.log('   Found', searchResponse.data.count, 'entities with Marketing tag');
    
    searchResponse.data.results.forEach(result => {
      console.log(`   - ${result.entity_type} #${result.entity_id}: ${result.tag_names.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Search failed:', error.response?.data || error.message);
  }
}

// Test tag statistics
async function testTagStatistics() {
  console.log('\n📈 Testing Tag Statistics...');
  
  try {
    const response = await axios.get(`${API_BASE}/tagging/statistics`);
    
    console.log('✅ Statistics retrieved');
    console.log('   Total Tags:', response.data.summary.totalTags);
    console.log('   Categories:', response.data.summary.categories.join(', '));
    
    if (response.data.summary.mostUsed) {
      console.log('   Most Used Tag:', response.data.summary.mostUsed.tag_name, 
                  '(', response.data.summary.mostUsed.usage_count, 'uses)');
    }
    
    // Show top 5 tags
    console.log('\n   Top 5 Tags:');
    response.data.statistics.slice(0, 5).forEach(stat => {
      console.log(`   - ${stat.tag_name}: ${stat.usage_count} uses, ${stat.unique_entities} entities`);
    });
    
  } catch (error) {
    console.error('❌ Statistics failed:', error.response?.data || error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Auto-Tagging Service Tests');
  console.log('=====================================\n');
  
  // Check if OpenAI is configured
  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  WARNING: OpenAI API key not configured');
    console.log('   Auto-tagging will use rule-based tagging only');
    console.log('   To enable AI tagging, set OPENAI_API_KEY in .env file\n');
  }
  
  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Run tests
  await testPartnerTagging();
  await testBookTagging();
  await testPodcastTagging();
  await testSearchByTags();
  await testTagStatistics();
  
  console.log('\n=====================================');
  console.log('✅ Auto-Tagging Service Tests Complete');
  console.log('\nNext Steps:');
  console.log('1. Set OPENAI_API_KEY in .env to enable AI tagging');
  console.log('2. Create tag rules for automated tagging');
  console.log('3. Integrate tagging into entity creation workflows');
  console.log('4. Build UI components for tag management');
}

// Run the tests
runTests().catch(console.error);