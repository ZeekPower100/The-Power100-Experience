# GHL Contact Sync Setup Guide

## 🎯 Overview
This guide helps you set up the n8n workflow to sync TPE contacts (contractors, partners, employees) to Go High Level (GHL).

## 📋 Prerequisites
1. ✅ TPE Backend running with `/api/ghl-sync/contacts` endpoint
2. ✅ n8n instance configured with MCP server 
3. 🔧 GHL API key with contacts permission
4. 🔧 GHL location/agency setup

## 🚀 Quick Setup

### Step 1: Import n8n Workflow
1. Open your n8n instance
2. Import the workflow: `n8n-workflows/tpe-to-ghl-http-sync.json`
3. The workflow includes 5 nodes:
   - **Manual Trigger** → **Fetch TPE Contacts** → **Process Contacts** → **Sync to GHL** → **Summarize Results**

### Step 2: Configure GHL API Key
1. Get your GHL API key from: **Settings → Integrations → API Keys**
2. Update the "3. Sync to GHL" node:
   ```
   Authorization: Bearer YOUR_GHL_API_KEY_HERE
   ```
3. Make sure the API key has **Contacts** permission

### Step 3: Update GHL Endpoint (if needed)
The workflow uses the standard GHL endpoint:
```
https://rest.gohighlevel.com/v1/contacts/
```

If you need a different endpoint or version, update the URL in the "3. Sync to GHL" node.

### Step 4: Test the Sync
1. Click "Execute Workflow" (manual trigger)
2. Monitor the execution log
3. Check GHL for imported contacts

## 📊 What Gets Synced

### Contact Data
- ✅ **Basic Info**: Name, email, phone, company
- ✅ **Tags**: `tpe-contractor`, `customer`, `stage-*`, `revenue-*`, etc.
- ✅ **Custom Fields**: TPE ID, contact type, revenue, team size, focus areas, etc.

### Contact Types
- **Contractors** (46): Tagged as `tpe-contractor`, `customer`
- **Partners** (4): Tagged as `tpe-partner`, `strategic-partner`, `ceo`  
- **Employees** (0): Tagged as `tpe-partner-employee`, role-specific tags

## 🔄 Workflow Details

### Node 1: Manual Trigger
- Starts the sync process manually
- Can be replaced with webhook/schedule trigger later

### Node 2: Fetch TPE Contacts  
- Calls: `GET http://localhost:5000/api/ghl-sync/contacts`
- Uses JWT token for authentication
- Returns formatted contact data with tags and custom fields

### Node 3: Process Contacts
- Splits contacts into individual items for processing
- Cleans phone numbers for GHL format
- Formats custom fields and tags

### Node 4: Sync to GHL
- **Method**: POST to GHL contacts API
- **Batching**: 10 contacts per batch, 1 second intervals
- **Error Handling**: Continues on fail to process all contacts

### Node 5: Summarize Results
- Counts successful vs failed syncs
- Reports back to TPE backend with results
- Logs summary for monitoring

## 🏷️ GHL Tag Strategy

### Contractors
```
tpe-contractor, customer, stage-profiling, revenue-5m_10m, team-size-25, focus-lead-generation
```

### Partners  
```
tpe-partner, strategic-partner, ceo, company-acme-corp, employees-100, service-marketing
```

### Partner Employees
```
tpe-partner-employee, sales-head, company-acme-corp
```

## 🔧 Customization Options

### Change Sync Frequency
Replace Manual Trigger with:
- **Cron Trigger**: Daily/weekly automatic sync
- **Webhook Trigger**: On-demand sync from TPE admin dashboard

### Modify Contact Fields
Update the "Process Contacts" code to:
- Add/remove custom fields
- Change tag format
- Filter specific contact types

### Add Error Notifications
Add nodes after "Summarize Results":
- **Email notification** for failed syncs
- **Slack alert** for admin team
- **Database logging** of sync history

## 🚨 Important Notes

### GHL API Limits
- **Rate Limiting**: Respect GHL API rate limits
- **Batch Size**: Start with 10 contacts/batch
- **Retry Logic**: Consider adding retry for failed requests

### Data Privacy
- **Consent**: Ensure contractors/partners consent to GHL sync
- **GDPR/Privacy**: Handle personal data appropriately
- **Opt-outs**: Implement mechanism to exclude contacts from sync

### Duplicate Handling
- **Email Matching**: GHL will update existing contacts with same email
- **Phone Matching**: Configure GHL duplicate detection rules
- **Custom Field**: Use `tpe_id` to track TPE → GHL relationship

## 📈 Monitoring & Analytics

### Success Metrics
- **Sync Success Rate**: Target 95%+ successful syncs
- **Contact Coverage**: All active contractors/partners synced
- **Data Accuracy**: Custom fields and tags properly mapped

### Error Tracking
- **Failed Syncs**: Monitor and retry failed contacts
- **API Errors**: Track GHL API response codes
- **Data Validation**: Ensure required fields are present

## 🔄 Next Steps

After successful contact sync:
1. **SMS Campaigns**: Use GHL to send targeted SMS to contact segments
2. **Email Marketing**: Create automated email sequences
3. **Pipeline Management**: Move contacts through GHL pipelines based on TPE stage
4. **AI Concierge Integration**: Connect GHL conversations back to TPE for AI coaching

---

**Created**: August 2025  
**Last Updated**: August 19, 2025  
**Status**: ✅ Ready for Testing