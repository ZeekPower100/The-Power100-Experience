# n8n Workflow Environment Management Strategy

## Overview
This document outlines our approach to managing n8n workflows across development and production environments, ensuring seamless testing without affecting live systems.

## Core Principle
**Duplicate workflows for each environment** - Each workflow exists in two versions (dev & production) with identical logic but different endpoints and webhook paths.

## Workflow Naming Convention

### Development Workflows
- **Name Format**: `[Workflow Name] - DEV`
- **Webhook Path**: `[base-path]-dev`
- **Example**:
  - Name: `Partner AI Processing - DEV`
  - Webhook: `partner-ai-processing-dev`

### Production Workflows
- **Name Format**: `[Workflow Name] - PRODUCTION`
- **Webhook Path**: `[base-path]`
- **Example**:
  - Name: `Partner AI Processing - PRODUCTION`
  - Webhook: `partner-ai-processing`

## Implementation Details

### 1. Partner AI Processing Workflows

#### Development Version
- **Webhook Path**: `partner-ai-processing-dev`
- **API Endpoint**: Uses ngrok URL or localhost
- **Environment**: `.env.development`
- **N8N_WEBHOOK_URL**: `https://n8n.srv918843.hstgr.cloud/webhook/partner-ai-processing-dev`

#### Production Version
- **Webhook Path**: `partner-ai-processing`
- **API Endpoint**: `https://tpx.power100.io`
- **Environment**: `.env.production`
- **N8N_WEBHOOK_URL**: `https://n8n.srv918843.hstgr.cloud/webhook/partner-ai-processing`

### 2. Configuration in TPE Backend

#### Environment Variables
```bash
# .env.development
N8N_WEBHOOK_URL=https://n8n.srv918843.hstgr.cloud/webhook/partner-ai-processing-dev

# .env.production
N8N_WEBHOOK_URL=https://n8n.srv918843.hstgr.cloud/webhook/partner-ai-processing
```

#### Controller Code
```javascript
// partnerController.js
const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/partner-ai-processing';
```

## Workflow Duplication Process

### Step 1: Create and Test Development Workflow
1. Build workflow in n8n with development endpoints
2. Use ngrok URL for local testing
3. Set webhook path with `-dev` suffix
4. Test thoroughly with local development

### Step 2: Duplicate for Production
1. **In n8n UI**: Duplicate the working development workflow
2. **Rename**: Change name from "DEV" to "PRODUCTION"
3. **Update Webhook Path**: Remove `-dev` suffix
4. **Change URLs**: Replace ngrok/localhost with production URL
5. **Keep Token**: Use same JWT token (valid for 30 days)
6. **Activate**: Enable the production workflow

### Step 3: Update Tags
- Development workflows: Tag with `dev`, `testing`
- Production workflows: Tag with `production`, `live`

## Benefits of This Approach

### 1. **Isolation**
- Development changes never affect production
- Can test risky changes safely
- Production remains stable

### 2. **Flexibility**
- Can use different authentication if needed
- Easy to toggle between environments
- Can run both simultaneously

### 3. **Debugging**
- Compare dev vs production behavior
- Test fixes in dev before deploying
- Maintain production stability

### 4. **Simplicity**
- No complex environment switching logic
- Clear visual separation in n8n UI
- Easy to understand what's running where

## Current Workflows to Duplicate

### Priority 1 - AI Processing
- [x] Partner AI Processing → Partner AI Processing - DEV/PRODUCTION
- [ ] AI Concierge Webhook → AI Concierge - DEV/PRODUCTION

### Priority 2 - GHL Integration
- [ ] GHL Contact Sync → GHL Contact Sync - DEV/PRODUCTION
- [ ] SMS Verification → SMS Verification - DEV/PRODUCTION
- [ ] Welcome Email → Welcome Email - DEV/PRODUCTION

### Priority 3 - Other Integrations
- [ ] Partner Delegation Email → Partner Delegation - DEV/PRODUCTION
- [ ] Booking Confirmation → Booking Confirmation - DEV/PRODUCTION

## JWT Token Management

### Single Token Strategy
Using the same JWT token for both environments simplifies management:
- **Token**: Generated with 30-day expiration
- **Used in**: Both dev and production workflows
- **Benefit**: No need to maintain separate tokens
- **Refresh**: Generate new token monthly

### Token Generation
```bash
node generate-jwt-token.js
```

Update in all n8n workflows when refreshed.

## Monitoring and Maintenance

### Daily Checks
- Verify both dev and production workflows are active
- Check execution history for errors
- Monitor webhook response times

### Weekly Tasks
- Review workflow execution metrics
- Clean up test data from development
- Verify token expiration dates

### Monthly Tasks
- Refresh JWT tokens before expiration
- Archive old workflow versions
- Document any new workflows added

## Troubleshooting

### Common Issues

#### 1. Webhook Not Triggering
- Check workflow is active
- Verify webhook path matches environment
- Confirm N8N_WEBHOOK_URL in correct .env file

#### 2. Wrong Environment Hit
- Verify webhook path suffix (-dev for development)
- Check N8N_WEBHOOK_URL environment variable
- Ensure correct workflow is activated

#### 3. Authentication Failures
- Regenerate JWT token if expired
- Update token in all workflows
- Verify token in both dev and production

## Future Optimizations

### Phase 1: Current (Manual Duplication)
- Manually duplicate and update workflows
- Works well for small number of workflows
- Quick to implement

### Phase 2: Automation (3-6 months)
- Script to export/import workflows
- Automated URL replacement
- Environment variable management

### Phase 3: Advanced (6-12 months)
- n8n environment variables
- Automated deployment pipeline
- Version control integration

## Conclusion

This dual-workflow strategy ensures:
1. **Safety**: Production never affected by development
2. **Simplicity**: Clear separation, easy to understand
3. **Flexibility**: Test anything in dev without fear
4. **Reliability**: Production remains stable and consistent

By maintaining separate workflows for each environment, we can iterate quickly in development while maintaining a stable production system.