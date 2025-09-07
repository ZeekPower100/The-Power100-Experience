# Partner Delegation Email Workflow

## Overview
This n8n workflow handles automated email sending to partner delegates when they need to complete Step 8 Pre-Onboarding for their partnership with The Power100 Experience.

## Workflow Components

### 1. Webhook Trigger
- **Path**: `partner-delegation-email`
- **Method**: POST
- **Webhook ID**: `75d8f7e9-3c4a-4b89-9e7d-8a6c5f3e2d1d`

### 2. Function Node - Format Delegation Email Content
- Creates personalized HTML email with inline CSS styling
- Uses Power100 branding colors (#FB0401 red, #28a745 green)
- Includes gradient header, call-to-action button, and structured content
- Validates required fields (email, delegateName, partnerName)

### 3. HTTP Request Node - Send Email via GHL API
- **URL**: `https://services.leadconnectorhq.com/conversations/messages`
- **Bearer Token**: `pit-47d8d6fc-d175-4c59-a7e4-54c50237d56c`
- **From Email**: `partnerships@power100.io`
- Sends HTML email through GoHighLevel API

### 4. Function Node - Process Email Result
- Handles success/failure responses
- Creates comprehensive logging data
- Extracts message IDs and error handling

### 5. HTTP Request Node - Log to TPE Database
- **URL**: `https://tpx.power100.io/api/communications/webhook`
- Logs email status and metadata to TPE database
- Includes partner and delegate tracking information

### 6. Webhook Response Node
- Returns success confirmation with details
- Includes workflow execution metadata

## Required Data Structure

```json
{
  "email": "delegate@example.com",
  "delegateName": "John Smith", 
  "partnerName": "ABC Construction Partners",
  "partnerId": "partner_123",
  "delegateId": "delegate_456", 
  "contactId": "ghl_contact_789",
  "preOnboardingLink": "https://tpx.power100.io/partner/onboarding/delegation?token=xyz"
}
```

## Email Template Features

### Inline CSS Styling
- All styles are inline for maximum email client compatibility
- No external stylesheets or `<style>` tags
- Responsive design with fallback styles

### Brand Compliance
- Power100 red (#FB0401) and green (#28a745) color scheme
- Gradient header with brand logo styling
- Professional layout with clear call-to-action

### Content Structure
- Personalized greeting with delegate name
- Clear action required section with 48-hour timeline
- Prominent "Complete Pre-Onboarding" button
- Detailed checklist of what will be completed
- Contact information and footer

## Installation Instructions

1. **Import to n8n**:
   ```bash
   # Copy the workflow JSON file
   cp partner-delegation-email-workflow.json /path/to/n8n/workflows/
   ```

2. **Import via n8n UI**:
   - Open n8n interface
   - Click "Import" 
   - Select `partner-delegation-email-workflow.json`
   - Review and save

3. **Activate Workflow**:
   - Open imported workflow
   - Click "Activate" toggle in top right
   - Verify webhook URL is accessible

## Webhook Endpoint

Once activated, the webhook will be available at:
```
https://your-n8n-instance.com/webhook/partner-delegation-email
```

## Testing

### Test Payload Example
```json
{
  "email": "test@example.com",
  "delegateName": "Test Delegate",
  "partnerName": "Test Partner LLC",
  "partnerId": "test_partner_123",
  "delegateId": "test_delegate_456",
  "contactId": "test_contact_789",
  "preOnboardingLink": "https://tpx.power100.io/partner/onboarding/delegation?test=true"
}
```

### cURL Test Command
```bash
curl -X POST https://your-n8n-instance.com/webhook/partner-delegation-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "delegateName": "Test Delegate", 
    "partnerName": "Test Partner LLC",
    "partnerId": "test_partner_123",
    "delegateId": "test_delegate_456"
  }'
```

## Workflow ID and Version
- **Workflow ID**: `8f9d5b3e-4c2a-4b89-9e7d-8a6c5f3e2d1d`
- **Version ID**: `8f9d5b3e-4c2a-4b89-9e7d-8a6c5f3e2d1d`
- **Created**: September 2024
- **Status**: Ready for deployment and activation

## Dependencies
- GoHighLevel API access with bearer token
- TPE backend API endpoint for logging
- n8n instance with HTTP request capabilities
- Valid email routing through GHL system

## Monitoring and Logs
- All email sends are logged to TPE database
- Success/failure status tracked with message IDs
- Error handling with detailed error messages
- Webhook response includes execution metadata