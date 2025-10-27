# PHASE 1 - Partner Portal Real Data Integration
## Implementation Plan

**Timeline**: Week 1-2 (10-15 hours)
**Priority**: High
**Status**: Ready to Begin

---

## OBJECTIVE

Replace all mock data in the partner dashboard with real database queries, enabling partners to view their actual PowerConfidence scores, feedback, contractor engagements, and performance metrics.

---

## PRE-FLIGHT CHECKLIST

See `PHASE-1-PRE-FLIGHT-CHECKLIST.md` for complete verification steps.

**Critical Prerequisites:**
- ✅ Database schema verified (see PHASE-1-FIELD-REFERENCE.md)
- ✅ Exact field names documented
- ✅ Existing partner dashboard UI analyzed
- ✅ Authentication system in place (partnerAuth.js middleware)
- ⚠️ **Decision needed**: How are category scores calculated?

---

## IMPLEMENTATION TASKS

### TASK 1: Backend API Endpoints (6-8 hours)

#### 1.1 Update partnerPortalController.js
**File**: `tpe-backend/src/controllers/partnerPortalController.js`
**Status**: Needs major refactoring

**Sub-tasks:**
- [ ] Add `DATABASE-CHECKED: strategic_partners, partner_analytics, partner_leads, feedback_surveys, feedback_responses` header
- [ ] Replace mock data in `getPartnerDashboard()` with real query
- [ ] Implement PowerConfidence score fetching from `strategic_partners.power_confidence_score`
- [ ] Calculate score trend from `previous_powerconfidence_score`
- [ ] Fetch active contractor count from `contractor_partner_matches`
- [ ] Fetch total contractor engagements from `strategic_partners.total_contractor_engagements`
- [ ] Calculate industry ranking from partner comparisons
- [ ] Fetch feedback summary from `feedback_responses` + `feedback_surveys`

**Query Pattern:**
```javascript
async function getPartnerDashboard(req, res) {
  // DATABASE-CHECKED: strategic_partners, contractor_partner_matches, feedback_surveys, feedback_responses

  const partnerId = req.partner.partner_id; // From JWT token

  try {
    // Main partner data query
    const partnerQuery = `
      SELECT
        id, company_name, contact_email,
        power_confidence_score,
        previous_powerconfidence_score,
        score_trend,
        industry_rank,
        category_rank,
        average_satisfaction,
        total_feedback_responses,
        avg_contractor_satisfaction,
        total_contractor_engagements,
        completed_bookings,
        total_bookings
      FROM strategic_partners
      WHERE id = $1 AND is_active = true
    `;

    const partnerResult = await query(partnerQuery, [partnerId]);
    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const partner = partnerResult.rows[0];

    // Active contractors count
    const activeContractorsQuery = `
      SELECT COUNT(DISTINCT cpm.contractor_id) as active_contractors
      FROM contractor_partner_matches cpm
      INNER JOIN contractors c ON c.id = cpm.contractor_id
      WHERE cpm.partner_id = $1
        AND cpm.is_primary_match = true
        AND c.last_activity_at > NOW() - INTERVAL '30 days'
    `;

    const activeResult = await query(activeContractorsQuery, [partnerId]);

    // Recent feedback count
    const feedbackQuery = `
      SELECT COUNT(*) as recent_feedback_count
      FROM feedback_responses fr
      INNER JOIN feedback_surveys fs ON fs.id = fr.survey_id
      WHERE fs.partner_id = $1
        AND fr.created_at > NOW() - INTERVAL '90 days'
    `;

    const feedbackResult = await query(feedbackQuery, [partnerId]);

    // Return dashboard data
    res.json({
      success: true,
      partner: {
        id: partner.id,
        company_name: partner.company_name,
        contact_email: partner.contact_email,
        power_confidence_score: partner.power_confidence_score || 0,
        score_trend: partner.score_trend || 'stable',
        industry_rank: partner.industry_rank || 0,
        total_partners_in_category: 16, // TODO: Calculate from strategic_partners WHERE service_category = X
        recent_feedback_count: feedbackResult.rows[0].recent_feedback_count,
        avg_satisfaction: partner.average_satisfaction || 0,
        total_contractors: partner.total_contractor_engagements || 0,
        active_contractors: activeResult.rows[0].active_contractors || 0
      }
    });

  } catch (error) {
    console.error('Error fetching partner dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}
```

#### 1.2 Create New Endpoint: getQuarterlyScores()
**Purpose**: Fetch quarterly PowerConfidence score history

**Sub-tasks:**
- [ ] Create `getQuarterlyScores()` function in partnerPortalController.js
- [ ] Query `partner_analytics` WHERE metric_type = 'powerconfidence_score'
- [ ] Return last 4 quarters of data
- [ ] Calculate quarter-over-quarter changes

**Query Pattern:**
```javascript
async function getQuarterlyScores(req, res) {
  // DATABASE-CHECKED: partner_analytics

  const partnerId = req.partner.partner_id;

  const query = `
    SELECT
      period_start,
      period_end,
      metric_value as score,
      metadata
    FROM partner_analytics
    WHERE partner_id = $1
      AND metric_type = 'powerconfidence_score'
    ORDER BY period_end DESC
    LIMIT 4
  `;

  const result = await db.query(query, [partnerId]);

  res.json({
    success: true,
    quarterly_scores: result.rows.map(row => ({
      quarter: formatQuarter(row.period_end),
      score: parseInt(row.metric_value),
      period_start: row.period_start,
      period_end: row.period_end
    }))
  });
}
```

#### 1.3 Create New Endpoint: getCategoryScores()
**Purpose**: Fetch category breakdown scores

**Decision Required**: Where does this data come from?

**Options:**
1. **Option A**: Create new table `partner_category_scores`
2. **Option B**: Calculate from feedback comments using AI/NLP
3. **Option C**: Store in `partner_analytics` with different metric_types

**For MVP (Option C - Fastest):**
```sql
-- Store category scores in partner_analytics
INSERT INTO partner_analytics (partner_id, metric_type, metric_value, period_start, period_end, metadata)
VALUES
  ($1, 'category_service_quality', 91, '2024-10-01', '2024-12-31', '{"feedback_count": 12}'),
  ($1, 'category_communication', 88, '2024-10-01', '2024-12-31', '{"feedback_count": 12}'),
  ($1, 'category_results_delivered', 85, '2024-10-01', '2024-12-31', '{"feedback_count": 10}');
```

#### 1.4 Update partnerPortalRoutes.js
**File**: `tpe-backend/src/routes/partnerPortalRoutes.js`

**Sub-tasks:**
- [ ] Add route: `GET /api/partner-portal/analytics/quarterly`
- [ ] Add route: `GET /api/partner-portal/analytics/categories`
- [ ] Add route: `GET /api/partner-portal/feedback/recent`
- [ ] Add route: `GET /api/partner-portal/contractors/stats`
- [ ] Ensure all routes use `protectPartner` middleware

**Routes to Add:**
```javascript
// Quarterly scores
router.get('/analytics/quarterly', asyncHandler(getQuarterlyScores));

// Category breakdown
router.get('/analytics/categories', asyncHandler(getCategoryScores));

// Recent feedback
router.get('/feedback/recent', asyncHandler(getRecentFeedback));

// Contractor statistics
router.get('/contractors/stats', asyncHandler(getContractorStats));
```

---

### TASK 2: Frontend Data Integration (4-6 hours)

#### 2.1 Update Partner Dashboard fetchPartnerData()
**File**: `tpe-front-end/src/app/partner/dashboard/page.tsx`
**Current Line**: Lines 69-112 (mock data)

**Sub-tasks:**
- [ ] Replace mock data fetch with real API call to `/api/partner-portal/dashboard`
- [ ] Add error handling for API failures
- [ ] Add loading states
- [ ] Handle NULL/missing data gracefully
- [ ] Update TypeScript interfaces to match API response

**Code Changes:**
```typescript
const fetchPartnerData = async () => {
  try {
    setLoading(true);

    const token = getFromStorage('partnerToken');
    if (!token) {
      router.push('/partner/login');
      return;
    }

    // Fetch dashboard data
    const dashboardResponse = await fetch('/api/partner-portal/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dashboardResponse.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const dashboardData = await dashboardResponse.json();

    if (dashboardData.success) {
      setPartnerData(dashboardData.partner);
    }

    // Fetch quarterly scores
    const quarterlyResponse = await fetch('/api/partner-portal/analytics/quarterly', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const quarterlyData = await quarterlyResponse.json();

    if (quarterlyData.success) {
      setQuarterlyScores(quarterlyData.quarterly_scores);
    }

    // Fetch category scores
    const categoriesResponse = await fetch('/api/partner-portal/analytics/categories', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const categoriesData = await categoriesResponse.json();

    if (categoriesData.success) {
      setCategoryScores(categoriesData.category_scores);
    }

    setLoading(false);

  } catch (error) {
    console.error('Error fetching partner data:', error);
    setLoading(false);
    // Show error toast/message to user
  }
};
```

#### 2.2 Update TypeScript Interfaces
**File**: Same as above

**Sub-tasks:**
- [ ] Update `PartnerData` interface to match API response
- [ ] Ensure all field names use snake_case (from API)
- [ ] Add optional (?) for nullable fields
- [ ] Update `CategoryScore` interface
- [ ] Update `QuarterlyScore` interface

**Interface Updates:**
```typescript
interface PartnerData {
  id: number;
  company_name: string;
  contact_email: string;
  power_confidence_score: number;
  score_trend: 'up' | 'down' | 'stable';
  industry_rank: number;
  total_partners_in_category: number;
  recent_feedback_count: number;
  avg_satisfaction: number;
  total_contractors: number;
  active_contractors: number;
}

interface CategoryScore {
  category: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  feedback_count: number;
}

interface QuarterlyScore {
  quarter: string; // "Q4 2024"
  score: number;
  period_start: string;
  period_end: string;
}
```

#### 2.3 Remove All Mock Data
**File**: Same as above

**Sub-tasks:**
- [ ] Delete lines 78-90 (mock partnerData)
- [ ] Delete lines 92-98 (mock categoryScores)
- [ ] Delete lines 100-105 (mock quarterlyScores)
- [ ] Verify dashboard renders with real data
- [ ] Test with partners who have no feedback/leads (edge cases)

---

### TASK 3: Testing & Validation (2-3 hours)

#### 3.1 Backend API Testing
**Sub-tasks:**
- [ ] Test `/api/partner-portal/dashboard` with valid partner_id
- [ ] Test with invalid/expired JWT token
- [ ] Test with partner_id that has no data
- [ ] Verify all field names match database exactly
- [ ] Verify NULL handling for optional fields
- [ ] Test quarterly scores endpoint
- [ ] Test category scores endpoint
- [ ] Verify calculations (averages, counts) are correct

**Test Commands:**
```bash
# Login as partner first to get token
curl -X POST http://localhost:5000/api/partner-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"partner@example.com","password":"password123"}'

# Use token to fetch dashboard
curl http://localhost:5000/api/partner-portal/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Test quarterly scores
curl http://localhost:5000/api/partner-portal/analytics/quarterly \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 3.2 Frontend Integration Testing
**Sub-tasks:**
- [ ] Login to partner dashboard
- [ ] Verify PowerConfidence score displays correctly
- [ ] Verify score trend icon shows (up/down/stable)
- [ ] Verify industry ranking displays
- [ ] Check Overview tab metrics (contractors, satisfaction, response rate)
- [ ] Check Performance tab (category breakdown, quarterly trend)
- [ ] Check Feedback tab (if data exists)
- [ ] Check Insights tab (personalized recommendations)
- [ ] Test export functionality (PDF/Excel)
- [ ] Test with different partners (various data states)

#### 3.3 Edge Case Testing
**Sub-tasks:**
- [ ] Partner with no PowerConfidence score (should show 0)
- [ ] Partner with no feedback responses (should show 0)
- [ ] Partner with no contractor engagements (should show 0)
- [ ] Partner with NULL score_trend (should default to 'stable')
- [ ] Partner with no quarterly data (should show empty state)
- [ ] Expired/invalid JWT token (should redirect to login)

---

### TASK 4: Documentation & Cleanup (1 hour)

#### 4.1 Code Documentation
**Sub-tasks:**
- [ ] Add `DATABASE-CHECKED` headers to all controllers
- [ ] Document all query patterns
- [ ] Add JSDoc comments to new functions
- [ ] Update API documentation

#### 4.2 Create PHASE-1-COMPLETE.md
**Sub-tasks:**
- [ ] Document all endpoints created
- [ ] List all files modified
- [ ] Include test results
- [ ] Note any decisions made (e.g., category scores approach)
- [ ] Capture any technical debt or future improvements

---

## DELIVERABLES

### Backend
- ✅ `partnerPortalController.js` - Updated with real database queries
- ✅ `partnerPortalRoutes.js` - New analytics and stats routes
- ✅ Database queries tested and verified
- ✅ Error handling and NULL value handling

### Frontend
- ✅ `partner/dashboard/page.tsx` - Real API integration
- ✅ TypeScript interfaces updated
- ✅ Mock data removed
- ✅ Error states and loading states

### Documentation
- ✅ `PHASE-1-COMPLETE.md` - Completion summary
- ✅ API endpoint documentation
- ✅ Test results and validation

---

## DEPENDENCIES

### Required for Phase 1
- [x] PostgreSQL database with partner data
- [x] Existing authentication system (partnerAuth.js)
- [x] Partner users table with at least one test partner
- [x] Existing dashboard UI (already built)

### Blockers
- [ ] **Decision**: How to calculate/store category scores?
- [ ] **Data**: Do we have quarterly analytics data in partner_analytics?
- [ ] **Data**: Do we have feedback survey responses in feedback_responses?

---

## SUCCESS CRITERIA

### Must Have
- [ ] Partners can log in and see their actual PowerConfidence score
- [ ] Dashboard shows real contractor engagement data
- [ ] Quarterly trend shows actual historical scores
- [ ] No mock data remaining in production code
- [ ] All API endpoints return real database data
- [ ] API response time < 500ms

### Nice to Have
- [ ] Category breakdown scores display (if data available)
- [ ] Feedback highlights show real contractor comments
- [ ] Industry ranking calculates dynamically

### Phase 1 Complete When:
- [ ] All "Must Have" criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Code reviewed and merged
- [ ] Deployed to staging environment

---

## RISKS & MITIGATION

### Risk 1: Category Scores Data Missing
**Impact**: High (core dashboard feature)
**Mitigation**: Use Option C (partner_analytics) for MVP, plan proper implementation in Phase 2

### Risk 2: No Quarterly Analytics Data
**Impact**: Medium (affects trend visualization)
**Mitigation**: Show empty state or calculate from current score, backfill data in Phase 2

### Risk 3: Performance Issues with Complex Queries
**Impact**: Low (small dataset)
**Mitigation**: Add database indexes on partner_id, contractor_id, survey_id

---

## NEXT STEPS AFTER PHASE 1

Once Phase 1 is complete, move to:
- **Phase 2**: Profile Management (allow partners to edit their profiles)
- **Phase 3**: Lead Management (contractor pipeline tracking)

---

**Document Created**: October 24, 2025
**Status**: Ready to Begin
**Estimated Completion**: 2 weeks (10-15 hours)
