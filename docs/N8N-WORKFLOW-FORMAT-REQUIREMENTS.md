# n8n Workflow Format Requirements - CRITICAL DOCUMENTATION

## 🚨 CRITICAL: This Format MUST Be Used for n8n Workflows

This documentation captures the **EXACT** format requirements discovered through extensive testing and comparison with working workflows. **NEVER DEVIATE** from these specifications or workflows will fail with "Could not find workflow" errors.

## ✅ WORKING Format Requirements

### 1. Webhook Node Specifications
```json
{
  "parameters": {
    "httpMethod": "POST",
    "path": "your-webhook-path",
    "options": {}  // REQUIRED - even if empty
  },
  "id": "webhook_node",  // Simple ID, no special characters
  "name": "Webhook",     // Human-readable name
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 1,      // MUST BE 1, NOT 1.1
  "position": [250, 300],
  "webhookId": "your-webhook-path"  // REQUIRED - matches path
}
```

### 2. HTTP Request Node Specifications
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://your-api-endpoint.com/api/endpoint",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": false,  // or true with body specification
    "options": {}       // REQUIRED - even if empty
  },
  "id": "http_request",  // Simple ID
  "name": "HTTP Request",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [450, 300]
}
```

### 3. Respond to Webhook Node
```json
{
  "parameters": {
    "respondWith": "json",
    "responseBody": "={{ JSON.stringify($json) }}",
    "options": {}  // REQUIRED
  },
  "id": "webhook_response",
  "name": "Webhook Response",
  "type": "n8n-nodes-base.respondToWebhook",
  "typeVersion": 1,
  "position": [650, 300]
}
```

### 4. If (Conditional) Node
```json
{
  "parameters": {
    "conditions": {
      "conditions": [
        {
          "leftValue": "={{ $json[\"body\"][\"ai_processing_status\"] }}",
          "rightValue": "pending",
          "operator": {
            "type": "string",
            "operation": "equals"
          }
        }
      ]
    }
  },
  "id": "check_status",
  "name": "Check Status",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "position": [450, 300]
}
```

### 5. Connections Format
```json
"connections": {
  "Webhook": {  // MUST use node NAME, not ID
    "main": [
      [
        {
          "node": "Check Status",  // MUST use node NAME
          "type": "main",
          "index": 0
        }
      ]
    ]
  },
  "Check Status": {
    "main": [
      [  // True branch (first array)
        {
          "node": "HTTP Request",
          "type": "main",
          "index": 0
        }
      ],
      [  // False branch (second array)
        {
          "node": "Skip Response",
          "type": "main",
          "index": 0
        }
      ]
    ]
  }
}
```

## ❌ Common Mistakes That BREAK Workflows

### 1. **Wrong typeVersion**
```json
// ❌ WRONG
"typeVersion": 1.1

// ✅ CORRECT
"typeVersion": 1
```

### 2. **Including responseMode in Webhook**
```json
// ❌ WRONG
"parameters": {
  "httpMethod": "POST",
  "path": "webhook-path",
  "responseMode": "responseNode"  // DO NOT INCLUDE
}

// ✅ CORRECT
"parameters": {
  "httpMethod": "POST",
  "path": "webhook-path",
  "options": {}
}
```

### 3. **Missing webhookId**
```json
// ❌ WRONG
{
  "id": "webhook_node",
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook"
  // Missing webhookId
}

// ✅ CORRECT
{
  "id": "webhook_node",
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook",
  "webhookId": "your-webhook-path"
}
```

### 4. **Missing options field**
```json
// ❌ WRONG
"parameters": {
  "httpMethod": "POST",
  "path": "webhook-path"
  // Missing options
}

// ✅ CORRECT
"parameters": {
  "httpMethod": "POST",
  "path": "webhook-path",
  "options": {}
}
```

### 5. **Using node IDs in connections**
```json
// ❌ WRONG
"connections": {
  "webhook_node": {  // Using ID
    "main": [[{
      "node": "http_request",  // Using ID
      "type": "main",
      "index": 0
    }]]
  }
}

// ✅ CORRECT
"connections": {
  "Webhook": {  // Using NAME
    "main": [[{
      "node": "HTTP Request",  // Using NAME
      "type": "main",
      "index": 0
    }]]
  }
}
```

## 📋 Complete Working Example

### Simple Webhook → HTTP Request → Response
```json
{
  "name": "Partner AI Processing Simple",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "partner-ai-processing",
        "options": {}
      },
      "id": "webhook_node",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "webhookId": "partner-ai-processing"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://b6c3540bf829.ngrok-free.app/api/ai-processing/trigger-processing",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": false,
        "options": {}
      },
      "id": "process_partners",
      "name": "Process Partners",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [450, 300]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ JSON.stringify($json) }}",
        "options": {}
      },
      "id": "webhook_response",
      "name": "Webhook Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          {
            "node": "Process Partners",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Process Partners": {
      "main": [
        [
          {
            "node": "Webhook Response",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "meta": {
    "instanceId": "partner-ai-simple"
  },
  "tags": []
}
```

## 🔍 Validation Checklist

Before creating or uploading any n8n workflow, verify:

- [ ] All webhook nodes use `typeVersion: 1` (not 1.1)
- [ ] No `responseMode` in webhook parameters
- [ ] `webhookId` field present and matches path
- [ ] `options: {}` in ALL node parameters
- [ ] Connections use node NAMES not IDs
- [ ] Node IDs are simple (no special characters)
- [ ] If nodes have proper condition structure
- [ ] HTTP Request nodes use `typeVersion: 3`
- [ ] Respond nodes use `typeVersion: 1`

## 📝 API Creation Template

When creating workflows via n8n API:

```javascript
const workflowData = {
  name: "Your Workflow Name",
  nodes: [
    // Add nodes following exact format above
  ],
  connections: {
    // Use node NAMES not IDs
  },
  settings: {
    executionOrder: "v1"
  },
  active: false,  // Set to true when ready
  staticData: null,
  meta: {
    instanceId: "unique-instance-id"
  },
  tags: ["tag1", "tag2"]
};

// POST to n8n API
fetch('http://localhost:5678/api/v1/workflows', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-N8N-API-KEY': process.env.N8N_API_KEY
  },
  body: JSON.stringify(workflowData)
});
```

## 🚨 NEVER FORGET

This format was discovered through extensive testing and comparison with working workflows. The differences are subtle but CRITICAL:

1. **typeVersion MUST be integer 1** for webhooks
2. **webhookId is REQUIRED** and must match path (for JSON upload, not API creation)
3. **options: {} is REQUIRED** even when empty
4. **Connections MUST use node names** not IDs
5. **No responseMode** in webhook parameters
6. **⚠️ CRITICAL: If nodes break workflows when created via API** - They cause "Could not find workflow" errors even after working nodes are added. Use backend logic for conditionals instead.

Following this exact format is the difference between a working workflow and hours of debugging "Could not find workflow" errors.

## 🔴 Known Issues with n8n API Creation

### If Node Breaking Workflows
**Discovery Date:** January 19, 2025
- **Problem:** Adding an If node via API causes entire workflow to show "Could not find workflow" error
- **Symptoms:** Workflow works perfectly until If node is added, then completely breaks
- **Workaround:** Handle conditional logic in your backend API instead of n8n workflow
- **Alternative:** Create workflows manually in n8n UI if If nodes are required

## 📅 Discovery Date
**January 17, 2025** - After extensive testing, comparison with working workflows (ghl-verification-sms-v2.json), and multiple failed attempts with incorrect formats.

## 🔗 Related Files
- `n8n-workflows/partner-ai-simple.json` - Working simple workflow
- `n8n-workflows/partner-ai-processing-final.json` - Full complexity workflow (to be created)
- `tpe-backend/src/controllers/partnerController.js` - Webhook trigger function
- `tpe-backend/src/routes/aiProcessingRoutes.js` - AI processing endpoints