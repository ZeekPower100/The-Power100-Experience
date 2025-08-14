# Testing Checklist - Data Collection Infrastructure

## 🎯 Testing Objectives

Verify that all data collection components work correctly and capture the right information at each step of the user journey.

## 📋 Pre-Testing Requirements

### 1. Environment Setup ✅
- [x] **Backend Environment**: `.env.development` file exists
- [x] **Data Collection Service**: `dataCollectionService.js` loads without errors
- [x] **Outcome Tracking Service**: `outcomeTrackingService.js` loads without errors
- [x] **AWS SDK**: Installed and configured for local fallback
- [x] **Ports Available**: 5000 (backend) and 3002 (frontend) are free

### 2. Services Status Check
```bash
# Verify services load properly
cd tpe-backend
node -e "
try {
  require('./src/services/dataCollectionService');
  console.log('✅ dataCollectionService: READY');
} catch (e) {
  console.log('❌ dataCollectionService:', e.message);
}

try {
  require('./src/services/outcomeTrackingService'); 
  console.log('✅ outcomeTrackingService: READY');
} catch (e) {
  console.log('❌ outcomeTrackingService:', e.message);
}
"
```

### 3. Database & Storage Setup
- [ ] **SQLite Database**: Created and seeded
- [ ] **Data Lake Directory**: `data-lake/` directory structure exists
- [ ] **Uploads Directory**: `uploads/` directory exists for AI Coach files

## 🧪 Testing Scenarios

### Test 1: Backend Server Startup ✅
**Objective**: Verify server starts with data collection enabled

```bash
cd tpe-backend
npm run dev:sqlite
```

**Expected Results**:
- ✅ Server starts on port 5000
- ✅ "ℹ️ Twilio credentials not configured - using development mode"
- ✅ "✅ SQLite database connected"
- ✅ "✅ Database schema created"
- ✅ No errors in data collection service

### Test 2: Basic API Call Tracking
**Objective**: Verify API calls are being logged

```bash
# Make test API call
curl http://localhost:5000/health

# Check if data was logged
ls -la tpe-backend/data-lake/raw/year=*/month=*/day=*/
```

**Expected Results**:
- ✅ JSON files created in data-lake
- ✅ Daily summary file exists
- ✅ Interaction contains: method, path, response_time, timestamp

### Test 3: Frontend Startup
**Objective**: Verify frontend connects to backend

```bash
cd tpe-front-end
npm run dev
```

**Expected Results**:
- ✅ Frontend starts on port 3002
- ✅ Can access http://localhost:3002
- ✅ No console errors related to API connections

### Test 4: Contractor Flow Data Tracking
**Objective**: Verify contractor onboarding is tracked

**Steps**:
1. Navigate to http://localhost:3002/contractorflow
2. Complete verification step
3. Complete focus areas step
4. Complete business profiling
5. View partner matches

**Data to Verify**:
- [ ] Each form submission logged as `api_call`
- [ ] Partner matching logged as `partner_match`
- [ ] Response times recorded
- [ ] User session tracking maintained
- [ ] Business outcomes captured

### Test 5: Partner Matching Outcome Tracking
**Objective**: Verify partner matches generate outcome data

**Steps**:
1. Complete contractor flow through matching
2. Check data-lake for outcome tracking

**Expected Data Structure**:
```json
{
  "interaction_type": "partner_match",
  "user_id": "contractor_id",
  "partner_id": "partner_id",
  "outcomes": {
    "partner_matched": true,
    "match_score": 85.5,
    "match_reasons": [...],
    "primary_match": true
  }
}
```

### Test 6: AI Coach Conversation Tracking
**Objective**: Verify AI conversations are captured with metadata

**Steps**:
1. Navigate to http://localhost:3002/ai-coach
2. Send a message to AI Coach
3. Rate the response
4. Check data tracking

**Expected Data**:
- [ ] AI conversation logged with messages array
- [ ] Token count estimated
- [ ] Cost calculated
- [ ] Response time recorded
- [ ] Feedback tracked when provided

### Test 7: Admin Dashboard Data Access
**Objective**: Verify admin can access data and it displays correctly

**Steps**:
1. Navigate to http://localhost:3002/admindashboard
2. Check various sections for data display
3. Verify no errors in console

**Expected Results**:
- [ ] Dashboard loads without errors
- [ ] Data displays correctly
- [ ] API calls for dashboard are tracked

## 📊 Data Validation Checks

### Check 1: Data Structure Validation
```bash
# Check a sample interaction file
cat tpe-backend/data-lake/raw/year=*/month=*/day=*/*.json | head -1 | jq .
```

**Required Fields**:
- `interaction_id` (UUID)
- `timestamp` (ISO-8601)
- `interaction_type`
- `user_id`
- `environment`
- `app_version`

### Check 2: Daily Summary Format
```bash
# Check daily summary is valid JSONL
head -5 tpe-backend/data-lake/raw/year=*/month=*/day=*/daily_summary.jsonl
```

**Validation**:
- Each line is valid JSON
- All interactions included
- No duplicates

### Check 3: Performance Impact
**Objective**: Verify data collection doesn't slow down API

```bash
# Test API response time
time curl http://localhost:5000/api/admin/stats
```

**Expected Results**:
- Response time < 500ms
- No noticeable performance degradation
- Data collection happens asynchronously

## 🚨 Troubleshooting Common Issues

### Issue 1: "Failed to fetch" errors
**Solution**: Check CORS configuration and frontend URL

### Issue 2: Data not saving
**Check**:
1. `ENABLE_DATA_COLLECTION=true` in environment
2. File permissions on data-lake directory
3. Disk space available

### Issue 3: Server won't start
**Solution**: Follow SERVER_TROUBLESHOOTING.md protocol

### Issue 4: AI Coach not tracking
**Check**:
1. AI Coach routes include tracking code
2. UUID package installed
3. No errors in console

## ✅ Testing Completion Criteria

**All tests pass when**:
- [ ] Backend starts without errors ✅
- [ ] Frontend connects successfully
- [ ] API calls create data files
- [ ] Contractor flow generates outcome data
- [ ] Partner matching creates match records
- [ ] AI conversations are tracked with metadata
- [ ] All data structures are valid JSON
- [ ] Performance remains acceptable (< 500ms API responses)
- [ ] No data collection errors in logs

## 📝 Test Results Template

```
Testing Date: ___________
Tester: ___________

✅ Pre-Requirements: PASS/FAIL
✅ Backend Startup: PASS/FAIL  
✅ API Call Tracking: PASS/FAIL
✅ Frontend Connection: PASS/FAIL
✅ Contractor Flow: PASS/FAIL
✅ Partner Matching: PASS/FAIL
✅ AI Coach Tracking: PASS/FAIL
✅ Data Validation: PASS/FAIL

Issues Found:
- 
- 
- 

Next Steps:
- 
- 
```

---

*Follow this checklist step-by-step to ensure all data collection components are working correctly before production deployment.*