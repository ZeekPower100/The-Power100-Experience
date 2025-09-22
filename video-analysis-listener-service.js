const { Client } = require('pg');
const axios = require('axios');

// Configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  port: process.env.DB_PORT || 5432
};

const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/trigger-video-analysis-dev';

class VideoAnalysisListener {
  constructor() {
    this.client = new Client(dbConfig);
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
  }

  async start() {
    console.log('🎥 Video Analysis Listener Service Starting...\n');
    console.log('Configuration:');
    console.log(`  Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    console.log(`  n8n Webhook: ${n8nWebhookUrl}`);
    console.log('=' .repeat(60) + '\n');

    await this.connect();
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to database');

      this.reconnectAttempts = 0;

      // Setup event listeners
      this.client.on('notification', this.handleNotification.bind(this));
      this.client.on('error', this.handleError.bind(this));
      this.client.on('end', this.handleDisconnect.bind(this));

      // Start listening
      await this.client.query('LISTEN video_analysis_needed');
      console.log('👂 Listening for video analysis notifications...\n');

      // Heartbeat to keep connection alive
      this.heartbeatInterval = setInterval(async () => {
        try {
          await this.client.query('SELECT 1');
        } catch (error) {
          console.error('❌ Heartbeat failed:', error.message);
          this.reconnect();
        }
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      this.reconnect();
    }
  }

  async handleNotification(msg) {
    if (msg.channel !== 'video_analysis_needed') return;

    const data = JSON.parse(msg.payload);
    const timestamp = new Date().toISOString();

    console.log(`\n[${timestamp}] 🔔 VIDEO ANALYSIS TRIGGERED`);
    console.log('  Source Table:', data.table);
    console.log('  Operation:', data.operation);
    console.log('  Video URL:', data.video_url);

    if (data.partner_id) {
      console.log('  Partner ID:', data.partner_id);
    } else if (data.entity_id) {
      console.log('  Entity ID:', data.entity_id);
      console.log('  Entity Type:', data.entity_type);
    }

    // Call n8n webhook
    try {
      console.log('  📡 Calling n8n webhook...');

      const webhookData = {
        video_url: data.video_url,
        partner_id: data.partner_id || data.entity_id,
        analysis_type: 'demo_analysis',
        triggered_by: 'database_listener',
        source_table: data.table,
        timestamp: timestamp
      };

      const response = await axios.post(n8nWebhookUrl, webhookData, {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('  ✅ Analysis triggered successfully');

      if (response.data?.quality_score !== undefined) {
        console.log(`  📊 Quality Score: ${response.data.quality_score}/100`);
      }

    } catch (error) {
      console.error('  ❌ Failed to trigger analysis:', error.message);

      if (error.response) {
        console.error('     Response:', error.response.status, error.response.data);
      }

      // TODO: Implement retry logic or dead letter queue
      // For now, just log the failure
      this.logFailedAnalysis(data, error);
    }
  }

  async logFailedAnalysis(data, error) {
    try {
      // Log to a failure tracking table (optional)
      await this.client.query(`
        INSERT INTO video_analysis_failures (
          video_url,
          entity_id,
          entity_type,
          error_message,
          payload,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        data.video_url,
        data.partner_id || data.entity_id,
        data.entity_type || 'partner',
        error.message,
        JSON.stringify(data)
      ]);
    } catch (logError) {
      // Table might not exist, just log to console
      console.error('  ⚠️ Could not log failure to database');
    }
  }

  handleError(error) {
    console.error('❌ Database error:', error.message);
    this.reconnect();
  }

  handleDisconnect() {
    console.log('⚠️ Database connection lost');
    this.reconnect();
  }

  async reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Exiting...');
      process.exit(1);
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    // Clean up old connection
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Wait before reconnecting
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    // Create new client and connect
    this.client = new Client(dbConfig);
    await this.connect();
  }

  async stop() {
    console.log('\n🛑 Shutting down listener service...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    await this.client.end();
    console.log('✅ Service stopped');
    process.exit(0);
  }
}

// Start the service
const listener = new VideoAnalysisListener();

// Handle graceful shutdown
process.on('SIGINT', () => listener.stop());
process.on('SIGTERM', () => listener.stop());

// Start listening
listener.start().catch(error => {
  console.error('❌ Failed to start listener:', error);
  process.exit(1);
});

/*
 * USAGE:
 *
 * 1. Run as standalone service:
 *    node video-analysis-listener-service.js
 *
 * 2. Run with PM2 (production):
 *    pm2 start video-analysis-listener-service.js --name "video-listener"
 *
 * 3. Environment variables:
 *    DB_HOST=localhost
 *    DB_NAME=tpedb
 *    DB_USER=postgres
 *    DB_PASSWORD=TPXP0stgres!!
 *    N8N_WEBHOOK_URL=http://localhost:5678/webhook/trigger-video-analysis-dev
 *
 * This service will:
 * - Listen for database notifications when video URLs are added
 * - Automatically call the n8n webhook to trigger analysis
 * - Reconnect if database connection is lost
 * - Log failures for retry processing
 */