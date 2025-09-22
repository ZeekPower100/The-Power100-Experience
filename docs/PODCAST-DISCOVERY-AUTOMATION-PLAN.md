# Podcast Discovery & Outreach Automation Plan

## 🎯 Vision
Automatically discover industry-relevant podcasts, analyze them with AI, then engage hosts via GHL for form completion and relationship building.

## 📋 Current State (What We Have)
- ✅ Podcast AI analysis pipeline (RSS + YouTube)
- ✅ Transcript extraction (YouTube/Whisper)
- ✅ n8n automation workflows
- ✅ GHL integration via n8n (used for partners)
- ✅ SendGrid email capability
- ✅ Database structure for podcasts
- ✅ PCR scoring system

## 🚀 Proposed Enhancement Flow

### 1. Discovery Phase
```
Search APIs (Listen Notes, Apple, Spotify)
→ Find "home improvement", "contractor", etc. podcasts
→ Extract RSS/YouTube URLs
→ Queue for analysis
```

### 2. Analysis & Extraction
```
RSS/YouTube URL → AI Analysis
Extracts:
- Basic info (title, host, description)
- Contact info (email from show notes, LinkedIn from descriptions)
- Content quality metrics
- Target audience alignment
- Subscriber counts (if mentioned)
```

### 3. Outreach Campaign (via GHL)
```
n8n → GHL: Create contact with podcast host info
→ Trigger campaign: "Your podcast was featured on TPX"
→ Send pre-filled form link
→ Track engagement (opens, clicks, responses)
→ Follow-up sequence if no response
```

### 4. Scoring & Updates
```
Response received → Update database
→ Mark podcast as "verified"
→ Update PCR score based on:
  - Response time
  - Completeness
  - Engagement quality
```

## 💡 Key Benefits
1. **Rapid Library Building**: Discover and catalog 100s of podcasts automatically
2. **Warm Outreach**: "We featured you" vs cold pitch
3. **PCR Data Collection**: Track host responsiveness and engagement
4. **Quality Verification**: Hosts verify/correct AI-extracted data

## 🛠️ Implementation Requirements

### New Components Needed:
1. **Podcast Discovery Service**
   - Listen Notes API integration
   - Search by industry/keywords
   - ~1 day

2. **Enhanced Extraction**
   - Email/LinkedIn regex patterns
   - AI prompt for contact extraction
   - ~0.5 day

3. **GHL Campaign Setup**
   - Create "Podcast Featured" campaign
   - Email templates with merge fields
   - Follow-up sequence
   - ~0.5 day

4. **n8n Workflow**
   - Connect discovery → analysis → GHL
   - Handle form responses
   - Update PCR scores
   - ~1 day

### Database Additions:
```sql
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS
  discovery_source VARCHAR(50),        -- 'manual', 'api_search', 'user_submit'
  discovery_date TIMESTAMP,
  outreach_status VARCHAR(50),         -- 'pending', 'sent', 'responded', 'verified'
  outreach_sent_date TIMESTAMP,
  outreach_response_date TIMESTAMP,
  pcr_responsiveness_score INTEGER,    -- 0-100 based on response time/quality
  host_verified BOOLEAN DEFAULT FALSE;
```

## 📊 Success Metrics
- Number of podcasts discovered/week
- Response rate to outreach (target: 30%+)
- Time to response (for PCR scoring)
- Form completion rate
- Quality of verified data vs AI-extracted

## ⏱️ Time Estimate
**Total: 2-3 days** to implement full discovery → outreach → verification loop

## 🔄 Future Enhancements
1. Auto-tag podcasts by contractor relevance score
2. Suggest podcast guests from TPX partners
3. Track which podcasts drive contractor engagement
4. Create "Podcast of the Month" features
5. Build relationships for TPX guest appearances

## 📝 Notes
- Leverage existing GHL patterns from partner workflows
- Use "featured" positioning to increase response rates
- Can start with manual discovery, add APIs later
- PCR scoring creates valuable host engagement data

---

*This enhancement would transform podcast management from manual submission to proactive discovery and engagement, while building valuable relationships in the podcast ecosystem.*