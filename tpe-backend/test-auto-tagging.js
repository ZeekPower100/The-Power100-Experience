#!/usr/bin/env node

/**
 * Interactive Auto-Tagging Test Tool
 * Test the AI-powered tagging system with custom content
 */

const readline = require('readline');
const axios = require('axios');
const colors = require('colors/safe');
require('dotenv').config({ path: '.env.development' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_BASE = 'http://localhost:5000/api';
let authToken = null;

// Colored console output
const log = {
  success: (msg) => console.log(colors.green('✅ ' + msg)),
  error: (msg) => console.log(colors.red('❌ ' + msg)),
  info: (msg) => console.log(colors.cyan('ℹ️  ' + msg)),
  title: (msg) => console.log(colors.bold.blue('\n' + msg)),
  tag: (msg) => console.log(colors.yellow('  🏷️  ' + msg))
};

// Test scenarios
const testScenarios = {
  1: {
    name: 'Digital Marketing Partner',
    content: 'We provide comprehensive digital marketing services including SEO, PPC, and social media marketing for contractors scaling from $1M to $5M.',
    type: 'partner'
  },
  2: {
    name: 'Business Book',
    content: 'The E-Myth Contractor teaches contractors how to build systems and processes to scale their business from owner-operator to a true enterprise.',
    type: 'book'
  },
  3: {
    name: 'Growth Podcast',
    content: 'In this episode, we discuss cash flow management, hiring strategies, and operational efficiency for contractors in the $3M-$5M revenue range.',
    type: 'podcast'
  },
  4: {
    name: 'Industry Event',
    content: 'Join us for the Contractor Success Summit focusing on sales strategies, technology adoption, and leadership development for growing contractors.',
    type: 'event'
  }
};

async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    authToken = response.data.token;
    return true;
  } catch (error) {
    log.error('Login failed: ' + error.message);
    return false;
  }
}

async function testTagging(content, entityType = 'partner', revenueRange = null) {
  if (!authToken) {
    log.error('Not authenticated. Please run the tool again.');
    return;
  }

  log.info('Analyzing content...');
  console.log(colors.gray('Content: ' + content.substring(0, 100) + '...'));
  
  try {
    const response = await axios.post(
      `${API_BASE}/tagging/tag-entity`,
      {
        entityType: entityType,
        entityId: Math.floor(Math.random() * 10000),
        content: content,
        metadata: revenueRange ? { revenueRange } : {}
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      log.success('Content analyzed successfully!');
      
      // Display AI Tags
      console.log('Debug: aiTags =', JSON.stringify(response.data.aiTags));
      if (response.data.aiTags && response.data.aiTags.length > 0) {
        log.title('AI-Generated Tags:');
        response.data.aiTags.forEach(tag => {
          log.tag(`${tag.tagName} (${tag.category}) - Confidence: ${(tag.confidence * 100).toFixed(0)}%`);
        });
      } else {
        log.info('No AI tags in response (aiTags array is empty or missing)');
        console.log('Full response data:', JSON.stringify(response.data, null, 2));
      }
      
      // Display Insights
      if (response.data.insights) {
        log.title('AI Insights:');
        const insights = response.data.insights;
        if (insights.key_themes?.length > 0) {
          console.log('  📌 Key Themes: ' + colors.white(insights.key_themes.join(', ')));
        }
        if (insights.target_audience) {
          console.log('  👥 Target Audience: ' + colors.white(insights.target_audience));
        }
        if (insights.actionable_points?.length > 0) {
          console.log('  ⚡ Action Items: ' + colors.white(insights.actionable_points.join(', ')));
        }
        if (insights.revenue_applicability) {
          console.log('  💰 Revenue Range: ' + colors.white(insights.revenue_applicability));
        }
      }
      
      // Display processing time
      if (response.data.processingTime) {
        console.log(colors.gray(`\n⏱️  Processing time: ${response.data.processingTime}ms`));
      }
      
    } else {
      log.error('Tagging failed: ' + response.data.error);
    }
  } catch (error) {
    log.error('Error: ' + (error.response?.data?.error || error.message));
  }
}

function showMenu() {
  console.log(colors.bold.cyan('\n========================================'));
  console.log(colors.bold.cyan('    AI AUTO-TAGGING TEST TOOL'));
  console.log(colors.bold.cyan('========================================\n'));
  console.log('Select an option:\n');
  console.log('  1. Test with Digital Marketing Partner');
  console.log('  2. Test with Business Book');
  console.log('  3. Test with Growth Podcast');
  console.log('  4. Test with Industry Event');
  console.log('  5. Enter custom content');
  console.log('  6. View system statistics');
  console.log('  0. Exit\n');
}

async function getStatistics() {
  try {
    const response = await axios.get(`${API_BASE}/tagging/statistics`);
    
    log.title('Tag System Statistics:');
    console.log(`  Total Tags: ${response.data.summary.totalTags}`);
    console.log(`  Categories: ${response.data.summary.categories.join(', ')}`);
    
    if (response.data.statistics.length > 0) {
      log.title('Top 10 Most Used Tags:');
      response.data.statistics.slice(0, 10).forEach(stat => {
        console.log(`  • ${stat.tag_name}: ${stat.usage_count} uses across ${stat.unique_entities} entities`);
      });
    }
  } catch (error) {
    log.error('Failed to get statistics: ' + error.message);
  }
}

async function getCustomContent() {
  return new Promise((resolve) => {
    rl.question('\nEnter your content (or paste text): ', (content) => {
      if (!content.trim()) {
        log.error('Content cannot be empty');
        resolve(null);
        return;
      }
      
      rl.question('Entity type (partner/book/podcast/event) [partner]: ', (type) => {
        const entityType = type.trim() || 'partner';
        
        rl.question('Revenue range (e.g., $1M-$3M) [optional]: ', (range) => {
          resolve({
            content: content.trim(),
            type: entityType,
            revenueRange: range.trim() || null
          });
        });
      });
    });
  });
}

async function main() {
  console.clear();
  console.log(colors.rainbow('🤖 AI-Powered Auto-Tagging Test Tool'));
  console.log(colors.gray('Powered by OpenAI GPT-3.5-turbo\n'));
  
  // Login first
  log.info('Authenticating...');
  const loggedIn = await login();
  if (!loggedIn) {
    process.exit(1);
  }
  log.success('Authenticated successfully!');
  
  let running = true;
  while (running) {
    showMenu();
    
    const choice = await new Promise(resolve => {
      rl.question('Enter choice: ', resolve);
    });
    
    switch(choice.trim()) {
      case '1':
      case '2':
      case '3':
      case '4':
        const scenario = testScenarios[choice];
        log.title(`Testing: ${scenario.name}`);
        await testTagging(scenario.content, scenario.type);
        break;
        
      case '5':
        const custom = await getCustomContent();
        if (custom) {
          await testTagging(custom.content, custom.type, custom.revenueRange);
        }
        break;
        
      case '6':
        await getStatistics();
        break;
        
      case '0':
        running = false;
        break;
        
      default:
        log.error('Invalid choice. Please try again.');
    }
    
    if (running && choice !== '0') {
      await new Promise(resolve => {
        rl.question('\nPress Enter to continue...', resolve);
      });
    }
  }
  
  console.log(colors.green('\n👋 Goodbye!\n'));
  rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log.error('Unhandled error: ' + error.message);
  process.exit(1);
});

// Run the tool
main();