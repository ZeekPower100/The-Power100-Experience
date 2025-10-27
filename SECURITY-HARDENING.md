# Security Hardening Documentation

This document outlines all security measures implemented in The Power100 Experience platform.

## Overview

TPE implements multiple layers of security controls following OWASP best practices and industry standards.

## Security Headers (Helmet.js)

### Content Security Policy (CSP)
Prevents XSS attacks by controlling which resources can be loaded:
- Scripts: Self-origin + inline (required for Next.js)
- Styles: Self-origin + inline
- Images: Self + data URLs + HTTPS + blob
- Objects: Blocked
- Frames: Blocked

### HTTP Strict Transport Security (HSTS)
Forces HTTPS connections for 1 year:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### X-Content-Type-Options
Prevents MIME type sniffing:
```
X-Content-Type-Options: nosniff
```

### X-Frame-Options
Prevents clickjacking attacks:
```
X-Frame-Options: DENY
```

### X-XSS-Protection
Legacy XSS protection for older browsers:
```
X-XSS-Protection: 1; mode=block
```

### Referrer Policy
Controls information sent in Referer header:
```
Referrer-Policy: strict-origin-when-cross-origin
```

### Permissions Policy
Restricts browser features:
```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Rate Limiting

### General API Rate Limiting
- Window: 15 minutes
- Limit: 100 requests per IP (production), 1000 (development)
- Health checks excluded
- Returns 429 status with retry-after header

### Authentication Rate Limiting
Stricter limits for login/register endpoints:
- Window: 15 minutes
- Limit: 5 attempts
- Applies to:
  - `/api/auth/*` (admin/contractor auth)
  - `/api/partner-auth/*` (partner auth)
- Successful requests don't count against limit

## CORS (Cross-Origin Resource Sharing)

### Allowed Origins
**Production:**
- `https://tpx.power100.io` (HTTPS only)
- Localhost URLs (for testing)

**Development:**
- All configured development URLs

### Configuration
- Credentials: Enabled (for cookies)
- Methods: GET, POST, PUT, DELETE, PATCH
- Headers: Content-Type, Authorization, X-API-Key

### Security Features
- Origin validation callback
- Blocked origins logged to console
- No wildcard (*) origins allowed

## Input Sanitization

### XSS Protection
All request body inputs are sanitized to remove:
- `<script>` tags
- `javascript:` URLs
- `on*=` event handlers

### Implementation
- Applied globally via middleware
- Recursive object property sanitization
- Applied before validation

## SQL Injection Prevention

### Parameterized Queries
All database queries use parameterized statements:

```javascript
// ✅ SECURE - Parameterized
const result = await query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// ❌ INSECURE - Never use string concatenation
const result = await query(
  `SELECT * FROM users WHERE id = ${userId}` // DON'T DO THIS
);
```

### Verification Checklist
- ✅ All SELECT queries parameterized
- ✅ All INSERT queries parameterized
- ✅ All UPDATE queries parameterized
- ✅ All DELETE queries parameterized
- ✅ No string concatenation in queries
- ✅ All user inputs passed as query parameters

## Authentication & Authorization

### JWT Token Security
- Tokens expire after 7 days (production)
- Tokens signed with secure secret (64+ characters)
- Tokens verified on every protected request
- Invalid/expired tokens rejected with 401

### Password Security
- Passwords hashed with bcrypt (10 rounds)
- Plain text passwords never stored
- Password validation enforced
- Account lockout after failed attempts

### Session Management
- Tokens stored in HTTP-only cookies (when applicable)
- Tokens can be sent via Authorization header
- No tokens in URL parameters
- Secure flag enabled in production

## Cache Control

### Sensitive Endpoints
Admin and auth endpoints have strict cache control:
```
Cache-Control: no-store, no-cache, must-revalidate, private
Pragma: no-cache
Expires: 0
```

## Error Handling

### Production Error Responses
- Generic error messages to users
- Detailed errors logged server-side
- No stack traces in production responses
- No internal paths or database info leaked

### Example Production Error:
```json
{
  "error": "Internal server error",
  "message": "Something went wrong. Please try again later."
}
```

## Security Monitoring

### Logging
Security events logged:
- Rate limit exceeded
- CORS violations
- Authentication failures
- Authorization failures
- Suspicious request patterns

### Alerts (Future)
- Multiple failed login attempts
- Unusual API usage patterns
- Blocked CORS requests
- Rate limit violations

## Communication Architecture

### Email & SMS Flow
**IMPORTANT:** TPE does NOT use Twilio or SendGrid directly.

**Architecture:**
```
TPE Backend → n8n Webhook → GoHighLevel (GHL) → Email/SMS Providers
```

**Why this architecture:**
- Centralized communication management in GHL
- GHL handles all contact management, templates, and delivery
- n8n provides orchestration and workflow automation
- TPE stays decoupled from communication providers

**Configuration:**
- `N8N_WEBHOOK_URL`: Webhook endpoint for n8n automation
- `GHL_PRIVATE_INTEGRATION_TOKEN`: GoHighLevel API authentication
- `GHL_LOCATION_ID`: GHL location/workspace identifier

**Security Implications:**
- ✅ Reduced attack surface (no direct provider credentials in TPE)
- ✅ Centralized rate limiting and abuse prevention in GHL
- ✅ Communication templates managed in GHL (not in code)
- ⚠️ Dependency on n8n and GHL availability
- ⚠️ webhook authentication required (X-API-Key)

## Dependencies Security

### NPM Audit
Run security audits regularly:

```bash
# Check for vulnerabilities
cd tpe-backend && npm audit
cd tpe-front-end && npm audit

# Fix vulnerabilities
npm audit fix

# Force update (breaking changes)
npm audit fix --force
```

### Update Strategy
- Review npm audit weekly
- Update dependencies monthly
- Test thoroughly after updates
- Monitor for security advisories

## Current Vulnerabilities (As of Phase 4)

### Backend
- ⚠️ axios: DoS vulnerability (fixable with npm audit fix)
- ⚠️ nodemailer: Email domain issue (fixable)
- ⚠️ validator: URL validation bypass (fixable)
- ⚠️ express-validator: Depends on vulnerable validator

### Frontend
- ⚠️ next: Multiple vulnerabilities (requires update to 15.5.6+)
- ⚠️ xlsx: Prototype pollution and ReDoS (no fix available - consider alternatives)

**Action Required:** Run `npm audit fix` on both projects before production deployment.

## SSL/TLS Configuration

### Requirements
- SSL certificate for `tpx.power100.io`
- Wildcard certificate for `*.tpx.power100.io` (partner subdomains)
- Auto-renewal configured (Let's Encrypt or AWS Certificate Manager)
- HTTPS redirect enabled on web server (nginx/Apache)
- HSTS header enabled (already configured in helmet)

### Testing SSL
```bash
# Test SSL configuration
curl -I https://tpx.power100.io

# Check for security headers
curl -I https://tpx.power100.io | grep -i "strict-transport-security"
```

## Security Best Practices

### Development
- ✅ Never commit secrets to git
- ✅ Use environment variables for all secrets
- ✅ Different secrets for dev/production
- ✅ Review code for security issues
- ✅ Test with security in mind

### Deployment
- ✅ Run npm audit before deployment
- ✅ Use HTTPS in production
- ✅ Enable all security headers
- ✅ Monitor logs for security events
- ✅ Keep dependencies updated

### Access Control
- ✅ Principle of least privilege
- ✅ Strong password requirements
- ✅ MFA for admin accounts (future)
- ✅ Regular access reviews
- ✅ Revoke unused credentials

## Security Checklist for Production

- [ ] All npm audit vulnerabilities fixed
- [ ] SSL/TLS certificates installed
- [ ] HTTPS redirect enabled
- [ ] Environment variables secured
- [ ] Rate limiting configured
- [ ] Security headers verified
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] Error messages sanitized
- [ ] Logging configured
- [ ] Monitoring enabled
- [ ] Backup procedures tested
- [ ] Incident response plan documented

## Security Contacts

For security issues or vulnerabilities:
1. Do NOT create public GitHub issues
2. Contact security team directly
3. Provide detailed reproduction steps
4. Allow reasonable time for fix before disclosure

## Compliance

### Data Protection
- User data encrypted in transit (HTTPS)
- User data encrypted at rest (AWS RDS encryption)
- Passwords hashed with bcrypt
- PII access logged and monitored

### GDPR Considerations (If Applicable)
- User consent recorded
- Data retention policies defined
- User data deletion procedures
- Privacy policy displayed

## Security Testing

### Manual Testing
```bash
# Test rate limiting
for i in {1..10}; do curl http://localhost:5000/api/auth/login; done

# Test CORS
curl -H "Origin: https://malicious-site.com" http://localhost:5000/api/health

# Test security headers
curl -I http://localhost:5000/api/health
```

### Automated Testing
- OWASP ZAP baseline scan
- SQL injection testing
- XSS testing
- Authentication bypass testing

## Incident Response

### If Security Breach Occurs:
1. **Immediately:**
   - Isolate affected systems
   - Preserve evidence
   - Assess scope of breach

2. **Within 1 Hour:**
   - Notify security team
   - Begin investigation
   - Document timeline

3. **Within 24 Hours:**
   - Implement fixes
   - Test fixes thoroughly
   - Deploy to production
   - Monitor closely

4. **Within 72 Hours:**
   - Notify affected users (if required)
   - Document lessons learned
   - Update security procedures

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js Documentation](https://helmetjs.github.io/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

---

**Last Updated:** Phase 4 Implementation
**Next Review:** Before production deployment
**Maintained By:** Development Team
