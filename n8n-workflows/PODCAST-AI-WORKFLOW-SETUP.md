# Podcast AI Processing Workflow Setup

## 📋 Quick Setup Steps

### 1. Import Development Workflow
1. Open n8n UI (http://localhost:5678)
2. Go to Workflows → Import from File
3. Select `podcast-ai-processing-dev.json`
4. Save and activate the workflow
5. Note the webhook URL: `http://localhost:5678/webhook/podcast-ai-processing-dev`

### 2. Import Production Workflow (when ready)
1. In n8n UI, import `podcast-ai-processing-production.json`
2. Save and activate the workflow
3. Production webhook URL: `https://n8n.srv918843.hstgr.cloud/webhook/podcast-ai-processing`

## 🔧 Configuration

### Backend Controller Setup
The podcast controller is already configured to trigger the webhook when:
- A new podcast is created with RSS feed URL or YouTube URL
- An existing podcast is updated with these URLs
- The podcast is marked as "pending" for AI processing

### Webhook Triggers
- **Development**: `http://localhost:5678/webhook/podcast-ai-processing-dev`
- **Production**: `https://n8n.srv918843.hstgr.cloud/webhook/podcast-ai-processing`

## 🧪 Testing the Workflow

### 1. Create a Test Podcast
```javascript
// Use test-podcast-analysis.js or test-podcast-youtube.js
node test-podcast-analysis.js
```

### 2. Check n8n Executions
1. Go to n8n UI → Executions
2. You should see the workflow triggered
3. Check for success/failure status

### 3. Verify Database Updates
```sql
-- Check podcast AI processing status
SELECT id, title, ai_processing_status, ai_summary, ai_tags
FROM podcasts
WHERE ai_processing_status IS NOT NULL
ORDER BY last_ai_analysis DESC;
```

## 🚀 Workflow Features

### What This Workflow Does:
1. **Receives webhook** when podcast is saved with URL
2. **Calls API endpoint** to process pending podcasts
3. **Processes podcasts** with:
   - YouTube transcript extraction (for video podcasts)
   - RSS feed parsing (for audio podcasts)
   - AI summary generation
   - Topic/tag extraction
4. **Updates database** with AI results
5. **Returns response** to webhook caller

### Supported Podcast Types:
- **Video Podcasts**: YouTube URLs (uses transcript API)
- **Audio Podcasts**: RSS feed URLs (parses feed metadata)

## 📊 Monitoring

### Check Processing Status:
```bash
# Local database
powershell -Command ".\quick-db.bat \"SELECT id, title, ai_processing_status FROM podcasts WHERE ai_processing_status = 'pending'\""

# Check completed
powershell -Command ".\quick-db.bat \"SELECT id, title, ai_processing_status, LEFT(ai_summary, 100) FROM podcasts WHERE ai_processing_status = 'completed'\""
```

### Common Issues:
- **Webhook not triggering**: Check n8n is running on port 5678
- **Processing fails**: Check podcast URL is valid
- **No AI summary**: May be due to transcript/RSS feed issues

## 🔄 Environment Management

### Development:
- Uses localhost endpoints
- Tagged with "dev"
- Webhook path has `-dev` suffix

### Production:
- Uses tpx.power100.io endpoints
- Tagged with "production"
- Clean webhook path (no suffix)

## ✅ Validation Checklist

Before activating workflows:
- [ ] n8n is running (port 5678 for dev)
- [ ] Backend server is running (port 5000)
- [ ] Database has AI columns (ai_processing_status, ai_summary, ai_tags)
- [ ] Triggers are applied to database
- [ ] Test with sample podcast

## 🎯 Success Indicators

When everything is working:
1. Creating/updating podcast with URL marks it as "pending"
2. n8n workflow triggers automatically
3. Processing completes within 30-60 seconds
4. Database shows "completed" status
5. AI summary and tags are populated