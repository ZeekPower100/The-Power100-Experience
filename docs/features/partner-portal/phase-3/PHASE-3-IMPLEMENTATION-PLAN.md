# PHASE 3 - Lead Management & Contractor Pipeline
## Implementation Plan

**Timeline**: Week 5-6 (16-20 hours)
**Priority**: High
**Status**: Ready to Begin

---

## OBJECTIVE

Enable partners to view and manage contractors they've been matched with, track engagement stages, manage follow-ups, and analyze lead conversion rates - transforming the partner portal into a complete CRM for managing their TPX contractor pipeline.

---

## PRE-FLIGHT CHECKLIST

See `PHASE-3-PRE-FLIGHT-CHECKLIST.md` for complete verification steps.

**Critical Prerequisites:**
- ✅ Phase 2 Complete (Partner profile management working)
- ✅ Database schema verified (contractor_partner_matches, contractors tables)
- ✅ Match data exists in database
- ⚠️ **Decision needed**: Lead stage workflow (stages, status progression)
- ⚠️ **Decision needed**: Note/activity tracking requirements

---

## IMPLEMENTATION TASKS

### TASK 1: Backend Lead Management API (8-10 hours)

#### 1.1 Create getPartnerLeads() Function
**File**: `tpe-backend/src/controllers/partnerPortalController.js`
**Purpose**: Fetch all contractors matched to partner with engagement details

**Sub-tasks:**
- [ ] Add function to get all contractor matches for partner
- [ ] Include contractor details (name, company, contact info)
- [ ] Include match metadata (score, reasons, date)
- [ ] Include engagement status and stage
- [ ] Parse JSON fields (focus_areas, business_challenges)
- [ ] Sort by match score and recency
- [ ] Add pagination support (limit/offset)
- [ ] Add filtering by stage, status, date range
- [ ] Add `DATABASE-CHECKED: contractor_partner_matches, contractors` header

**Query Pattern:**
```javascript
async function getPartnerLeads(req, res) {
  // DATABASE-CHECKED: contractor_partner_matches, contractors

  const partnerId = req.partnerId || req.partnerUser.partnerId;
  const { stage, status, limit = 50, offset = 0, search } = req.query;

  try {
    let filterConditions = ['cpm.partner_id = $1'];
    let params = [partnerId];
    let paramIndex = 2;

    // Add stage filter
    if (stage) {
      filterConditions.push(`cpm.engagement_stage = $${paramIndex}`);
      params.push(stage);
      paramIndex++;
    }

    // Add status filter
    if (status) {
      filterConditions.push(`cpm.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Add search filter
    if (search) {
      filterConditions.push(`(
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.company_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = filterConditions.join(' AND ');

    const leadsQuery = `
      SELECT
        cpm.id as match_id,
        cpm.contractor_id,
        cpm.match_score,
        cpm.match_reasons,
        cpm.is_primary_match,
        cpm.status,
        cpm.engagement_stage,
        cpm.last_contact_date,
        cpm.next_follow_up_date,
        cpm.notes,
        cpm.created_at as matched_date,

        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.company_name,
        c.company_size,
        c.revenue_tier,
        c.focus_areas,
        c.business_challenges,
        c.stage as contractor_stage

      FROM contractor_partner_matches cpm
      INNER JOIN contractors c ON c.id = cpm.contractor_id
      WHERE ${whereClause}
      ORDER BY cpm.match_score DESC, cpm.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await query(leadsQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM contractor_partner_matches cpm
      INNER JOIN contractors c ON c.id = cpm.contractor_id
      WHERE ${whereClause}
    `;

    const countResult = await query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total || 0);

    // Parse JSON fields
    const leads = result.rows.map(lead => ({
      ...lead,
      match_reasons: safeJsonParse(lead.match_reasons) || [],
      focus_areas: safeJsonParse(lead.focus_areas) || [],
      business_challenges: safeJsonParse(lead.business_challenges) || [],
      notes: safeJsonParse(lead.notes) || []
    }));

    res.json({
      success: true,
      leads,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error.message
    });
  }
}
```

#### 1.2 Create getLeadDetails() Function
**Purpose**: Get complete details for a specific contractor lead

**Sub-tasks:**
- [ ] Add function to get single contractor with full details
- [ ] Include all match metadata
- [ ] Include engagement history
- [ ] Include notes and activities
- [ ] Verify partner has access to this contractor
- [ ] Return comprehensive contractor profile

**Query Pattern:**
```javascript
async function getLeadDetails(req, res) {
  // DATABASE-CHECKED: contractor_partner_matches, contractors

  const partnerId = req.partnerId || req.partnerUser.partnerId;
  const { contractorId } = req.params;

  try {
    const detailsQuery = `
      SELECT
        cpm.*,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.company_name,
        c.company_size,
        c.revenue_tier,
        c.industry,
        c.focus_areas,
        c.business_challenges,
        c.goals_12_months,
        c.budget_range,
        c.timeline,
        c.stage as contractor_stage,
        c.created_at as contractor_joined_date

      FROM contractor_partner_matches cpm
      INNER JOIN contractors c ON c.id = cpm.contractor_id
      WHERE cpm.partner_id = $1 AND cpm.contractor_id = $2
    `;

    const result = await query(detailsQuery, [partnerId, contractorId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contractor not found or not matched to your profile'
      });
    }

    const lead = result.rows[0];

    // Parse JSON fields
    lead.match_reasons = safeJsonParse(lead.match_reasons) || [];
    lead.focus_areas = safeJsonParse(lead.focus_areas) || [];
    lead.business_challenges = safeJsonParse(lead.business_challenges) || [];
    lead.goals_12_months = safeJsonParse(lead.goals_12_months) || [];
    lead.notes = safeJsonParse(lead.notes) || [];

    res.json({
      success: true,
      lead
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching lead details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead details',
      error: error.message
    });
  }
}
```

#### 1.3 Create updateLeadStatus() Function
**Purpose**: Update engagement stage, status, and follow-up dates

**Sub-tasks:**
- [ ] Add function to update lead engagement fields
- [ ] Validate stage transitions
- [ ] Update last_contact_date when status changes
- [ ] Auto-calculate next_follow_up_date based on stage
- [ ] Return updated lead data
- [ ] Add validation for allowed stages/statuses

**Update Pattern:**
```javascript
async function updateLeadStatus(req, res) {
  // DATABASE-CHECKED: contractor_partner_matches

  const partnerId = req.partnerId || req.partnerUser.partnerId;
  const { contractorId } = req.params;
  const {
    engagement_stage,
    status,
    last_contact_date,
    next_follow_up_date
  } = req.body;

  try {
    // Validate allowed values
    const allowedStages = ['new', 'contacted', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'won', 'lost', 'nurturing'];
    const allowedStatuses = ['active', 'inactive', 'converted', 'rejected'];

    if (engagement_stage && !allowedStages.includes(engagement_stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid engagement stage. Allowed: ${allowedStages.join(', ')}`
      });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
      });
    }

    const updateQuery = `
      UPDATE contractor_partner_matches
      SET
        engagement_stage = COALESCE($3, engagement_stage),
        status = COALESCE($4, status),
        last_contact_date = COALESCE($5, last_contact_date),
        next_follow_up_date = COALESCE($6, next_follow_up_date),
        updated_at = NOW()
      WHERE partner_id = $1 AND contractor_id = $2
      RETURNING *
    `;

    const result = await query(updateQuery, [
      partnerId,
      contractorId,
      engagement_stage || null,
      status || null,
      last_contact_date || null,
      next_follow_up_date || null
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const updatedLead = result.rows[0];
    updatedLead.match_reasons = safeJsonParse(updatedLead.match_reasons) || [];
    updatedLead.notes = safeJsonParse(updatedLead.notes) || [];

    res.json({
      success: true,
      message: 'Lead status updated successfully',
      lead: updatedLead
    });

  } catch (error) {
    console.error('[Partner Portal] Error updating lead status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update lead status',
      error: error.message
    });
  }
}
```

#### 1.4 Create addLeadNote() Function
**Purpose**: Add notes and activities to contractor leads

**Sub-tasks:**
- [ ] Add function to append notes to leads
- [ ] Store notes as JSON array
- [ ] Include timestamp and note text
- [ ] Update last_contact_date when note added
- [ ] Return updated notes array

**Note Pattern:**
```javascript
async function addLeadNote(req, res) {
  // DATABASE-CHECKED: contractor_partner_matches

  const partnerId = req.partnerId || req.partnerUser.partnerId;
  const { contractorId } = req.params;
  const { note } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Note text is required'
    });
  }

  try {
    // Get current notes
    const getCurrentQuery = `
      SELECT notes FROM contractor_partner_matches
      WHERE partner_id = $1 AND contractor_id = $2
    `;

    const currentResult = await query(getCurrentQuery, [partnerId, contractorId]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found'
      });
    }

    const currentNotes = safeJsonParse(currentResult.rows[0].notes) || [];

    // Add new note
    const newNote = {
      id: Date.now(),
      text: note.trim(),
      created_at: new Date().toISOString(),
      created_by: 'partner' // Could include partner user name
    };

    currentNotes.unshift(newNote); // Add to beginning

    // Update with new notes
    const updateQuery = `
      UPDATE contractor_partner_matches
      SET
        notes = $3,
        last_contact_date = NOW(),
        updated_at = NOW()
      WHERE partner_id = $1 AND contractor_id = $2
      RETURNING notes
    `;

    const result = await query(updateQuery, [
      partnerId,
      contractorId,
      safeJsonStringify(currentNotes)
    ]);

    res.json({
      success: true,
      message: 'Note added successfully',
      notes: safeJsonParse(result.rows[0].notes) || []
    });

  } catch (error) {
    console.error('[Partner Portal] Error adding note:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
}
```

#### 1.5 Create getLeadStats() Function
**Purpose**: Get pipeline analytics and conversion metrics

**Sub-tasks:**
- [ ] Add function to calculate lead statistics
- [ ] Count leads by stage
- [ ] Count leads by status
- [ ] Calculate conversion rates
- [ ] Track follow-up compliance
- [ ] Return aggregated metrics

**Stats Pattern:**
```javascript
async function getLeadStats(req, res) {
  // DATABASE-CHECKED: contractor_partner_matches

  const partnerId = req.partnerId || req.partnerUser.partnerId;

  try {
    // Leads by stage
    const stageQuery = `
      SELECT
        engagement_stage,
        COUNT(*) as count,
        AVG(match_score) as avg_match_score
      FROM contractor_partner_matches
      WHERE partner_id = $1
      GROUP BY engagement_stage
      ORDER BY engagement_stage
    `;

    const stageResult = await query(stageQuery, [partnerId]);

    // Leads by status
    const statusQuery = `
      SELECT status, COUNT(*) as count
      FROM contractor_partner_matches
      WHERE partner_id = $1
      GROUP BY status
    `;

    const statusResult = await query(statusQuery, [partnerId]);

    // Follow-ups due
    const followUpQuery = `
      SELECT COUNT(*) as overdue_count
      FROM contractor_partner_matches
      WHERE partner_id = $1
        AND next_follow_up_date IS NOT NULL
        AND next_follow_up_date < NOW()
        AND status = 'active'
    `;

    const followUpResult = await query(followUpQuery, [partnerId]);

    // Total leads and conversion rate
    const totalsQuery = `
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'converted') as converted_leads,
        COUNT(*) FILTER (WHERE is_primary_match = true) as primary_matches
      FROM contractor_partner_matches
      WHERE partner_id = $1
    `;

    const totalsResult = await query(totalsQuery, [partnerId]);

    const totals = totalsResult.rows[0];
    const conversionRate = totals.total_leads > 0
      ? ((totals.converted_leads / totals.total_leads) * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      stats: {
        total_leads: parseInt(totals.total_leads),
        converted_leads: parseInt(totals.converted_leads),
        primary_matches: parseInt(totals.primary_matches),
        conversion_rate: parseFloat(conversionRate),
        overdue_followups: parseInt(followUpResult.rows[0]?.overdue_count || 0),
        by_stage: stageResult.rows,
        by_status: statusResult.rows
      }
    });

  } catch (error) {
    console.error('[Partner Portal] Error fetching lead stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead statistics',
      error: error.message
    });
  }
}
```

#### 1.6 Update partnerPortalRoutes.js
**File**: `tpe-backend/src/routes/partnerPortalRoutes.js`

**Sub-tasks:**
- [ ] Add route: `GET /api/partner-portal/leads`
- [ ] Add route: `GET /api/partner-portal/leads/:contractorId`
- [ ] Add route: `PUT /api/partner-portal/leads/:contractorId/status`
- [ ] Add route: `POST /api/partner-portal/leads/:contractorId/notes`
- [ ] Add route: `GET /api/partner-portal/leads/stats`
- [ ] Ensure all routes use `protectPartner` middleware

**Routes to Add:**
```javascript
// Lead management
router.get('/leads', asyncHandler(getPartnerLeads));
router.get('/leads/stats', asyncHandler(getLeadStats));
router.get('/leads/:contractorId', asyncHandler(getLeadDetails));
router.put('/leads/:contractorId/status', asyncHandler(updateLeadStatus));
router.post('/leads/:contractorId/notes', asyncHandler(addLeadNote));
```

---

### TASK 2: Frontend Lead Management UI (8-10 hours)

#### 2.1 Create Leads Dashboard Page
**File**: `tpe-front-end/src/app/partner/leads/page.tsx`
**Purpose**: Main leads pipeline view

**Sub-tasks:**
- [ ] Create new page at `/partner/leads`
- [ ] Fetch leads list on mount
- [ ] Display leads in kanban board (by stage)
- [ ] Display leads in list view (alternative)
- [ ] Add search and filter controls
- [ ] Show lead statistics cards at top
- [ ] Add pagination for large lead lists
- [ ] Click lead to view details
- [ ] Add "Add Note" quick action

**Page Structure:**
```tsx
export default function PartnerLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [filters, setFilters] = useState({
    stage: '',
    status: '',
    search: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [filters]);

  const fetchLeads = async () => {
    // Fetch from /api/partner-portal/leads
  };

  const fetchStats = async () => {
    // Fetch from /api/partner-portal/leads/stats
  };

  return (
    <div className="min-h-screen bg-power100-bg-grey p-6">
      {/* Stats Cards */}
      <LeadStatsCards stats={stats} />

      {/* Filters and View Toggle */}
      <LeadFilters filters={filters} onChange={setFilters} />

      {/* Kanban or List View */}
      {viewMode === 'kanban' ? (
        <LeadKanbanBoard leads={leads} onUpdate={fetchLeads} />
      ) : (
        <LeadListView leads={leads} onUpdate={fetchLeads} />
      )}
    </div>
  );
}
```

#### 2.2 Create Lead Kanban Board Component
**File**: `tpe-front-end/src/components/partner/LeadKanbanBoard.tsx`
**Purpose**: Visual pipeline with drag-and-drop

**Sub-tasks:**
- [ ] Create kanban columns for each stage
- [ ] Display lead cards in columns
- [ ] Add drag-and-drop between stages
- [ ] Update status when card moved
- [ ] Show lead score and match reasons
- [ ] Add quick actions (note, contact)
- [ ] Handle empty states

#### 2.3 Create Lead Details Modal
**File**: `tpe-front-end/src/components/partner/LeadDetailsModal.tsx`
**Purpose**: Full contractor details and interaction history

**Sub-tasks:**
- [ ] Create modal/drawer for lead details
- [ ] Display all contractor information
- [ ] Show match score and reasons
- [ ] Display engagement timeline
- [ ] Show all notes and activities
- [ ] Add form to add new notes
- [ ] Update status and follow-up dates
- [ ] Add contact buttons (email, phone)

#### 2.4 Create Lead Stats Cards Component
**File**: `tpe-front-end/src/components/partner/LeadStatsCards.tsx`
**Purpose**: Pipeline metrics overview

**Sub-tasks:**
- [ ] Create stat cards for key metrics
- [ ] Total leads count
- [ ] Conversion rate
- [ ] Overdue follow-ups (with warning)
- [ ] Primary matches count
- [ ] Click to filter by metric

#### 2.5 Add Leads Link to Dashboard
**File**: `tpe-front-end/src/app/partner/dashboard/page.tsx`

**Sub-tasks:**
- [ ] Add "Manage Leads" button/card
- [ ] Link to `/partner/leads`
- [ ] Show lead count preview

---

### TASK 3: Database Schema Verification (1-2 hours)

#### 3.1 Verify contractor_partner_matches Table
**Sub-tasks:**
- [ ] Check `engagement_stage` field exists
- [ ] Check `status` field exists
- [ ] Check `last_contact_date` field exists
- [ ] Check `next_follow_up_date` field exists
- [ ] Check `notes` field exists (JSON text)
- [ ] Add missing fields if necessary

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_partner_matches' AND column_name IN ('engagement_stage', 'status', 'last_contact_date', 'next_follow_up_date', 'notes') ORDER BY column_name;\""
```

#### 3.2 Add Missing Columns (if needed)
**Migration Commands:**
```sql
-- Add engagement tracking fields if missing
ALTER TABLE contractor_partner_matches
  ADD COLUMN IF NOT EXISTS engagement_stage VARCHAR(50) DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS notes TEXT; -- Stores JSON array
```

---

### TASK 4: Testing & Documentation (2-3 hours)

#### 4.1 Backend API Testing
**Sub-tasks:**
- [ ] Test GET /api/partner-portal/leads (with filters)
- [ ] Test GET /api/partner-portal/leads/:contractorId
- [ ] Test PUT /api/partner-portal/leads/:contractorId/status
- [ ] Test POST /api/partner-portal/leads/:contractorId/notes
- [ ] Test GET /api/partner-portal/leads/stats
- [ ] Verify pagination works
- [ ] Verify JSON field parsing

**Test Commands:**
```bash
# Get all leads
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/partner-portal/leads

# Get leads filtered by stage
curl -H "Authorization: Bearer TOKEN" "http://localhost:5000/api/partner-portal/leads?stage=contacted"

# Get lead details
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/partner-portal/leads/123

# Update lead status
curl -X PUT -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"engagement_stage":"meeting_scheduled","next_follow_up_date":"2025-11-01T10:00:00Z"}' \
  http://localhost:5000/api/partner-portal/leads/123/status

# Add note
curl -X POST -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note":"Had great call, scheduling demo for next week"}' \
  http://localhost:5000/api/partner-portal/leads/123/notes

# Get stats
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/partner-portal/leads/stats
```

#### 4.2 Frontend Integration Testing
**Sub-tasks:**
- [ ] Login as partner
- [ ] Navigate to Leads page
- [ ] Verify all leads display
- [ ] Test kanban board drag-and-drop
- [ ] Test list view sorting
- [ ] Test filters and search
- [ ] View lead details
- [ ] Add note to lead
- [ ] Update lead status
- [ ] Verify stats update

---

## DELIVERABLES

### Backend
- ✅ 5 new API endpoints for lead management
- ✅ Lead filtering and search
- ✅ Engagement stage tracking
- ✅ Note/activity logging
- ✅ Pipeline analytics

### Frontend
- ✅ Leads dashboard page
- ✅ Kanban board view
- ✅ List view (alternative)
- ✅ Lead details modal
- ✅ Stats cards
- ✅ Search and filters

### Database
- ✅ Schema verification
- ✅ Missing columns added
- ✅ Engagement tracking fields

### Documentation
- ✅ PHASE-3-COMPLETE.md
- ✅ API endpoint documentation
- ✅ Lead stage workflow

---

## SUCCESS CRITERIA

### Must Have
- [ ] Partners can view all matched contractors
- [ ] Partners can update engagement stages
- [ ] Partners can add notes to leads
- [ ] Partners can filter/search leads
- [ ] Pipeline stats display correctly
- [ ] Lead details show complete information

### Nice to Have
- [ ] Drag-and-drop kanban board
- [ ] Follow-up reminders/notifications
- [ ] Export leads to CSV
- [ ] Email integration (click to email)

### Phase 3 Complete When:
- [ ] All "Must Have" criteria met
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Deployed and functional

---

**Document Created**: October 25, 2025
**Status**: Ready to Begin
**Estimated Completion**: 2-3 weeks (16-20 hours)
