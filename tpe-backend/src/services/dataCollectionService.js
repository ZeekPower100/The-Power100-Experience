const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class DataCollectionService {
  constructor() {
    // AWS configuration (will be used when deployed to AWS)
    this.bucketName = process.env.DATA_LAKE_BUCKET || 'tpe-data-lake';
    this.tableName = process.env.INTERACTIONS_TABLE || 'tpe-interactions';
    
    // Feature flags
    this.enableDataCollection = process.env.ENABLE_DATA_COLLECTION !== 'false';
    this.useS3 = process.env.USE_S3 === 'true';
    this.useDynamoDB = process.env.USE_DYNAMODB === 'true';
    
    // Initialize AWS services if needed
    if (this.useS3 || this.useDynamoDB) {
      this.initializeAWS();
    }
  }

  initializeAWS() {
    try {
      const AWS = require('aws-sdk');
      
      // Configure AWS SDK
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      });

      if (this.useS3) {
        this.s3 = new AWS.S3();
      }
      
      if (this.useDynamoDB) {
        this.dynamodb = new AWS.DynamoDB.DocumentClient();
      }
    } catch (error) {
      console.warn('AWS SDK not initialized:', error.message);
      console.log('Falling back to local data storage');
      this.useS3 = false;
      this.useDynamoDB = false;
    }
  }

  async logInteraction(interaction) {
    if (!this.enableDataCollection) {
      return null;
    }

    try {
      // Add required metadata
      const enrichedInteraction = {
        interaction_id: uuidv4(),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        app_version: process.env.APP_VERSION || '1.0.0',
        ...interaction
      };

      // Add session tracking if available
      if (interaction.user_id) {
        enrichedInteraction.session_id = enrichedInteraction.session_id || uuidv4();
      }

      // Save to different storage systems based on configuration
      const savePromises = [];

      // Always save locally in development
      if (process.env.NODE_ENV !== 'production' || !this.useS3) {
        savePromises.push(this.saveLocally(enrichedInteraction));
      }

      // Save to DynamoDB if configured
      if (this.useDynamoDB) {
        savePromises.push(this.saveToDynamoDB(enrichedInteraction));
      }

      // Archive to S3 if configured
      if (this.useS3) {
        savePromises.push(this.saveToS3(enrichedInteraction));
      }

      // Execute all saves in parallel
      await Promise.all(savePromises);

      return enrichedInteraction.interaction_id;
    } catch (error) {
      console.error('Error logging interaction:', error);
      // Don't throw - we don't want data collection failures to break the app
      return null;
    }
  }

  async saveToDynamoDB(interaction) {
    if (!this.dynamodb) return;

    const params = {
      TableName: this.tableName,
      Item: interaction
    };
    
    try {
      await this.dynamodb.put(params).promise();
      console.log(`Saved interaction ${interaction.interaction_id} to DynamoDB`);
    } catch (error) {
      console.error('DynamoDB save error:', error);
      throw error;
    }
  }

  async saveToS3(interaction) {
    if (!this.s3) return;

    const date = new Date();
    const key = `raw/year=${date.getFullYear()}/month=${String(date.getMonth() + 1).padStart(2, '0')}/day=${String(date.getDate()).padStart(2, '0')}/hour=${String(date.getHours()).padStart(2, '0')}/${interaction.interaction_id}.json`;
    
    const params = {
      Bucket: this.bucketName,
      Key: key,
      Body: JSON.stringify(interaction, null, 2),
      ContentType: 'application/json',
      Metadata: {
        'interaction-type': interaction.interaction_type || 'unknown',
        'user-type': interaction.user_type || 'unknown'
      }
    };
    
    try {
      await this.s3.putObject(params).promise();
      console.log(`Saved interaction ${interaction.interaction_id} to S3: ${key}`);
    } catch (error) {
      console.error('S3 save error:', error);
      throw error;
    }
  }

  async saveLocally(interaction) {
    try {
      // Create data directory structure
      const dataDir = path.join(__dirname, '../../../data-lake');
      const date = new Date();
      const dateDir = path.join(
        dataDir,
        'raw',
        `year=${date.getFullYear()}`,
        `month=${String(date.getMonth() + 1).padStart(2, '0')}`,
        `day=${String(date.getDate()).padStart(2, '0')}`
      );
      
      // Ensure directory exists
      await fs.mkdir(dateDir, { recursive: true });
      
      // Save interaction
      const filePath = path.join(dateDir, `${interaction.interaction_id}.json`);
      await fs.writeFile(filePath, JSON.stringify(interaction, null, 2));
      
      // Also save to a daily summary file for easier analysis
      const summaryPath = path.join(dateDir, 'daily_summary.jsonl');
      const summaryLine = JSON.stringify(interaction) + '\n';
      await fs.appendFile(summaryPath, summaryLine);
      
      console.log(`Saved interaction ${interaction.interaction_id} locally`);
    } catch (error) {
      console.error('Local save error:', error);
      throw error;
    }
  }

  // Middleware for Express to automatically track API calls
  trackAPICall() {
    return async (req, res, next) => {
      // Skip health checks and static assets
      if (req.path === '/health' || req.path.startsWith('/static')) {
        return next();
      }

      const startTime = Date.now();
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Function to log the interaction
      const logInteraction = async (body) => {
        try {
          const interaction = {
            interaction_type: 'api_call',
            method: req.method,
            path: req.path,
            route: req.route?.path,
            user_id: req.user?.id || 'anonymous',
            user_type: req.user?.role || 'unknown',
            request_body: this.sanitizeRequestBody(req.body),
            query_params: req.query,
            response_status: res.statusCode,
            response_time_ms: Date.now() - startTime,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            referrer: req.get('referrer'),
            metadata: {
              headers: this.sanitizeHeaders(req.headers),
              session_id: req.session?.id
            }
          };
          
          // Don't await to avoid blocking response
          this.logInteraction(interaction).catch(console.error);
        } catch (error) {
          console.error('Error tracking API call:', error);
        }
      };

      // Override send method
      res.send = function(body) {
        logInteraction(body);
        originalSend.call(this, body);
      };

      // Override json method
      res.json = function(body) {
        logInteraction(body);
        originalJson.call(this, body);
      };
      
      next();
    };
  }

  // Helper to remove sensitive data from request body
  sanitizeRequestBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'api_key', 'credit_card'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  // Helper to remove sensitive headers
  sanitizeHeaders(headers) {
    if (!headers) return null;
    
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  // Track specific business outcomes
  async trackOutcome(outcomeType, data) {
    return this.logInteraction({
      interaction_type: 'business_outcome',
      outcome_type: outcomeType,
      ...data,
      metadata: {
        ...data.metadata,
        tracked_at: new Date().toISOString()
      }
    });
  }

  // Track AI conversations
  async trackAIConversation(conversationData) {
    return this.logInteraction({
      interaction_type: 'ai_conversation',
      ...conversationData,
      ai_metadata: {
        model: process.env.AI_MODEL || 'gpt-4',
        temperature: process.env.AI_TEMPERATURE || 0.7,
        ...conversationData.ai_metadata
      }
    });
  }

  // Track partner validation data
  async trackPartnerValidation(validationType, data) {
    return this.logInteraction({
      interaction_type: 'partner_validation',
      validation_type: validationType,
      ...data
    });
  }

  // Track feedback
  async trackFeedback(feedbackData) {
    return this.logInteraction({
      interaction_type: 'feedback',
      ...feedbackData,
      feedback_metadata: {
        collection_method: feedbackData.collection_method || 'web_form',
        survey_version: feedbackData.survey_version || 'v1',
        ...feedbackData.feedback_metadata
      }
    });
  }

  // Get interaction by ID (for debugging/analysis)
  async getInteraction(interactionId) {
    // Try to load from local storage first
    try {
      const dataDir = path.join(__dirname, '../../../data-lake');
      const files = await this.findInteractionFile(dataDir, interactionId);
      
      if (files.length > 0) {
        const content = await fs.readFile(files[0], 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Error retrieving interaction:', error);
    }
    
    return null;
  }

  // Helper to find interaction file
  async findInteractionFile(dir, interactionId, files = []) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await this.findInteractionFile(fullPath, interactionId, files);
      } else if (entry.name === `${interactionId}.json`) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Get daily summary
  async getDailySummary(date = new Date()) {
    try {
      const dataDir = path.join(__dirname, '../../../data-lake');
      const summaryPath = path.join(
        dataDir,
        'raw',
        `year=${date.getFullYear()}`,
        `month=${String(date.getMonth() + 1).padStart(2, '0')}`,
        `day=${String(date.getDate()).padStart(2, '0')}`,
        'daily_summary.jsonl'
      );
      
      const content = await fs.readFile(summaryPath, 'utf8');
      const lines = content.trim().split('\n');
      return lines.map(line => JSON.parse(line));
    } catch (error) {
      console.error('Error reading daily summary:', error);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new DataCollectionService();