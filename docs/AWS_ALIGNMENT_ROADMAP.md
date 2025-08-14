# AWS Deployment Alignment Roadmap
## Current State Analysis & Required Changes

Based on analysis of your master branch, here's exactly what needs to be done to align The Power100 Experience with the AWS deployment strategy and prepare for AI-first data collection.

## 📊 Current State Assessment

### ✅ What You Already Have
1. **Complete Frontend** - Next.js app with all contractor/partner flows
2. **Working Backend** - Node.js/Express with SQLite database
3. **AI Coach Module** - Basic implementation at `/api/ai-coach`
4. **Authentication** - JWT-based auth for admin and partners
5. **Partner Onboarding** - Comprehensive 8-step form with 44+ fields
6. **PowerConfidence System** - Basic feedback loop and scoring system
7. **File Upload Capability** - Demo and document upload infrastructure

### ❌ What's Missing for AWS/AI Strategy
1. **No Data Collection Pipeline** - Interactions aren't being logged to persistent storage
2. **No Interaction Tracking** - API calls don't capture metadata for AI training
3. **No S3 Integration** - File uploads go to local disk, not cloud storage
4. **No Environment Configuration** - Hardcoded values instead of AWS-ready config
5. **No AI Conversation Logging** - AI Coach doesn't save conversations for training
6. **No Outcome Tracking** - Missing business outcome data (deals closed, satisfaction)
7. **No A/B Testing Framework** - Can't experiment with different approaches
8. **No Analytics Pipeline** - Data isn't structured for analysis
9. **No Multi-Stakeholder Validation** - Missing employee/customer feedback collection
10. **No Message Consistency Analysis** - Can't detect alignment across stakeholders
11. **No Demo Processing Pipeline** - Uploads exist but no analysis capability
12. **No CI/CD Pipeline** - Manual deployment instead of GitHub integration

## 🚀 Immediate Actions Required (Day 1-3)

### 1. Create Data Collection Infrastructure
**Priority: CRITICAL | Timeline: Day 1**

Create new file: `tpe-backend/src/services/dataCollectionService.js`
```javascript
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

class DataCollectionService {
  constructor() {
    this.bucketName = process.env.DATA_LAKE_BUCKET || 'tpe-data-lake';
    this.tableName = process.env.INTERACTIONS_TABLE || 'tpe-interactions';
  }

  async logInteraction(interaction) {
    // Add required metadata
    const enrichedInteraction = {
      interaction_id: uuidv4(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      app_version: process.env.APP_VERSION || '1.0.0',
      ...interaction
    };

    // Save to DynamoDB for quick access (when on AWS)
    if (process.env.USE_DYNAMODB === 'true') {
      await this.saveToDynamoDB(enrichedInteraction);
    }

    // Archive to S3 for long-term storage (when on AWS)
    if (process.env.USE_S3 === 'true') {
      await this.saveToS3(enrichedInteraction);
    }

    // Always save locally for development
    await this.saveLocally(enrichedInteraction);

    return enrichedInteraction.interaction_id;
  }

  async saveToDynamoDB(interaction) {
    const params = {
      TableName: this.tableName,
      Item: interaction
    };
    return dynamodb.put(params).promise();
  }

  async saveToS3(interaction) {
    const date = new Date();
    const key = `raw/year=${date.getFullYear()}/month=${String(date.getMonth() + 1).padStart(2, '0')}/day=${String(date.getDate()).padStart(2, '0')}/${interaction.interaction_id}.json`;
    
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: JSON.stringify(interaction),
      ContentType: 'application/json'
    };
    
    return s3.putObject(params).promise();
  }

  async saveLocally(interaction) {
    const fs = require('fs').promises;
    const path = require('path');
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '../../data-lake');
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save with date-based structure
    const date = new Date();
    const dateDir = path.join(dataDir, 
      `${date.getFullYear()}`,
      `${String(date.getMonth() + 1).padStart(2, '0')}`,
      `${String(date.getDate()).padStart(2, '0')}`
    );
    await fs.mkdir(dateDir, { recursive: true });
    
    const filePath = path.join(dateDir, `${interaction.interaction_id}.json`);
    await fs.writeFile(filePath, JSON.stringify(interaction, null, 2));
  }

  // Helper method to track API calls
  async trackAPICall(req, res, next) {
    const startTime = Date.now();
    
    // Capture original send method
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the interaction
      const interaction = {
        interaction_type: 'api_call',
        method: req.method,
        path: req.path,
        user_id: req.user?.id || 'anonymous',
        user_type: req.user?.role || 'unknown',
        request_body: req.body,
        response_status: res.statusCode,
        response_time_ms: Date.now() - startTime,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      };
      
      // Don't await to avoid blocking response
      this.logInteraction(interaction).catch(console.error);
      
      // Call original send
      originalSend.call(res, data);
    }.bind(this);
    
    next();
  }
}

module.exports = new DataCollectionService();
```

### 2. Update AI Coach to Log Conversations
**Priority: HIGH | Timeline: Day 1**

Update `tpe-backend/src/routes/aiCoachRoutes.js`:
```javascript
const dataCollectionService = require('../services/dataCollectionService');

// Add to chat endpoint
router.post('/chat', protect, checkAICoachAccess, async (req, res, next) => {
  try {
    const { message, conversationId, attachments } = req.body;
    const contractorId = req.user.id;
    
    // Track conversation start
    const interactionId = await dataCollectionService.logInteraction({
      interaction_type: 'ai_concierge',
      user_id: contractorId,
      user_type: 'contractor',
      conversation_id: conversationId || uuidv4(),
      ai_conversation: {
        messages: [{
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
          attachments: attachments
        }],
        model: 'gpt-4' // or whatever model you're using
      },
      metadata: {
        contractor_stage: req.contractor.pipeline_stage,
        has_partner_match: !!req.contractor.matched_partner_id
      }
    });

    // Your existing AI logic here...
    const aiResponse = await getAIResponse(message);
    
    // Track AI response
    await dataCollectionService.logInteraction({
      interaction_type: 'ai_concierge_response',
      parent_interaction_id: interactionId,
      user_id: contractorId,
      user_type: 'contractor',
      conversation_id: conversationId,
      ai_conversation: {
        messages: [{
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          tokens: aiResponse.usage?.total_tokens,
          cost: aiResponse.usage?.cost
        }]
      }
    });

    res.json({ 
      success: true, 
      response: aiResponse,
      interactionId 
    });
  } catch (error) {
    next(error);
  }
});
```

### 3. Add Outcome Tracking
**Priority: HIGH | Timeline: Day 2**

Create `tpe-backend/src/services/outcomeTrackingService.js`:
```javascript
const dataCollectionService = require('./dataCollectionService');

class OutcomeTrackingService {
  async trackPartnerMatch(contractorId, partnerId, matchScore, matchReasons) {
    return dataCollectionService.logInteraction({
      interaction_type: 'partner_match',
      user_id: contractorId,
      user_type: 'contractor',
      outcomes: {
        partner_matched: true,
        partner_id: partnerId,
        match_score: matchScore,
        match_reasons: matchReasons,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackDemoBooked(contractorId, partnerId, bookingDetails) {
    return dataCollectionService.logInteraction({
      interaction_type: 'demo_booking',
      user_id: contractorId,
      user_type: 'contractor',
      outcomes: {
        demo_booked: true,
        partner_id: partnerId,
        booking_date: bookingDetails.date,
        booking_time: bookingDetails.time,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackDealClosed(contractorId, partnerId, dealValue) {
    return dataCollectionService.logInteraction({
      interaction_type: 'deal_closed',
      user_id: contractorId,
      user_type: 'contractor',
      outcomes: {
        deal_closed: true,
        partner_id: partnerId,
        deal_value: dealValue,
        timestamp: new Date().toISOString()
      }
    });
  }

  async trackFeedback(userId, userType, feedback) {
    return dataCollectionService.logInteraction({
      interaction_type: 'feedback',
      user_id: userId,
      user_type: userType,
      feedback: {
        ...feedback,
        timestamp: new Date().toISOString()
      }
    });
  }
}

module.exports = new OutcomeTrackingService();
```

### 4. Environment Configuration
**Priority: CRITICAL | Timeline: Day 1**

Create `.env.development`:
```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3002

# Database
USE_SQLITE=true
DATABASE_URL=sqlite:./database.sqlite

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRE=30d

# AWS Configuration (prepare for future)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-key-here
DATA_LAKE_BUCKET=tpe-data-lake-dev
INTERACTIONS_TABLE=tpe-interactions-dev

# Feature Flags
USE_S3=false
USE_DYNAMODB=false
ENABLE_DATA_COLLECTION=true
ENABLE_OUTCOME_TRACKING=true

# AI Configuration
OPENAI_API_KEY=your-openai-key-here
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7

# Monitoring
LOG_LEVEL=debug
ENABLE_PERFORMANCE_MONITORING=true
```

Create `.env.production`:
```env
# Server Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://power100experience.com

# Database
USE_SQLITE=false
DATABASE_URL=postgresql://username:password@rds-endpoint:5432/tpe_production

# JWT
JWT_SECRET=${SECRET_MANAGER_JWT_SECRET}
JWT_EXPIRE=7d

# AWS Configuration
AWS_REGION=us-east-1
DATA_LAKE_BUCKET=tpe-data-lake-prod
INTERACTIONS_TABLE=tpe-interactions-prod

# Feature Flags
USE_S3=true
USE_DYNAMODB=true
ENABLE_DATA_COLLECTION=true
ENABLE_OUTCOME_TRACKING=true

# AI Configuration
OPENAI_API_KEY=${SECRET_MANAGER_OPENAI_KEY}
AI_MODEL=gpt-4
AI_TEMPERATURE=0.7

# Monitoring
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
```

### 5. Update Package.json
**Priority: HIGH | Timeline: Day 1**

Add AWS SDK and required packages to `tpe-backend/package.json`:
```json
{
  "dependencies": {
    "aws-sdk": "^2.1500.0",
    "uuid": "^9.0.1",
    "dotenv": "^16.3.1",
    "multer-s3": "^3.0.1",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0"
  },
  "scripts": {
    "start:dev": "NODE_ENV=development nodemon src/server.js",
    "start:prod": "NODE_ENV=production node src/server.js",
    "migrate:dev": "NODE_ENV=development node src/database/migrate.js",
    "migrate:prod": "NODE_ENV=production node src/database/migrate.js"
  }
}
```

## 🔮 PowerConfidence Multi-Stakeholder System
**Priority: HIGH | Timeline: Week 2-3**

### Required Components

#### 1. Employee Feedback Collection System
```javascript
// New endpoint: /api/partners/:id/employee-feedback
router.post('/partners/:id/employee-feedback', async (req, res) => {
  const { employeeEmail, employeeName, feedback } = req.body;
  
  // Store employee feedback
  await query(`
    INSERT INTO partner_employee_feedback 
    (partner_id, employee_name, employee_email, feedback_data, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [req.params.id, employeeName, employeeEmail, JSON.stringify(feedback), new Date()]);
  
  // Log for analysis
  await dataCollectionService.logInteraction({
    interaction_type: 'employee_feedback',
    partner_id: req.params.id,
    stakeholder_type: 'employee',
    feedback: feedback
  });
});
```

#### 2. Customer Reference System
```javascript
// New endpoint: /api/partners/:id/customer-reference
router.post('/partners/:id/customer-reference', async (req, res) => {
  const { customerName, customerEmail, referenceData } = req.body;
  
  // Store customer reference
  await query(`
    INSERT INTO partner_customer_references
    (partner_id, customer_name, customer_email, reference_data, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [req.params.id, customerName, customerEmail, JSON.stringify(referenceData), new Date()]);
});
```

#### 3. Message Consistency Analyzer
```javascript
// New service: messageConsistencyService.js
class MessageConsistencyService {
  async analyzeConsistency(partnerId) {
    // Gather all messaging sources
    const ceoMessage = await this.getCEOMessage(partnerId);
    const employeeMessages = await this.getEmployeeMessages(partnerId);
    const customerMessages = await this.getCustomerMessages(partnerId);
    const demoTranscripts = await this.getDemoTranscripts(partnerId);
    
    // Extract key claims
    const claims = {
      ceo: this.extractClaims(ceoMessage),
      employees: employeeMessages.map(m => this.extractClaims(m)),
      customers: customerMessages.map(m => this.extractClaims(m)),
      demos: demoTranscripts.map(d => this.extractClaims(d))
    };
    
    // Calculate consistency score
    return {
      score: this.calculateAlignmentScore(claims),
      discrepancies: this.findDiscrepancies(claims),
      recommendations: this.generateRecommendations(claims)
    };
  }
}
```

#### 4. Database Schema Updates
```sql
-- New tables for multi-stakeholder validation
CREATE TABLE partner_employee_feedback (
  id INTEGER PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),
  employee_name TEXT,
  employee_email TEXT,
  feedback_data TEXT, -- JSON
  consistency_score REAL,
  created_at TIMESTAMP
);

CREATE TABLE partner_customer_references (
  id INTEGER PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),
  customer_name TEXT,
  customer_email TEXT,
  reference_data TEXT, -- JSON
  validation_status TEXT,
  created_at TIMESTAMP
);

CREATE TABLE partner_message_consistency (
  id INTEGER PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),
  analysis_date TIMESTAMP,
  consistency_score REAL,
  key_discrepancies TEXT, -- JSON
  recommendations TEXT, -- JSON
  created_at TIMESTAMP
);
```

## 📋 Week 1 Implementation Checklist

### Day 1: Data Foundation
- [ ] Create `dataCollectionService.js`
- [ ] Set up environment variables
- [ ] Install AWS SDK packages
- [ ] Create local data-lake directory
- [ ] Test local data collection

### Day 2: Integration
- [ ] Update AI Coach routes with logging
- [ ] Add outcome tracking service
- [ ] Integrate tracking into partner matching
- [ ] Add tracking to demo booking
- [ ] Test end-to-end data flow

### Day 3: API Enhancement
- [ ] Add middleware for automatic API tracking
- [ ] Update all controllers with outcome tracking
- [ ] Add feedback collection endpoints
- [ ] Create data export endpoints
- [ ] Document all tracked events

### Day 4: Frontend Integration
- [ ] Add interaction tracking to frontend
- [ ] Track user navigation events
- [ ] Add performance monitoring
- [ ] Implement error tracking
- [ ] Add A/B testing framework

### Day 5: Testing & Validation
- [ ] Test data collection pipeline
- [ ] Verify data structure compliance
- [ ] Load test data collection
- [ ] Create data validation scripts
- [ ] Document data schema

## 🎯 Success Metrics

After implementing these changes, you should have:

1. **100% API Call Tracking** - Every API call logged with metadata
2. **Complete AI Conversations** - All AI interactions saved for training
3. **Business Outcome Data** - Partner matches, demos, deals tracked
4. **Ready for AWS** - Environment variables and services configured
5. **Local Data Lake** - All data saved locally before AWS deployment

## 🚀 Next Steps After Alignment

Once these changes are implemented:

1. **Deploy to AWS** following the AWS_DEPLOYMENT_STRATEGY.md
2. **Enable S3 and DynamoDB** by updating environment variables
3. **Set up data analytics** with Athena and QuickSight
4. **Begin collecting training data** for custom AI models
5. **Implement A/B testing** for optimization

## 📊 Data Collection Schema Reference

Every interaction MUST include:
```javascript
{
  // Required Fields
  interaction_id: "uuid",
  timestamp: "ISO-8601",
  interaction_type: "string",
  user_id: "string",
  user_type: "contractor|partner|admin",
  
  // Contextual Fields (when applicable)
  conversation_id: "uuid",
  session_id: "uuid",
  
  // Outcome Fields (when applicable)
  outcomes: {
    partner_matched: boolean,
    demo_booked: boolean,
    deal_closed: boolean,
    deal_value: number,
    satisfaction_score: number
  },
  
  // AI Fields (when applicable)
  ai_conversation: {
    messages: [],
    total_tokens: number,
    cost: number,
    model: string
  },
  
  // Metadata (always include)
  metadata: {
    app_version: string,
    environment: string,
    user_agent: string,
    ip_address: string
  }
}
```

## 🔧 Troubleshooting Guide

### Common Issues During Alignment

1. **AWS SDK Not Installing**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

2. **Data Not Saving Locally**
   - Check write permissions on data-lake directory
   - Verify environment variables are loaded

3. **API Tracking Breaking Responses**
   - Ensure middleware doesn't block async operations
   - Check error handling in tracking service

4. **Memory Issues with Large Data**
   - Implement streaming for large files
   - Use batch processing for bulk operations

## 📝 Notes

- Start with local data collection, AWS integration can come later
- Every single user interaction should be logged from Day 1
- Don't worry about data volume initially - storage is cheap
- Focus on data quality and completeness over optimization
- This data will become your competitive advantage

---

*This alignment roadmap is your bridge from current state to AWS-ready, AI-first architecture. Follow it step by step for smooth transition.*