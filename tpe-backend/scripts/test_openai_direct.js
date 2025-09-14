#!/usr/bin/env node

/**
 * Direct test of OpenAI API to debug response format
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.development') });
const OpenAI = require('openai');

async function testOpenAI() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const prompt = `Analyze the following partner content and provide relevant tags and insights for a contractor business platform.
    
Content: TechGrowth Solutions provides comprehensive digital marketing services including SEO optimization, PPC advertising, and social media marketing. We specialize in helping residential contractors scale from 1M to 5M in annual revenue.

Target Revenue Range: $1M-$3M

Available focus area tags: Sales, Marketing, Operations, Finance, Technology, HR, Customer Service, Leadership
Available revenue range tags: Under $500K, $500K-$1M, $1M-$3M, $3M-$5M, $5M-$10M, Over $10M
Available topic tags: Growth Strategy, Digital Marketing, Team Building, Process Automation, Cash Flow, Customer Acquisition, Pricing Strategy, Competitive Advantage

Please provide a JSON response with EXACTLY this structure:
{
  "tags": [
    {
      "name": "Marketing",
      "category": "focus_area",
      "confidence": 0.95,
      "reasoning": "Content heavily focuses on marketing services"
    },
    {
      "name": "$1M-$3M",
      "category": "revenue_range",
      "confidence": 0.9,
      "reasoning": "Explicitly targets this revenue range"
    },
    {
      "name": "Digital Marketing",
      "category": "topic",
      "confidence": 0.85,
      "reasoning": "Discusses digital marketing strategies"
    }
  ],
  "insights": {
    "key_themes": ["digital transformation", "revenue scaling"],
    "target_audience": "contractors in growth phase",
    "actionable_points": ["implement SEO strategy", "automate marketing"],
    "revenue_applicability": "$1M-$3M"
  },
  "confidence": 0.85
}

IMPORTANT: 
- Use ONLY the exact tag names provided above
- Include 3-5 relevant tags from different categories
- Confidence scores should be between 0.5 and 1.0
- Provide clear reasoning for each tag

IMPORTANT: Respond only with valid JSON, no additional text.`;

  console.log('🤖 Testing OpenAI directly...');
  console.log('📝 API Key:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business analyst specializing in contractor services and B2B content categorization. Always respond with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    console.log('\n📤 Raw AI Response:');
    console.log(completion.choices[0].message.content);

    console.log('\n📊 Parsed Response:');
    const parsed = JSON.parse(completion.choices[0].message.content);
    console.log(JSON.stringify(parsed, null, 2));

    console.log('\n✅ Tags found:', parsed.tags?.length || 0);
    if (parsed.tags?.length > 0) {
      parsed.tags.forEach(tag => {
        console.log(`  • ${tag.name} (${tag.category}) - Confidence: ${tag.confidence}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testOpenAI();