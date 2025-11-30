/**
 * Seed: PCR Question Library
 *
 * Populates metric categories and pre-vetted questions for PowerCard surveys.
 * AI selects the best question based on context; admins can add custom questions.
 *
 * Usage: node tpe-database/seeds/seed_pcr_question_library.js
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('../../tpe-backend/src/config/database');

const CATEGORIES = [
  {
    name: 'closing_rate',
    display_name: 'Closing Rate',
    description: 'Measures sales conversion effectiveness and deal closure improvements',
    icon: 'target'
  },
  {
    name: 'cancellation_reduction',
    display_name: 'Cancellation Reduction',
    description: 'Tracks customer retention and reduced cancellation rates',
    icon: 'shield-check'
  },
  {
    name: 'customer_experience',
    display_name: 'Customer Experience',
    description: 'Measures overall customer satisfaction and service quality',
    icon: 'heart'
  },
  {
    name: 'lead_quality',
    display_name: 'Lead Quality',
    description: 'Evaluates the quality and conversion potential of generated leads',
    icon: 'filter'
  },
  {
    name: 'response_time',
    display_name: 'Response Time',
    description: 'Measures speed and efficiency of service delivery',
    icon: 'clock'
  },
  {
    name: 'roi_value',
    display_name: 'ROI & Value',
    description: 'Assesses return on investment and perceived value',
    icon: 'trending-up'
  },
  {
    name: 'communication',
    display_name: 'Communication',
    description: 'Evaluates clarity, frequency, and quality of communication',
    icon: 'message-circle'
  },
  {
    name: 'professionalism',
    display_name: 'Professionalism',
    description: 'Measures professional conduct, reliability, and expertise',
    icon: 'briefcase'
  },
  {
    name: 'technical_quality',
    display_name: 'Technical Quality',
    description: 'Evaluates workmanship, accuracy, and technical excellence',
    icon: 'wrench'
  },
  {
    name: 'business_growth',
    display_name: 'Business Growth',
    description: 'Measures impact on overall business growth and scaling',
    icon: 'bar-chart'
  }
];

const QUESTIONS = {
  closing_rate: [
    {
      question_text: 'Since partnering with {partner}, how has your ability to convert leads into paying customers changed?',
      question_type: 'impact',
      scale_low_label: 'Significantly Decreased',
      scale_high_label: 'Significantly Increased',
      context_keywords: ['sales', 'conversion', 'leads', 'closing'],
      is_default: true
    },
    {
      question_text: 'How confident are you in your sales closing process after implementing {partner}\'s strategies?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Extremely Confident',
      context_keywords: ['confidence', 'sales process', 'strategy']
    },
    {
      question_text: 'How effective has {partner} been in helping you overcome common sales objections?',
      question_type: 'effectiveness',
      scale_low_label: 'Not Effective',
      scale_high_label: 'Extremely Effective',
      context_keywords: ['objections', 'sales', 'training']
    },
    {
      question_text: 'Rate the impact {partner} has had on your average deal size and close rate.',
      question_type: 'impact',
      scale_low_label: 'No Impact',
      scale_high_label: 'Transformative Impact',
      context_keywords: ['deal size', 'close rate', 'revenue']
    }
  ],

  cancellation_reduction: [
    {
      question_text: 'How has working with {partner} affected your customer retention and cancellation rates?',
      question_type: 'impact',
      scale_low_label: 'More Cancellations',
      scale_high_label: 'Significantly Fewer',
      context_keywords: ['retention', 'cancellation', 'churn'],
      is_default: true
    },
    {
      question_text: 'How confident are you in preventing customer cancellations using {partner}\'s methods?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Highly Confident',
      context_keywords: ['prevent', 'methods', 'system']
    },
    {
      question_text: 'Rate the effectiveness of {partner}\'s strategies for keeping customers engaged long-term.',
      question_type: 'effectiveness',
      scale_low_label: 'Not Effective',
      scale_high_label: 'Extremely Effective',
      context_keywords: ['engagement', 'long-term', 'loyalty']
    },
    {
      question_text: 'How likely are your customers to stay with you after implementing {partner}\'s retention strategies?',
      question_type: 'likelihood',
      scale_low_label: 'Much Less Likely',
      scale_high_label: 'Much More Likely',
      context_keywords: ['stay', 'retention', 'strategies']
    }
  ],

  customer_experience: [
    {
      question_text: 'How has partnering with {partner} improved the overall experience you deliver to your customers?',
      question_type: 'impact',
      scale_low_label: 'No Improvement',
      scale_high_label: 'Dramatically Improved',
      context_keywords: ['experience', 'service', 'satisfaction'],
      is_default: true
    },
    {
      question_text: 'Rate your satisfaction with how {partner} has helped elevate your customer service standards.',
      question_type: 'satisfaction',
      scale_low_label: 'Very Dissatisfied',
      scale_high_label: 'Very Satisfied',
      context_keywords: ['service standards', 'quality', 'satisfaction']
    },
    {
      question_text: 'How confident are you in consistently delivering excellent customer experiences thanks to {partner}?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Extremely Confident',
      context_keywords: ['consistent', 'excellence', 'delivery']
    },
    {
      question_text: 'How likely are your customers to recommend your services based on improvements from {partner}?',
      question_type: 'likelihood',
      scale_low_label: 'Very Unlikely',
      scale_high_label: 'Extremely Likely',
      context_keywords: ['recommend', 'referral', 'NPS']
    }
  ],

  lead_quality: [
    {
      question_text: 'How has the quality of leads you receive changed since working with {partner}?',
      question_type: 'impact',
      scale_low_label: 'Much Worse Quality',
      scale_high_label: 'Much Better Quality',
      context_keywords: ['leads', 'quality', 'marketing'],
      is_default: true
    },
    {
      question_text: 'Rate the conversion potential of leads generated through {partner}\'s services.',
      question_type: 'effectiveness',
      scale_low_label: 'Very Low Potential',
      scale_high_label: 'Very High Potential',
      context_keywords: ['conversion', 'potential', 'generated']
    },
    {
      question_text: 'How satisfied are you with the targeting and relevance of leads from {partner}?',
      question_type: 'satisfaction',
      scale_low_label: 'Very Dissatisfied',
      scale_high_label: 'Very Satisfied',
      context_keywords: ['targeting', 'relevance', 'fit']
    }
  ],

  response_time: [
    {
      question_text: 'How has {partner} impacted your team\'s response time to customer inquiries?',
      question_type: 'impact',
      scale_low_label: 'Much Slower',
      scale_high_label: 'Much Faster',
      context_keywords: ['response', 'speed', 'efficiency'],
      is_default: true
    },
    {
      question_text: 'Rate how effective {partner}\'s systems are for improving your operational speed.',
      question_type: 'effectiveness',
      scale_low_label: 'Not Effective',
      scale_high_label: 'Extremely Effective',
      context_keywords: ['systems', 'operations', 'automation']
    },
    {
      question_text: 'How confident are you in meeting customer response time expectations with {partner}\'s help?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Extremely Confident',
      context_keywords: ['expectations', 'meeting', 'standards']
    }
  ],

  roi_value: [
    {
      question_text: 'How would you rate the return on investment from your partnership with {partner}?',
      question_type: 'satisfaction',
      scale_low_label: 'Poor ROI',
      scale_high_label: 'Excellent ROI',
      context_keywords: ['ROI', 'investment', 'value'],
      is_default: true
    },
    {
      question_text: 'Compared to the cost, how much value has {partner} delivered to your business?',
      question_type: 'effectiveness',
      scale_low_label: 'Far Below Cost',
      scale_high_label: 'Far Exceeds Cost',
      context_keywords: ['cost', 'value', 'worth']
    },
    {
      question_text: 'How confident are you that {partner} will continue delivering strong returns?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Highly Confident',
      context_keywords: ['future', 'returns', 'continued']
    }
  ],

  communication: [
    {
      question_text: 'How would you rate the quality and clarity of communication from {partner}?',
      question_type: 'satisfaction',
      scale_low_label: 'Very Poor',
      scale_high_label: 'Excellent',
      context_keywords: ['communication', 'clarity', 'updates'],
      is_default: true
    },
    {
      question_text: 'How responsive is {partner} when you have questions or concerns?',
      question_type: 'effectiveness',
      scale_low_label: 'Very Unresponsive',
      scale_high_label: 'Extremely Responsive',
      context_keywords: ['responsive', 'questions', 'support']
    },
    {
      question_text: 'How confident are you that {partner} keeps you informed about important matters?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Completely Confident',
      context_keywords: ['informed', 'updates', 'proactive']
    }
  ],

  professionalism: [
    {
      question_text: 'How would you rate {partner}\'s professionalism and reliability in your partnership?',
      question_type: 'satisfaction',
      scale_low_label: 'Very Unprofessional',
      scale_high_label: 'Highly Professional',
      context_keywords: ['professional', 'reliable', 'trustworthy'],
      is_default: true
    },
    {
      question_text: 'How confident are you in {partner}\'s ability to deliver on their commitments?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Completely Confident',
      context_keywords: ['commitments', 'promises', 'delivery']
    },
    {
      question_text: 'Rate how well {partner} represents your brand when interacting with your customers.',
      question_type: 'effectiveness',
      scale_low_label: 'Poorly',
      scale_high_label: 'Excellently',
      context_keywords: ['brand', 'representation', 'image']
    }
  ],

  technical_quality: [
    {
      question_text: 'How would you rate the technical quality and workmanship delivered by {partner}?',
      question_type: 'satisfaction',
      scale_low_label: 'Very Poor Quality',
      scale_high_label: 'Exceptional Quality',
      context_keywords: ['quality', 'workmanship', 'technical'],
      is_default: true
    },
    {
      question_text: 'How effective is {partner} at solving complex technical challenges?',
      question_type: 'effectiveness',
      scale_low_label: 'Not Effective',
      scale_high_label: 'Extremely Effective',
      context_keywords: ['technical', 'challenges', 'solutions']
    },
    {
      question_text: 'How confident are you in the accuracy and reliability of {partner}\'s technical work?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Completely Confident',
      context_keywords: ['accuracy', 'reliability', 'precision']
    }
  ],

  business_growth: [
    {
      question_text: 'How has {partner} contributed to your overall business growth and scaling?',
      question_type: 'impact',
      scale_low_label: 'Hindered Growth',
      scale_high_label: 'Accelerated Growth',
      context_keywords: ['growth', 'scaling', 'expansion'],
      is_default: true
    },
    {
      question_text: 'Rate the impact {partner} has had on your revenue and profitability.',
      question_type: 'impact',
      scale_low_label: 'Negative Impact',
      scale_high_label: 'Significant Positive Impact',
      context_keywords: ['revenue', 'profit', 'financial']
    },
    {
      question_text: 'How confident are you that {partner} will help you reach your growth goals?',
      question_type: 'confidence',
      scale_low_label: 'Not Confident',
      scale_high_label: 'Extremely Confident',
      context_keywords: ['goals', 'targets', 'future']
    }
  ]
};

async function seed() {
  console.log('🌱 Seeding PCR Question Library...\n');

  try {
    // 1. Insert categories
    console.log('📁 Creating metric categories...');
    const categoryIds = {};

    for (const cat of CATEGORIES) {
      const result = await query(`
        INSERT INTO pcr_metric_categories (name, display_name, description, icon)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          updated_at = NOW()
        RETURNING id
      `, [cat.name, cat.display_name, cat.description, cat.icon]);

      categoryIds[cat.name] = result.rows[0].id;
      console.log(`  ✅ ${cat.display_name} (ID: ${categoryIds[cat.name]})`);
    }

    // 2. Insert questions
    console.log('\n📝 Adding questions to library...');
    let totalQuestions = 0;

    for (const [categoryName, questions] of Object.entries(QUESTIONS)) {
      const categoryId = categoryIds[categoryName];

      for (const q of questions) {
        await query(`
          INSERT INTO pcr_question_library (
            metric_category_id, question_text, question_type,
            scale_low_label, scale_high_label, context_keywords,
            is_default, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'system')
          ON CONFLICT DO NOTHING
        `, [
          categoryId,
          q.question_text,
          q.question_type,
          q.scale_low_label,
          q.scale_high_label,
          q.context_keywords,
          q.is_default || false
        ]);
        totalQuestions++;
      }

      console.log(`  ✅ ${categoryName}: ${questions.length} questions`);
    }

    console.log(`\n🎉 Seeding complete!`);
    console.log(`   Categories: ${CATEGORIES.length}`);
    console.log(`   Questions: ${totalQuestions}`);

  } catch (error) {
    console.error('❌ Seeding error:', error.message);
    throw error;
  }

  process.exit(0);
}

seed();
