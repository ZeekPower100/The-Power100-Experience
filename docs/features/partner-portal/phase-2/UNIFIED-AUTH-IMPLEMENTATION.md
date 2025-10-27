# Partner Portal Phase 2: Unified Authentication Implementation

## Overview

This document describes the unified authentication system implemented for Partner Portal Phase 2, which allows **both partners and admins** to access and update partner profiles through the same backend endpoints.

## Architecture Decision

**Selected Approach**: Backend Unified Authentication (Option 2)

**Why This Approach?**
- **Scalability**: Adding new user types (contractors, sub-users, API partners) requires only backend middleware updates
- **Centralization**: Authorization logic remains in one place - the backend
- **Zero Frontend Changes**: Frontend components work unchanged when new user contexts are added
- **Single Endpoint**: One set of endpoints handles all authenticated contexts
- **Maintainability**: Simpler to debug and maintain than context-aware frontend code

## What Was Implemented

### 1. New Middleware: `protectPartnerOrAdmin`
**Location**: `tpe-backend/src/middleware/flexibleAuth.js`

**Purpose**: Accept authentication tokens from **both** partners and admins

**How It Works**:
```javascript
// Validates token and checks user type
if (validationResult.type !== 'partner' && validationResult.type !== 'admin') {
  return next(new AppError('Partner or Admin access required', 403));
}

// Sets context-specific properties
req.user = validationResult.user;
req.userType = validationResult.type;
if (validationResult.type === 'partner') {
  req.partnerId = validationResult.user.partnerId;
}
```

**Exports**: Available as `protectPartnerOrAdmin` in `flexibleAuth.js` and `auth.js`

### 2. Updated Routes: Partner Portal Profile Endpoints
**Location**: `tpe-backend/src/routes/partnerPortalRoutes.js`

**Changes**:
```javascript
// Profile endpoints use unified auth (accept both partner AND admin tokens)
router.get('/profile', protectPartnerOrAdmin, asyncHandler(getPartnerProfile));
router.put('/profile', protectPartnerOrAdmin, asyncHandler(updatePartnerProfile));
router.post('/profile/upload-logo', protectPartnerOrAdmin, uploadLogoMiddleware.single('logo'), asyncHandler(uploadLogo));

// All other routes remain partner-only
router.use(protectPartner);  // Applied AFTER profile routes
```

**Key Detail**: Profile routes are defined **before** `router.use(protectPartner)` to avoid being overridden by partner-only middleware.

### 3. Updated Controllers: Context-Aware Partner ID Extraction
**Location**: `tpe-backend/src/controllers/partnerPortalController.js`

**Functions Updated**:
- `getPartnerProfile` (line 473)
- `updatePartnerProfile` (line 559)
- `uploadLogo` (line 682)

**Partner ID Extraction Logic**:
```javascript
// Partners: partnerId from JWT token (set by middleware)
// Admins: partnerId from request body or query params
const partnerId = req.partnerId || req.query.partnerId || req.body.id || req.body.partnerId;

if (!partnerId) {
  return res.status(400).json({
    success: false,
    message: 'Partner ID is required'
  });
}
```

## How It Works

### Partner Self-Service Flow
1. **Partner logs in** → Receives JWT with `type: 'partner'` and `partnerId`
2. **Navigates to** `/partner/profile/edit`
3. **Frontend fetches profile** → `GET /api/partner-portal/profile`
   - Token validated by `protectPartnerOrAdmin` middleware
   - `req.partnerId` set from JWT token
   - Controller retrieves partner's own profile
4. **Partner updates profile** → `PUT /api/partner-portal/profile`
   - Token validated by `protectPartnerOrAdmin` middleware
   - `req.partnerId` set from JWT token
   - Controller updates partner's own profile

### Admin Editing Partner Flow
1. **Admin logs in** → Receives JWT with `type: 'admin'`
2. **Admin selects partner to edit** in admin dashboard
3. **Frontend fetches profile** → `GET /api/partner-portal/profile?partnerId=123`
   - Token validated by `protectPartnerOrAdmin` middleware
   - Controller extracts `partnerId` from query params
   - Controller retrieves specified partner's profile
4. **Admin updates profile** → `PUT /api/partner-portal/profile` with `partnerId: 123` in body
   - Token validated by `protectPartnerOrAdmin` middleware
   - Controller extracts `partnerId` from request body
   - Controller updates specified partner's profile

## Frontend Integration

### Partner Portal Page
**Location**: `tpe-front-end/src/app/partner/profile/edit/page.tsx`

**Current Implementation**:
```typescript
// Fetches partner's own profile using partner JWT
const response = await fetch('http://localhost:5000/api/partner-portal/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

**Works as-is** - No changes needed!

### Admin Context (Future Integration)
**When PartnerForm is used in admin context**:

Option 1: Pass partnerId in query params
```typescript
const response = await fetch(`http://localhost:5000/api/partner-portal/profile?partnerId=${partnerId}`, {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});
```

Option 2: Pass partnerId in request body (for PUT)
```typescript
const response = await fetch('http://localhost:5000/api/partner-portal/profile', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    partnerId: 123,
    company_name: 'Updated Name',
    // ... other fields
  })
});
```

## Security Considerations

### Access Control
- **Partners**: Can only access/edit their own profile (partnerId from JWT)
- **Admins**: Can access/edit any partner profile (partnerId from request)
- **Contractors**: Blocked by middleware (403 error)

### Token Validation
- All tokens validated using existing `identifyAndValidateToken` function
- Partner tokens verified against `strategic_partners` table
- Admin tokens verified against `admin_users` table
- Invalid/expired tokens return 401 error

### Partner ID Verification
- Partner users: partnerId extracted from JWT (trusted source)
- Admin users: partnerId from request (requires admin privileges to exploit)
- Missing partnerId: 400 error with clear message

## Testing

### Test Partner Self-Service
```bash
# 1. Partner login
curl -X POST http://localhost:5000/api/partner-portal/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"partner@example.com","password":"password123"}'

# 2. Get partner profile (partnerId from token)
curl http://localhost:5000/api/partner-portal/profile \
  -H "Authorization: Bearer PARTNER_TOKEN"

# 3. Update profile (partnerId from token)
curl -X PUT http://localhost:5000/api/partner-portal/profile \
  -H "Authorization: Bearer PARTNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Updated Company Name"}'
```

### Test Admin Editing Partner
```bash
# 1. Admin login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@power100.io","password":"admin123"}'

# 2. Get partner profile (partnerId from query)
curl "http://localhost:5000/api/partner-portal/profile?partnerId=1" \
  -H "Authorization: Bearer ADMIN_TOKEN"

# 3. Update partner profile (partnerId in body)
curl -X PUT http://localhost:5000/api/partner-portal/profile \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"partnerId":1,"company_name":"Admin Updated Name"}'
```

### Expected Errors
```bash
# Contractor token should be rejected
curl http://localhost:5000/api/partner-portal/profile \
  -H "Authorization: Bearer CONTRACTOR_TOKEN"
# Response: {"success":false,"message":"Partner or Admin access required"}

# Missing partnerId (admin without partnerId)
curl http://localhost:5000/api/partner-portal/profile \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Response: {"success":false,"message":"Partner ID is required"}
```

## Future Enhancements

### 1. Support Additional User Types
To add contractor profile editing (hypothetical example):
```javascript
// Add new middleware
const protectPartnerOrAdminOrContractor = async (req, res, next) => {
  // ... validate token
  if (!['partner', 'admin', 'contractor'].includes(validationResult.type)) {
    return next(new AppError('Unauthorized', 403));
  }
  // ... set context
};

// Update routes
router.put('/profile', protectPartnerOrAdminOrContractor, asyncHandler(updatePartnerProfile));
```

**Frontend changes**: Zero! Same code works.

### 2. Role-Based Permissions
Future enhancement for granular control:
```javascript
const protectWithRoles = (...allowedRoles) => async (req, res, next) => {
  const validationResult = await identifyAndValidateToken(token);
  if (!allowedRoles.includes(validationResult.type)) {
    return next(new AppError(`Access restricted to: ${allowedRoles.join(', ')}`, 403));
  }
  next();
};

// Usage
router.put('/profile', protectWithRoles('partner', 'admin'), asyncHandler(updatePartnerProfile));
```

### 3. Audit Logging
Track who made changes:
```javascript
console.log(`Profile updated for partner ${partnerId} by ${req.userType} user ${req.user.id}`);
```

## Files Modified

### Backend
- `tpe-backend/src/middleware/flexibleAuth.js` - Added `protectPartnerOrAdmin` middleware
- `tpe-backend/src/routes/partnerPortalRoutes.js` - Updated profile routes to use unified auth
- `tpe-backend/src/controllers/partnerPortalController.js` - Updated 3 functions to extract partnerId from context

### Frontend
- No changes required! Existing code works with new backend.

## Related Documentation
- **Phase 2 Overview**: `docs/features/partner-portal/phase-2/PHASE-2-COMPLETE.md`
- **Flexible Auth System**: `tpe-backend/src/middleware/flexibleAuth.js` (inline comments)
- **Partner Portal API**: Backend controller comments in `partnerPortalController.js`

## Summary

✅ **Scalable**: Easy to add new user types (backend-only changes)
✅ **Secure**: Proper token validation and authorization checks
✅ **Simple**: Frontend code unchanged when adding new contexts
✅ **Maintainable**: All auth logic centralized in backend middleware
✅ **Tested**: Both partner and admin flows work correctly

**Result**: Partner Portal Phase 2 profile editing now works seamlessly for both partner self-service AND admin management, with a foundation for future user types.
