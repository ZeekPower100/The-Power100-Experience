# PCR System - Future Features Roadmap

## 🎯 Overview
Additional features needed to complete the PCR (PowerConfidence Rating) system beyond the core scoring engine.

---

## 📋 Phase 4: Client & Employee Management System

### **Feature 1: Partner Client/Employee Registry**

**Purpose:** Track all clients and employees of each partner for quarterly feedback campaigns.

**Database Tables Needed:**
```sql
-- Partner Clients (companies/individuals receiving partner's services)
CREATE TABLE partner_clients (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),

  -- Basic Info (provided by partner)
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255) NOT NULL,
  client_phone VARCHAR(20),
  client_company_website VARCHAR(500),

  -- Relationship Info
  relationship_start_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Feedback History
  powercard_campaigns_sent INTEGER DEFAULT 0,
  powercard_responses_submitted INTEGER DEFAULT 0,
  last_feedback_date TIMESTAMP,
  average_feedback_score DECIMAL(5,2),

  -- Metadata
  added_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Partner Employees (staff working at partner company)
CREATE TABLE partner_employees (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),

  -- Basic Info (provided by partner)
  employee_name VARCHAR(255) NOT NULL,
  employee_email VARCHAR(255) NOT NULL,
  employee_phone VARCHAR(20),
  employee_role VARCHAR(100), -- e.g., "Sales Manager", "Account Executive"

  -- Employment Info
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Feedback History
  powercard_campaigns_sent INTEGER DEFAULT 0,
  powercard_responses_submitted INTEGER DEFAULT 0,
  last_feedback_date TIMESTAMP,
  average_feedback_score DECIMAL(5,2),

  -- Metadata
  added_by INTEGER REFERENCES admin_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PowerCard Response Tracking (links responses to specific individuals)
CREATE TABLE powercard_individual_responses (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES powercard_campaigns(id),
  partner_id INTEGER REFERENCES strategic_partners(id),

  -- Respondent Info (ONE of these will be filled)
  client_id INTEGER REFERENCES partner_clients(id),
  employee_id INTEGER REFERENCES partner_employees(id),
  respondent_type VARCHAR(20) CHECK (respondent_type IN ('client', 'employee')),

  -- Survey Responses
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 0 AND 10),
  recommendation_score INTEGER CHECK (recommendation_score BETWEEN 0 AND 10),
  standard_metric_scores JSONB, -- {quality: 8, timeliness: 9, communication: 7}
  custom_metric_score INTEGER CHECK (custom_metric_score BETWEEN 0 AND 10),

  -- Response Metadata
  submitted_at TIMESTAMP DEFAULT NOW(),
  response_time_seconds INTEGER, -- Time taken to complete survey
  device_type VARCHAR(50), -- mobile/desktop/tablet

  UNIQUE(campaign_id, client_id),
  UNIQUE(campaign_id, employee_id)
);

CREATE INDEX idx_partner_clients_partner ON partner_clients(partner_id);
CREATE INDEX idx_partner_clients_email ON partner_clients(client_email);
CREATE INDEX idx_partner_employees_partner ON partner_employees(partner_id);
CREATE INDEX idx_powercard_responses_campaign ON powercard_individual_responses(campaign_id);
CREATE INDEX idx_powercard_responses_partner ON powercard_individual_responses(partner_id);
```

**Admin Features:**
- View all clients/employees for a partner
- See individual PowerCard response history
- Track response rates (who responded vs. who didn't)
- View individual scores and feedback (admin only)

**Partner Features (Portal View):**
- See ONLY aggregated data:
  - Total responses: "12 out of 15 clients responded"
  - Average scores: "Client Satisfaction: 8.5/10"
  - Trends: "+0.3 from last quarter"
  - Distribution: "8 promoters, 3 passives, 1 detractor"
- NO access to individual names or scores

**Data Privacy Rules:**
- Partners provide the list (they know who they sent to)
- Partners see ONLY aggregate results (anonymized feedback)
- TPX admins see everything (for quality control and issue resolution)
- Individual responses stored separately from aggregated PCR data

---

## 📧 Phase 5: Automated Communication System

### **Feature 2: Quarterly Campaign Automation**

**Workflow:**
```
Day 1 of Quarter:
  → System identifies partners due for quarterly feedback
  → Pulls master list of active clients + employees for each partner
  → Creates PowerCard campaign with standard questions + partner's custom metric
  → Sends personalized survey links via SMS/email

Day 7 of Quarter:
  → Automated reminder to non-responders
  → "You're invited to provide feedback on [Partner Name]..."

Day 14 of Quarter:
  → Final reminder to non-responders

Day 21-30 of Quarter:
  → Campaign closes
  → Process responses and update PCR scores
  → Generate partner report (aggregated data only)
  → Send report to partner via email
  → Trigger momentum/badge recalculation
```

**Communication Templates Needed:**
1. Initial survey invitation (SMS + Email)
2. Reminder 1 (SMS + Email)
3. Reminder 2 (SMS only - final nudge)
4. Thank you message (after submission)
5. Partner report email (with aggregated results PDF)

**Database Table:**
```sql
CREATE TABLE pcr_communication_log (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES powercard_campaigns(id),

  -- Recipient
  recipient_type VARCHAR(20) CHECK (recipient_type IN ('client', 'employee', 'partner')),
  client_id INTEGER REFERENCES partner_clients(id),
  employee_id INTEGER REFERENCES partner_employees(id),
  partner_id INTEGER REFERENCES strategic_partners(id),

  -- Communication Details
  communication_type VARCHAR(50), -- 'initial_survey', 'reminder_1', 'reminder_2', 'thank_you', 'partner_report'
  channel VARCHAR(20) CHECK (channel IN ('sms', 'email', 'both')),
  sent_at TIMESTAMP DEFAULT NOW(),
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,

  -- Message Content
  subject VARCHAR(500),
  message_body TEXT,

  -- Status
  delivery_status VARCHAR(50), -- 'sent', 'delivered', 'bounced', 'failed'
  error_message TEXT
);
```

---

## 🎨 Phase 6: Custom Metrics System

### **Feature 3: Dynamic Custom Metric per Quarter**

**Database Schema:**
```sql
ALTER TABLE powercard_campaigns ADD COLUMN custom_metric_question VARCHAR(500);
ALTER TABLE powercard_campaigns ADD COLUMN custom_metric_label VARCHAR(100);

-- Example data:
-- Q1 2025: custom_metric_question = "How satisfied are you with installation quality?"
--          custom_metric_label = "Installation Quality"
-- Q2 2025: custom_metric_question = "How would you rate our response time?"
--          custom_metric_label = "Response Time"
```

**Partner Portal Feature:**
- Before each campaign, partner selects/enters custom metric
- System validates and stores it
- PowerCards dynamically include this question
- Results stored in `powercard_individual_responses.custom_metric_score`
- Historical custom metrics stored but not repeated in future surveys

**Admin Analytics:**
- View custom metric trends for partner across quarters
- Compare custom metrics across different partners
- Identify common custom metrics industry-wide

---

## 🚀 Implementation Priority

1. **Phase 4 - Client/Employee Registry** (MUST HAVE for Q1 2025 feedback)
   - Build database tables
   - Create admin interface to view/manage clients/employees
   - Build partner portal to upload client/employee lists

2. **Phase 5 - Automated Communication** (MUST HAVE for Q1 2025 feedback)
   - Build campaign scheduling system
   - Create SMS/email templates
   - Integrate with PowerCards system

3. **Phase 6 - Custom Metrics** (SHOULD HAVE for Q1 2025 feedback)
   - Add custom metric selection to partner portal
   - Update PowerCards to include dynamic questions
   - Build analytics for custom metric trends

---

## ✅ Testing Implications

**Does this relate to current end-to-end test?**

**YES - Partially:**
- ✅ Custom metrics: Should verify this exists and works in current test
- ❌ Client/Employee registry: Not built yet, so can't test
- ❌ Automated communication: Not built yet, so can't test

**Current Test Scope:**
- Test existing PowerCards integration
- Verify custom metric field exists and flows through
- Manual simulation of campaign completion

**Future Test Scope (after features built):**
- Test client/employee upload by partner
- Test automated campaign scheduling
- Test SMS/email delivery and tracking
- Test response rate tracking
- Test partner anonymized reporting

---

## 📊 Current vs Future State

**Current (Phase 1-3 Complete):**
- ✅ PCR calculation engine
- ✅ Momentum modifiers
- ✅ Badge system
- ✅ PowerCards integration (basic)
- ✅ Admin analytics

**Future (Phase 4-6 Needed):**
- ❌ Client/employee management
- ❌ Automated quarterly campaigns
- ❌ SMS/email automation
- ❌ Partner anonymized reporting
- ❌ Custom metric selection interface

---

**Next Steps:**
1. Complete current PCR end-to-end test (Phases 1-3)
2. Verify custom metric field exists in database
3. Plan Phase 4-6 implementation timeline
4. Build client/employee registry before Q1 2025 feedback cycle
