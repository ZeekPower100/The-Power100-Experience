# n8n Integration Guide for TPE Platform

## 📝 **n8n JSON Structure Best Practices**

Based on successful GHL → n8n → TPE integration (August 2025).

### ✅ **Working n8n HTTP Request JSON Format**

When building n8n workflows that send data to TPE backend, use this proven structure:

```json
{
  "contactId": "{{ $json.body.contactId }}",
  "conversationId": "{{ $json.body.conversationId || $json.body.contactId }}",
  "messageId": "{{ $now }}_{{ $json.body.contactId }}",
  "type": "sms",
  "direction": "{{ $json.body.direction || 'inbound' }}",
  "body": "{{ $json.body.body }}",
  "from": {
    "phone": "{{ $json.body.from.phone }}",
    "name": "{{ $json.body.from.name }}"
  },
  "to": {
    "phone": "{{ $json.body.to.phone }}",
    "name": "{{ $json.body.to.name }}"
  },
  "status": "delivered",
  "metadata": {
    "source": "ghl"
  }
}
```

### 🔧 **Key n8n Expression Patterns**

#### **Understanding Data Access Path:**
- **Critical**: Data flows to the `body` of the n8n node
- **Always start with**: `{{ $json.body.fieldName }}`
- **For nested data**: Follow the complete path down the hierarchy

#### **Nested Field Access Examples:**
```javascript
// Top level field
"contactId": "{{ $json.body.contactId }}"

// Nested object field  
"phone": "{{ $json.body.from.phone }}"

// Deep nested field
"field1": "{{ $json.body.data.field1 }}"

// Message body (field named 'body' within body)
"body": "{{ $json.body.body }}"
```

#### **Fallback Values:**
- Use `{{ $json.body.field || 'fallback' }}` for optional fields
- Example: `{{ $json.body.direction || 'inbound' }}`

#### **Unique ID Generation:**
- Use `{{ $now }}_{{ $json.body.contactId }}` for timestamp-based IDs
- Ensures unique message IDs for database constraints

### 🎯 **TPE Backend Field Requirements**

#### **Required Fields (Database Constraints):**
- **`status`**: Must be one of: `pending`, `sent`, `delivered`, `read`, `failed`, `bounced`
- **`direction`**: Must be `inbound` or `outbound`
- **`type`**: Communication type (`sms`, `email`, `whatsapp`)

#### **Unique Constraints:**
- **`messageId`**: Must be unique across all records
- Use timestamp + contactId pattern: `{{ $now }}_{{ $json.body.contactId }}`

### 📋 **Data Path Structure**

```
Webhook Data → n8n Node Body → JSON Expression
     ↓              ↓               ↓
{contactId: "123"} → body.contactId → {{ $json.body.contactId }}
{data: {field1: "value"}} → body.data.field1 → {{ $json.body.data.field1 }}
{body: "message text"} → body.body → {{ $json.body.body }}
```

### 🔗 **Integration Architecture**

```
GHL Workflow → n8n Webhook → TPE Backend → Database Storage
     ↓              ↓              ↓              ↓
  SMS Event    JSON Transform   Validation    Thread Storage
```

### ⚠️ **Common Issues & Solutions**

#### **[object Object] in Message Body:**
- **Issue**: Using `{{ $json.body }}` instead of `{{ $json.body.body }}`
- **Solution**: Access the actual message field: `{{ $json.body.body }}`

#### **[undefined] Values:**
- **Issue**: Incorrect data path or missing fallbacks
- **Solution**: Check webhook structure, use proper nested path

#### **Database Constraint Errors:**
- **Issue**: `CHECK constraint failed: status IN (...)`
- **Solution**: Use exact values from database enum constraints

### 🏗️ **Future Workflow Templates**

Use this base structure for other n8n integrations:

```json
{
  "sourceId": "{{ $json.body.id }}",
  "timestamp": "{{ $now }}",
  "type": "workflow_type_here",
  "data": {
    "field1": "{{ $json.body.data.field1 }}",
    "field2": "{{ $json.body.data.field2 || 'default_value' }}"
  },
  "content": "{{ $json.body.body }}",
  "metadata": {
    "source": "integration_name",
    "version": "1.0"
  }
}
```

### 📊 **Testing Results**

- **✅ Fixed `[object Object]`**: Using `{{ $json.body.body }}` now returns `null` for empty tests
- **✅ Real message content**: Will populate when actual SMS messages are sent
- **✅ All constraints**: Working with proper field mapping

---

**Last Updated**: August 19, 2025
**Integration Status**: ✅ GHL SMS Integration Live  
**Key Fix**: Proper nested data access with `$json.body.body` for message content