# CEO PowerConfidence Rating (PCR) System - Complete Overview

**Document Version:** 1.0
**Date:** November 14, 2025
**Status:** READY FOR PLANNING
**Owner:** Greg Cummings & Development Team

---

## 🎯 Vision & Purpose

### The Problem
CEOs and contractors in the Power100 ecosystem need a way to measure and improve their **company culture** and **employee satisfaction**. Currently:
- No systematic employee feedback collection
- No visibility into how employees perceive leadership
- No benchmark for cultural health over time
- No actionable insights for improvement

### The Solution
**CEO PCR System**: An employee-focused trust and culture rating that:
- Collects anonymous quarterly feedback from employees
- Measures leadership effectiveness and company culture
- Provides CEOs with actionable insights
- Tracks cultural health trends over time
- Integrates with AI Concierge for personalized recommendations

### Core Vision

> "Culture and leadership quality are the foundation of business success. Measuring employee satisfaction gives CEOs the insights they need to build stronger teams."

The system measures:
1. **Employee Satisfaction** - How happy employees are
2. **Leadership Effectiveness** - How well the CEO leads
3. **Company Culture** - Work environment quality
4. **Growth & Development** - Career opportunity perception

---

## 🧠 Core Concept

### What Is CEO PCR?

CEO PCR is a **0-100 score** that reflects:
- Employee satisfaction with leadership
- Company culture strength
- Overall employee experience
- Quarterly performance trends

### Simplified Formula

```
Step 1: Employee Feedback Score (0-100)
  = Average of quarterly PowerCard responses from employees

Step 2: Trend Modifier (±5 points)
  = Based on quarterly improvement/decline patterns

Step 3: Final CEO PCR (0-105)
  = Employee Feedback Score ± Trend Modifier
```

**Key Difference from Partner PCR:**
- NO payment tier multipliers
- NO customer feedback
- NO profile completion scoring
- ONLY employee satisfaction data
- Much simpler calculation

---

## 📊 System Components

### Component 1: Employee Feedback Collection

**Purpose:** Gather anonymous quarterly feedback from all employees

**Collection Method:**
- **Email invitations** to all registered employees
- **SMS reminders** for completion
- **PowerCard surveys** with standardized questions
- **Anonymous responses** (employees cannot be identified)

**Quarterly Schedule:**
```
Q1: January collection → February reports
Q2: April collection → May reports
Q3: July collection → August reports
Q4: October collection → November reports
```

**PowerCard Questions** (4 core areas, 10 questions total):

#### Leadership Effectiveness (3 questions)
1. How would you rate your CEO's communication and transparency?
2. How confident are you in the company's direction under current leadership?
3. How well does leadership respond to employee concerns?

#### Company Culture (3 questions)
4. How would you describe the overall work environment?
5. How valued do you feel as an employee?
6. How well does the company live its stated values?

#### Growth & Development (2 questions)
7. How satisfied are you with career growth opportunities?
8. How well does the company invest in employee development?

#### Overall Satisfaction (2 questions)
9. How likely are you to recommend this company as a great place to work? (NPS)
10. Overall, how satisfied are you working here?

**Scoring:** Each question rated 0-100, averaged for final score

---

### Component 2: Employee Management System

**Purpose:** Track and manage employee roster for accurate feedback collection

**Employee Record Requirements:**
- Full name
- Email address
- Phone number (for SMS)
- Department/role
- Hire date
- Active status (employed/terminated)

**Features:**
- Bulk employee import (CSV)
- Individual employee add/edit/remove
- Employee status management
- Opt-in/opt-out tracking for communications
- Anonymous response linking (via unique tokens)

**Data Storage:**
```sql
-- New table: company_employees
CREATE TABLE company_employees (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  department VARCHAR(100),
  role_title VARCHAR(100),
  hire_date DATE,
  is_active BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT true,
  email_opt_in BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### Component 3: Anonymous Feedback System

**Purpose:** Ensure employee honesty through complete anonymity

**How It Works:**
1. System generates unique survey token for each employee
2. Token links to employee record but doesn't reveal identity in results
3. CEO sees aggregate scores only, never individual responses
4. Minimum 3 employees required to show results (prevent identification)

**Privacy Guarantees:**
- Individual responses never shown to CEO
- Results only displayed as averages
- No way to trace answers back to specific employees
- Data encrypted at rest and in transit

---

### Component 4: Trend Modifier (±5 Points)

**Purpose:** Recognize cultural improvement or decline over time

**Calculation:**
```javascript
// Analyze last 3 quarterly scores
const trend = analyzeQuarterlyTrend(ceo);

if (trend === 'improving_3_quarters') {
  modifier = +5;  // Strong improvement
} else if (trend === 'declining_2_quarters') {
  modifier = -5;  // Needs attention
} else {
  modifier = 0;   // Stable
}

Final CEO PCR = Base Score + modifier;
```

**Trend Definitions:**
- **Strong Improvement (+5)**: Score improved for 3+ consecutive quarters
- **Stable (0)**: Fluctuations within ±3 points
- **Declining (-5)**: Score dropped for 2+ consecutive quarters
- **New CEO (0)**: < 2 quarters of data

---

## 🔄 Complete System Flow

### Scenario 1: New CEO Onboards Employees

**Step 1: Employee Registration**
- CEO uploads employee list (CSV) or adds manually
- System sends opt-in requests via email/SMS
- Employees confirm participation

**Step 2: First Quarterly Survey (Q1)**
- System sends PowerCard survey links to all employees
- Email + SMS reminders over 2-week collection window
- Responses collected anonymously

**Sample Results:**
```
Total Employees: 15
Responses: 12 (80% response rate)

Leadership Effectiveness: 78/100
Company Culture: 82/100
Growth & Development: 74/100
Overall Satisfaction: 80/100

Average Employee Feedback Score: 78.5/100
Trend Modifier: 0 (first quarter)

Final CEO PCR: 78.5
```

**CEO Dashboard Shows:**
- Overall CEO PCR score
- Breakdown by category
- Response rate
- Anonymous comments (optional)
- Comparison to industry benchmarks

---

### Scenario 2: CEO After 3 Quarters (Improvement Trend)

**Quarterly Progression:**
```
Q1 2025: Base Score 78.5 → Final PCR 78.5 (no trend yet)
Q2 2025: Base Score 81.2 → Final PCR 81.2 (+2.7 improvement)
Q3 2025: Base Score 83.8 → Final PCR 83.8 (+2.6 improvement)
Q4 2025: Base Score 84.1 → Final PCR 89.1 (+5 improvement bonus)
```

**What Changed:**
- CEO addressed employee concerns from Q1 feedback
- Implemented new professional development program
- Improved communication transparency
- Results: Culture score improved, trend bonus earned

---

### Scenario 3: CEO with Declining Culture

**Quarterly Progression:**
```
Q1 2025: Base Score 85.0 → Final PCR 85.0
Q2 2025: Base Score 82.3 → Final PCR 82.3 (-2.7 decline)
Q3 2025: Base Score 78.6 → Final PCR 73.6 (-5 decline penalty)
```

**CEO Dashboard Alert:**
- ⚠️ "Your culture score has declined for 2 consecutive quarters"
- Specific areas of concern highlighted (e.g., "Career Growth down 8 points")
- AI Concierge recommendations for improvement
- Suggested Power100 resources (books, podcasts, partners)

---

## 🎯 Two-Phase Implementation

### Phase 1: Employee Management & Feedback Collection
**Duration:** 7-10 days
**Goal:** Build employee tracking system and PowerCard feedback collection

**What Gets Built:**

#### Database Layer
- `company_employees` table
- Employee-survey link table
- Survey response storage
- Quarterly history tracking

#### Backend Services
- Employee CRUD operations
- CSV bulk import
- PowerCard campaign creation for employees
- Anonymous survey token generation
- Response collection & aggregation
- CEO PCR calculation service

#### Admin Interface
- Employee management dashboard for CEOs
- Bulk upload interface
- Employee list view with status
- Survey campaign launch controls

**Deliverable:** CEOs can manage employee rosters and launch quarterly feedback campaigns

---

### Phase 2: Reporting & Intelligence Layer
**Duration:** 5-7 days
**Goal:** Build CEO dashboards, trend analysis, and AI integration

**What Gets Built:**

#### CEO Dashboards
- Overall CEO PCR score display
- Category breakdowns (Leadership, Culture, Growth, Satisfaction)
- Quarterly trend charts
- Response rate tracking
- Anonymous comment feeds

#### Trend Analysis
- Quarterly comparison engine
- Improvement/decline detection
- Trend modifier calculation
- Performance alerts

#### AI Integration
- CEO PCR data feeds to AI Concierge
- Personalized improvement recommendations
- Resource suggestions (books, partners, podcasts)
- Cultural health insights

#### Reporting
- Quarterly PDF reports for CEOs
- Email summaries after each campaign
- Benchmark comparisons (optional)

**Deliverable:** Complete CEO culture intelligence system with actionable insights

---

## 📊 Database Requirements

### New Tables

#### 1. company_employees
```sql
CREATE TABLE company_employees (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  department VARCHAR(100),
  role_title VARCHAR(100),
  hire_date DATE,
  termination_date DATE,
  is_active BOOLEAN DEFAULT true,
  sms_opt_in BOOLEAN DEFAULT true,
  email_opt_in BOOLEAN DEFAULT true,
  last_survey_sent DATE,
  last_survey_completed DATE,
  total_surveys_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employees_contractor ON company_employees(contractor_id);
CREATE INDEX idx_employees_active ON company_employees(is_active);
CREATE INDEX idx_employees_email ON company_employees(email);
```

#### 2. ceo_pcr_scores
```sql
CREATE TABLE ceo_pcr_scores (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id) NOT NULL,
  quarter VARCHAR(10) NOT NULL,  -- 'Q1-2025', 'Q2-2025', etc.
  year INTEGER NOT NULL,

  -- Survey metrics
  total_employees INTEGER,
  total_responses INTEGER,
  response_rate NUMERIC(5,2),

  -- Category scores
  leadership_score NUMERIC(5,2),
  culture_score NUMERIC(5,2),
  growth_score NUMERIC(5,2),
  satisfaction_score NUMERIC(5,2),

  -- Overall scores
  base_score NUMERIC(5,2),
  trend_modifier INTEGER DEFAULT 0,  -- -5, 0, or +5
  final_ceo_pcr NUMERIC(5,2),

  -- Metadata
  campaign_id INTEGER,  -- Links to power_card_campaigns
  calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ceo_pcr_contractor ON ceo_pcr_scores(contractor_id);
CREATE INDEX idx_ceo_pcr_quarter ON ceo_pcr_scores(quarter, year);
```

### Modified Tables

#### contractors table additions
```sql
ALTER TABLE contractors ADD COLUMN current_ceo_pcr NUMERIC(5,2);
ALTER TABLE contractors ADD COLUMN previous_ceo_pcr NUMERIC(5,2);
ALTER TABLE contractors ADD COLUMN ceo_pcr_trend VARCHAR(20);  -- 'improving', 'stable', 'declining'
ALTER TABLE contractors ADD COLUMN total_employees INTEGER DEFAULT 0;
ALTER TABLE contractors ADD COLUMN last_employee_survey DATE;
ALTER TABLE contractors ADD COLUMN ceo_pcr_last_calculated TIMESTAMP;
```

---

## 🎯 Success Metrics

### System Performance
- **Response Rate Target**: 70%+ employee participation
- **Collection Time**: 2-week survey window
- **Calculation Speed**: < 50ms to calculate CEO PCR
- **Data Privacy**: 100% anonymous response guarantee

### Business Impact
- **Cultural Insights**: CEOs get actionable quarterly feedback
- **Improvement Tracking**: Trend analysis shows culture health over time
- **AI Integration**: Culture data informs AI Concierge recommendations
- **Employee Engagement**: Higher participation = better data quality

### CEO Experience
- **Easy Setup**: Upload employee list in < 5 minutes
- **Clear Reports**: Understand scores and improvement areas
- **Privacy Confidence**: Employees feel safe giving honest feedback
- **Actionable Data**: Know exactly what to work on

---

## 🔗 Integration Points

### AI Concierge Integration

CEO PCR data directly influences AI recommendations:

```javascript
// AI checks culture health when suggesting resources
if (contractor.current_ceo_pcr < 75 && contractor.ceo_pcr_trend === 'declining') {
  AI: "I notice your team culture score has been declining. I recommend
       'The Culture Code' by Daniel Coyle (in our library) and connecting
       with EOS Worldwide (PCR 92) who specializes in leadership development."
}
```

### Power100 Resource Connections
- Low leadership scores → Recommend leadership books/podcasts
- Culture decline → Suggest culture consultants from partner network
- Growth concerns → Point to professional development partners

### Event Orchestration
- Quarterly campaign scheduling
- Email + SMS coordination
- Response tracking
- Report generation automation

---

## 📚 Related Documents

**Phase Implementation Plans:**
- [Phase 1: Employee Management & Feedback Collection](./phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
- [Phase 2: Reporting & Intelligence Layer](./phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)

**Pre-Flight Checklists:**
- [Phase 1 Pre-Flight Checklist](./phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md)
- [Phase 2 Pre-Flight Checklist](./phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md)

**Reference Documents:**
- Partner PCR System: `docs/systems/partner-pcr/`
- PowerCard System: `docs/systems/partner-pcr/Scoring/`
- Event Orchestration: `docs/features/event-orchestrator/`

---

## 🎉 Expected Outcomes

### For CEOs/Contractors
- **Cultural Visibility**: Know exactly how employees feel
- **Actionable Insights**: Clear data on what needs improvement
- **Trend Tracking**: See culture health improving or declining over time
- **Anonymous Safety**: Employees provide honest feedback without fear

### For Employees
- **Voice Heard**: Quarterly opportunity to share honest feedback
- **Privacy Protected**: Complete anonymity guaranteed
- **Visible Impact**: See leadership respond to feedback with changes

### For Power100 Business
- **Data Intelligence**: CEO PCR patterns inform platform improvements
- **AI Enhancement**: Culture data enriches AI Concierge recommendations
- **Relationship Deepening**: Quarterly touchpoints strengthen contractor engagement
- **Resource Connections**: Culture insights drive book/partner/podcast recommendations

---

## 🔑 Key Differences from Partner PCR

| Aspect | Partner PCR | CEO PCR |
|--------|-------------|---------|
| **Who Rates** | Customers + Profile | Employees Only |
| **Complexity** | High (5 components) | Simple (2 components) |
| **Payment Tiers** | Yes (1.5x - 5x) | No |
| **Profile Scoring** | Yes (30% weight) | No |
| **Trend Modifier** | ±5 points | ±5 points |
| **Anonymity** | Customers known | 100% Anonymous |
| **Purpose** | Trust & Ranking | Culture & Leadership |
| **Update Frequency** | Quarterly | Quarterly |
| **Score Range** | 0-105 | 0-105 |

---

**Last Updated:** November 14, 2025
**Status:** Ready for Phase 1 Planning
**Next Step:** Complete Phase 1 Pre-Flight Checklist (Database Schema Review)
