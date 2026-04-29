╔════════════════════════════════════════════════════════════════════════════════╗
║  🔴 CRITICAL: ALWAYS CHECK DATABASE FIRST - THIS IS NON-NEGOTIABLE            ║
╚════════════════════════════════════════════════════════════════════════════════╝

BEFORE creating or editing ANY controller, service, model, route, or form file:

1️⃣  IMMEDIATELY run: powershell -Command ".\quick-db.bat \"SELECT column_name FROM information_schema.columns WHERE table_name = 'TABLE_NAME';\""
2️⃣  Use EXACT field names from database - NEVER guess or assume
3️⃣  Database is THE SINGLE SOURCE OF TRUTH - always

If you forget this, you WILL create bugs. Check FIRST, code SECOND.

To bypass hook blocking, add this comment to the file:
// DATABASE-CHECKED: [table_name] columns verified on [date]

════════════════════════════════════════════════════════════════════════════════

# The Power100 Experience (TPE) - Full-Stack Project Context

## 🔴 AUTOMATIC TRIGGERS FOR CLAUDE - DATABASE CONNECTIONS
When you see these keywords, use these SPECIFIC tools:

**LOCAL DATABASE** (keywords: "check local database", "query local", "local table", "dev database"):
→ Use: `powershell -Command ".\quick-db.bat \"YOUR SQL HERE\""`

**PRODUCTION DATABASE** (keywords: "production database", "prod database", "check prod"):
→ Use: `mcp__aws-production__exec` with command:
```
PGPASSWORD=$PROD_DB_PASSWORD psql -h $PROD_DB_HOST -U $PROD_DB_USER -d $PROD_DB_NAME -c "YOUR SQL HERE"
```
→ Credentials are in `tpe-backend/.env.production` (gitignored, never committed)

**NEVER MIX THESE UP!** Local uses batch file, Production uses MCP tool.

## 🧪 AI CONCIERGE TESTING - CRITICAL COMMANDS
**ALWAYS USE THESE WHEN TESTING AI FEATURES:**

### Force Refresh Schema (After ANY Database Changes)
```bash
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
```
**Use after:** Adding columns, processing AI data, updating differentiators

### Check What AI Can See
```bash
curl http://localhost:5000/api/ai-concierge/schema/summary | jq
```

### Development Auto-Refresh
- Cache: **5 minutes** (vs 24 hours in production)
- New columns: **Automatically discovered**
- AI fields: **Automatically included**

**See `docs/AI-CONCIERGE-TESTING-GUIDE.md` for complete testing guide**

## 🔌 IMPORTANT: PORT CONFIGURATION
**PRODUCTION PORTS:**
- Frontend: **3000** (Next.js on https://tpx.power100.io)
- Backend: **5000** (Express.js API)

**LOCAL DEVELOPMENT PORTS:**
- Frontend: **3002** (Next.js on http://localhost:3002)
- Backend: **5000** (Express.js API on http://localhost:5000)

## 🌐 LIVE INTEGRATIONS NOT IN THIS REPO

Several critical integrations live OUTSIDE this codebase. Searching the repo alone will NOT find them. Always check the live source when investigating system behavior:

| System | Where it lives | How to query |
|---|---|---|
| **n8n workflows** | `n8n.srv918843.hstgr.cloud` (Hostinger) | `mcp__n8n-mcp__n8n_list_workflows`, `n8n_get_workflow_details` |
| **WordPress (power100.io)** | Vultr server | `curl https://power100.io/wp-json/...` (Basic auth in `.env.production`) |
| **WordPress (innercircle.power100.io)** | Vultr server `runcloud@45.76.62.153` | `curl https://innercircle.power100.io/wp-json/ic/v1/...` (X-IC-API-Key) |
| **Production DB (tpedb)** | AWS RDS | `mcp__aws-production__exec` + `psql -h $DB_HOST -d $DB_NAME` |
| **Production DB (rankings)** | Same RDS, different DB | Same MCP, `-d $RANKINGS_DB_NAME` |
| **TPE backend live** | AWS EC2 | `curl https://tpx.power100.io/api/...` |

**Key live workflow IDs to know:**
- `C7z6043tUdhxrnhx` — EC Intake Form Adapter (form → page → tpedb sync)
- `7Uqz2ZbfVpZJxWeY` — Power100 Expert Contributor Page Creator
- `C7dNfvdrj87wXWOJ` — IC YouTube Playlist Poller (hourly)
- `BnMXwjAMlqhIUr0D` — IC WordPress Sync
- `1REBas9VnsPivWTA` — IC Telegram Approval Handler
- `WhPpI39eEusw7K6V` / `R91gvvLmF8RBG3zO` — TPX Email Backend → GHL (prod / dev)

**Cost incident (2026-04-25):** Two subagents in a row failed to find the live n8n adapter because their prompts only said "search the codebase". Truth was in `mcp__n8n-mcp__n8n_list_workflows`. Always check external systems before declaring "doesn't exist."

## 🔴 CRITICAL: DATABASE IS THE SOURCE OF TRUTH
**MANDATORY READING: `DATABASE-SOURCE-OF-TRUTH.md`**

Before ANY data-related development:
1. **ALWAYS check database schema FIRST** using `check_table_schema.bat [table]`
2. **Build backend to match database columns EXACTLY**
3. **Build frontend to send correct field names**
4. **Never assume field names - VERIFY in database**

Helper scripts available:
- `check_table_schema.bat` - View exact column names and types
- `check_field_exists.bat` - Verify a specific field exists
- `list_array_fields.bat` - List all array/JSON fields

## 🤖 AI FIELD NAMING FOR AUTOMATIC CONCIERGE ACCESS
**MANDATORY READING: `docs/AI-FIELD-NAMING-CONVENTIONS.md`**

**Golden Rule:** If it starts with `ai_`, it's automatically in the AI Concierge!

When adding ANY AI-processed field to the database:
1. **Follow naming convention**: `ai_summary`, `ai_insights`, `ai_tags`, etc.
2. **Use correct data types**: TEXT for summaries, JSONB for arrays
3. **No code changes needed**: Fields are auto-discovered and formatted
4. **Test immediately**: Force schema refresh and test in AI Concierge

See `docs/AI-FIELD-NAMING-CONVENTIONS.md` for complete patterns and examples.

## 🚨 CRITICAL: JSON & STORAGE HANDLING
**MANDATORY READING: `docs/STORAGE-AND-JSON-GUIDELINES.md`**

**NEVER use raw JSON methods or localStorage directly!**
1. **ALWAYS use safe JSON helpers** (`safeJsonParse`, `safeJsonStringify`)
2. **ALWAYS use storage helpers** (`getFromStorage`, `setToStorage`)
3. **NEVER double-stringify** data before storage
4. **FOLLOW naming conventions** for tokens, IDs, and timestamps

Critical documents:
- `docs/STORAGE-AND-JSON-GUIDELINES.md` - Complete development patterns
- `JSON-MIGRATION-SPECIAL-CASES.md` - Edge cases and solutions
- `JSON-MIGRATION-SYNTAX-GUIDE.md` - Backend vs Frontend syntax

## 📣 OPERATOR ALERTS — DEFAULT POLICY (every signup/conversion notifies Greg + Zeek)

**Codified 2026-04-29.** Whenever you build a feature that brings in members, clients, ECs, contractors, partners, or content — i.e. **anything where a real person signs up, completes onboarding, converts, pays, or otherwise crosses a meaningful pipeline boundary** — you MUST fire `sendOperatorAlert()` so Greg and Zeek get a real-time email + SMS.

**Default recipients (canonical):**
- Greg Cummings — `greg@power100.io` / `+1 727-430-4341`
- Zeek         — `zeek@power100.io` / `+1 810-893-4075`

These defaults live in `tpe-backend/src/services/communicationService.js` (`DEFAULT_EMAILS` / `DEFAULT_PHONES`). Override via `OPERATOR_ALERT_EMAILS` / `OPERATOR_ALERT_PHONES` env vars (CSV) or per-call `args.recipients` if a specific event needs different routing.

**Usage:**
```js
const { sendOperatorAlert } = require('./services/communicationService');
sendOperatorAlert({
  event: 'ec_signup',                            // short slug
  title: `New EC Signup: ${name}`,               // one-line headline
  fields: { Email, Phone, Company, Tier, ... },  // key/value table
  cta_url: wpPageUrl,                            // optional admin link
  drc: { company_id, user_id }                   // optional DRC audit log
}).catch(e => console.warn('non-fatal:', e.message));   // ALWAYS fire-and-forget
```

**Events that already emit operator alerts** (don't duplicate):
- `ec_signup` / `ec_form_resubmit` — EC public form via `/api/expert-contributors/from-form`
- `show_guest_form` / `show_guest_form_delegate` — Show Guest onboarding form

**Events that should but don't yet** (build the alert when you touch them):
- Contractor flow completion / partner-match success
- Stripe payment success on EC tiers
- IC member signup (when that flow exists)
- Demo booking / partner introduction confirmed

**Non-negotiable rules:**
- ALWAYS use `sendOperatorAlert()` — never reinvent SendGrid+Twilio fanout per controller.
- ALWAYS fire-and-forget (`.catch(...)` log) so a failed alert doesn't block the request.
- NEVER skip the alert when adding a new signup/conversion endpoint. If you're tempted to skip ("it's just a test"), the bar is: would Greg/Zeek want to know in real time? Then fire it.
- The contributor-facing email/SMS is SEPARATE from the operator alert. Both fire on the same event — the operator alert is for us, the welcome email is for them.

## ⚠️ IMPORTANT: DATABASE CONFIGURATION
**BOTH Development AND Production use PostgreSQL** 

### 🔴 CRITICAL: BEFORE ANY DATABASE OPERATION
**ALWAYS CHECK FIRST**: `DATABASE-CONNECTION-PATTERN.md`
- **Location**: `C:\Users\broac\CascadeProjects\The-Power100-Experience\DATABASE-CONNECTION-PATTERN.md`
- **NEVER** attempt database connection without checking this file
- **ALWAYS** use the batch file pattern documented there
- If you forget how to connect, CHECK `DATABASE-CONNECTION-PATTERN.md`

### LOCAL DEVELOPMENT Database
- **Credentials**: Stored in `tpe-backend/.env` (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- **Connection Pattern**: See `DATABASE-CONNECTION-PATTERN.md` for EXACT steps
- **Quick Query**: `powershell -Command ".\quick-db.bat \"YOUR SQL HERE\""`

### PRODUCTION Database (AWS RDS)
- **Credentials**: Stored in `tpe-backend/.env.production` (PROD_DB_HOST, PROD_DB_PORT, PROD_DB_NAME, PROD_DB_USER, PROD_DB_PASSWORD)
- **SSL Required**: Yes
- **Quick Query**: Use `mcp__aws-production__exec` with env var references
- **NEVER commit production credentials to source control**

**SQLite is NOT used** - USE_SQLITE=false in all environments

## 🏗️ Project Overview

The Power100 Experience is a comprehensive full-stack web application that operates in two primary modes:

### 1. **Entry Point: AI-Driven Matching System**
For new contractors entering TPX, the platform guides them through a personalized experience to identify business goals and connects them with verified partners through our intelligent matching algorithm. This is their first interaction with TPX - a structured flow that captures their needs and makes strategic connections.

### 2. **Evolution: AI-First Concierge Platform**
Once contractors are in the TPX ecosystem (post-contractor flow or as partner clients), they gain access to an AI concierge that serves as their always-available business advisor. This AI knows their business intimately, provides contextual guidance across all resources (partners, books, podcasts, events), and anticipates their needs before they arise.

### 🤖 AI-First Development Principle
**CRITICAL**: While maintaining our core matching system, all new features and data collection must be designed with AI processing in mind. See [AI-First Strategy Document](docs/AI-FIRST-STRATEGY.md) for complete vision. Every data field collected should enable both:
- Immediate value through our matching algorithm
- Future value through AI concierge capabilities and backend intelligence

## 📁 Project Architecture

```
the-power100-experience/          # Project root
├── tpe-front-end/               # Next.js frontend application
│   ├── src/app/                 # App router pages
│   ├── src/components/          # React components
│   ├── src/entities/            # Data models
│   └── src/utils/               # Utility functions
├── tpe-backend/                 # Node.js backend API
│   ├── src/                     # Source code
│   ├── routes/                  # API routes
│   ├── models/                  # Database models
│   ├── services/                # Business logic
│   └── middleware/              # Express middleware
├── tpe-orchestration/           # n8n workflow automation
├── tpe-agents/                  # Strategic AI agents (2 key agents only)
├── tpe-integrations/            # Third-party service integrations
├── tpe-reports/                 # PowerConfidence reporting system
├── tpe-database/                # Database schema & migrations
├── tpe-api/                     # API documentation & specs
├── docs/                        # Project documentation
└── deploy/                      # Deployment configurations

```

## 🎯 Core Functionality

### Contractor Flow (5-Step Process)
1. **Verification**: Phone/email verification with SMS opt-in for AI coaching
2. **Focus Areas**: Select top 3 business focus areas for next 12-18 months
3. **Business Profiling**: Revenue, team size, readiness indicators
4. **Partner Matching**: AI algorithm matches with approved partners
5. **Completion**: Demo booking and email introduction (See `docs/PARTNER-BOOKING-SYSTEM-GHL-IMPLEMENTATION.md`)

### Admin Dashboard
- Contractor management and analytics
- Partner management with PowerConfidence scoring
- Demo booking oversight
- Pipeline progress tracking

### Partner Integration
- Extensive partner profiles and value propositions
- PowerConfidence scoring from quarterly customer calls
- Automated email introductions via subdomain routing

## 🎨 Brand Guidelines

### Colors (CSS Variables)
- `--power100-red`: #FB0401 (Primary brand)
- `--power100-green`: #28a745 (Success/CTA)
- `--power100-black`: #000000 (Text)
- `--power100-white`: #ffffff (Backgrounds)
- `--power100-grey`: #6c757d (Secondary text)
- `--power100-bg-grey`: #f8f9fa (Page backgrounds)

### Button Color Rules
**IMPORTANT**: All colored buttons must have white text for visibility and consistency
- **Red Buttons**: ALWAYS use white text (`text-white`) with `bg-power100-red`
  - Example: `className="bg-power100-red hover:bg-red-700 text-white"`
- **Green Buttons**: ALWAYS use white text (`text-white`) with `bg-power100-green`
  - Example: `className="bg-power100-green hover:bg-green-600 text-white"`

### Components
- Using shadcn/ui components (Button, Card, Badge)
- Framer Motion for animations
- Lucide React for icons
- Tailwind CSS for styling

## 🎨 MODERN DESIGN SYSTEM (DEFAULT STANDARD)
**📚 MANDATORY READING**: `docs/MODERN-DESIGN-SYSTEM.md`

**CRITICAL**: These design patterns are THE DEFAULT for ALL new development (frontend AND backend).
Just like brand colors are non-negotiable, these modern design elements are our standard.

### Quick Reference Card

#### ✅ ALWAYS Use These Patterns:

**1. Section Headers with Pill Badges**
```tsx
<div className="text-center mb-16">
  <div className="inline-block bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-semibold mb-4">
    Section Label
  </div>
  <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Main Heading</h2>
  <p className="text-xl text-gray-600 max-w-3xl mx-auto">Supporting text</p>
</div>
```

**2. Modern Cards with Hover Effects**
```tsx
<div className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
  {/* Card content */}
</div>
```

**3. CTA Buttons**
```tsx
<button className="group bg-green-500 text-white px-8 py-4 rounded-full hover:bg-green-600 transition-all duration-300 flex items-center justify-center gap-2 text-lg font-semibold shadow-xl">
  <Icon className="w-5 h-5" />
  Button Text
  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
</button>
```

**4. Gradient Cards (Metrics/Stats)**
```tsx
<div className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
  <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-600 opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"></div>
  <div className="relative">
    <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mb-4">
      <TrendingUp className="w-6 h-6 text-white" />
    </div>
    <div className="text-5xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent mb-2">
      +12%
    </div>
    <h3 className="text-lg font-semibold text-gray-900">Metric Label</h3>
  </div>
</div>
```

**5. Section Spacing**
- Use `py-20` for section padding (not py-16 or py-12)
- Use `mb-16` for header spacing
- Use `gap-8` for grid gaps

**Reference Implementation**: `tpe-front-end/src/components/reports/PublicPCRLandingV2.tsx`

❌ **NEVER** use flat designs without shadows or hover effects
❌ **NEVER** skip the pill badge for section headers
❌ **NEVER** use simple text buttons - always use modern rounded-full buttons

See full documentation: `docs/MODERN-DESIGN-SYSTEM.md`

### UI Component Standards

#### Dropdown Menus (Select Components)
**IMPORTANT**: All dropdown menus must have solid white backgrounds for visibility and consistency.

```tsx
// Standard dropdown implementation:
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="... bg-white">  {/* Always include bg-white */}
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent className="bg-white">      {/* Always include bg-white */}
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

**Rationale**: Transparent or semi-transparent dropdowns are difficult to read and create accessibility issues. Solid white backgrounds ensure:
- Clear visibility of all options
- Consistent user experience across the platform
- Better contrast for readability
- Professional appearance

## 🎯 Standard Card Design System

### **REQUIRED: All cards and forms must follow this consistent design pattern**

#### Container Layout
```tsx
<div className="min-h-screen bg-power100-bg-grey flex items-center justify-center">
  <div className="w-full max-w-2xl mx-auto px-4">
    {/* Card content here */}
  </div>
</div>
```

#### Card Structure
```tsx
<div className="bg-white rounded-2xl shadow-lg p-8">
  {/* Red/Green Icon at top center */}
  <div className="flex justify-center mb-6">
    <div className="w-12 h-12 bg-power100-red rounded-full flex items-center justify-center">
      <IconComponent className="h-6 w-6 text-white" />
    </div>
  </div>
  
  {/* Content */}
  <div className="text-center">
    {/* Main content here */}
  </div>
  
  {/* Navigation Buttons */}
  <div className="flex gap-4 mt-8">
    {/* Back Button (if needed) */}
    <Button
      variant="outline"
      className="flex-1 bg-white border-2 border-gray-200 text-power100-black hover:bg-gray-50"
    >
      Back
    </Button>
    
    {/* Primary Action Button */}
    <Button className="flex-1 bg-power100-green hover:bg-green-600 text-white font-semibold">
      Continue
    </Button>
  </div>
</div>
```

#### Design Specifications
- **Background**: Light gray (`bg-power100-bg-grey`)
- **Card**: White background with rounded corners (`rounded-2xl`) and shadow (`shadow-lg`)
- **Icon**: 48px circle with Power100 red/green background at top center
- **Buttons**: 
  - Primary: Green background (`bg-power100-green`) with white text
  - Secondary: White background with gray border
- **Spacing**: 32px padding (`p-8`) inside cards
- **Layout**: Centered with max width of 2xl (672px)

#### Examples in Codebase
- ✅ Contractor Flow: `src/app/contractorflow/page.tsx`
- ✅ Power Cards Survey: `src/components/powerCards/PowerCardSurvey.tsx`
- ✅ Survey Complete: `src/components/powerCards/SurveyComplete.tsx`

## 🔄 Development Workflow Requirements

### 🛡️ MANDATORY: Start Development with Error Prevention
**ALWAYS start your development session with:**
```bash
npm run safe
```
This provides automatic error prevention that catches JSON and array rendering errors in real-time as you code.

### Git Strategy
- **NEVER work on main/master branch**
- Always create feature branches: `feature/description` or `fix/description`
- Use conventional commit messages
- Require testing before merging

### Testing Requirements
- Test-driven development approach
- Unit tests for all components
- Integration tests for contractor flow
- E2E tests for critical paths

### Code Standards
- TypeScript for type safety
- ESLint + Prettier for code formatting
- Component-based architecture
- Responsive design (mobile-first)
- **ALWAYS use error prevention helpers**: `safeJsonParse()` and `SafeList` components
- **ALWAYS follow Modern Design System**: `docs/MODERN-DESIGN-SYSTEM.md` for ALL UI development

## 🚨 Critical Business Logic

### Contractor Verification
- Phone verification via SMS is REQUIRED
- Creates opt-in for AI coaching communications
- Stores verification status in contractor profile

### Focus Area Matching Algorithm
- Maps contractor focus areas to partner capabilities
- Considers revenue tier and team size
- Generates confidence scoring for matches

### Partner Communication Flow
1. Demo booking through TPE interface
2. Email introduction (Power100 → Partner subdomain)
3. Automatic response triggers accounting/booking team CC
4. Partner takes over with their cadence

**📚 Implementation Details**: See `docs/PARTNER-BOOKING-SYSTEM-GHL-IMPLEMENTATION.md` for the complete Go High Level + n8n orchestration system that handles email automation, booking confirmation, follow-ups, and performance tracking.

### PowerConfidence Scoring
- Quarterly customer satisfaction calls
- Automated text message opt-ins
- Tone and tempo analysis integration (future)
- Partner ranking and recommendation system

## 🛠️ Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **State Management**: React hooks, local state
- **Icons**: Lucide React
- **UI Components**: shadcn/ui
- **Backend**: Node.js with Express.js (✅ COMPLETE)
- **Database**: PostgreSQL for BOTH development and production (✅ COMPLETE)
- **Authentication**: JWT with bcrypt (✅ COMPLETE)
- **API**: RESTful endpoints with comprehensive error handling (✅ COMPLETE)

## 🚧 Development Status

### ✅ PHASE 1 COMPLETE - Core Platform (August 2025)
**Full-stack contractor matching platform with partner management**

#### Frontend ✅ COMPLETE
- Complete 5-step contractor onboarding flow
- Real-time partner matching with loading animations
- Admin dashboard with analytics and navigation
- Partner management interface with comprehensive forms
- Brand styling and responsive layout
- Advanced UI components (multi-select, dynamic lists, forms)

#### Backend ✅ COMPLETE  
- **API Design & Setup**: RESTful API with Express.js, JWT authentication, rate limiting
- **Database**: PostgreSQL PRODUCTION database on AWS RDS (tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com)
- **Core API Endpoints**: 
  - `/api/contractors` - Full CRUD operations ✅
  - `/api/partners` - Complete partner management ✅
  - `/api/bookings` - Demo booking system ✅ 
  - `/api/verification` - SMS/email verification ✅
  - `/api/matching` - AI partner matching algorithm ✅
  - `/api/admin` - Admin dashboard data ✅
  - `/api/auth` - Authentication and user management ✅

#### Integration & Algorithm ✅ COMPLETE
- **Partner Matching Algorithm**: Working with 60/20/10/10 weight distribution
- **Frontend-Backend Integration**: Full connectivity with error handling
- **Database Schema**: All contractor and partner fields from UI screenshots
- **Data Validation**: Comprehensive validation and error handling
- **JSON Field Parsing**: Robust handling of complex data structures

### 🚀 PHASE 2 - Advanced Database Management (CURRENT)
**Timeline**: Week 3-4 | **Priority**: High

#### ✅ Advanced Search & Filtering - COMPLETE (August 2025)
- Multi-field search interface for contractors and partners ✅
- Advanced filtering by capabilities, revenue, focus areas, location ✅
- Search result pagination and sorting options ✅
- Tabbed interface with real-time search ✅

#### ✅ Bulk Operations & Data Management - COMPLETE (August 2025)
- Bulk edit capabilities for multiple records ✅
- Mass status updates (activate/deactivate partners) ✅
- Bulk export functionality ✅
- Select all/individual item selection with progress tracking ✅

#### ✅ Phase 2 Technical Achievements (August 2025)
- **Advanced Search API**: Added `contractorApi.search()` and `partnerApi.search()` endpoints
- **Bulk Operations API**: Complete `bulkApi` service layer with all CRUD operations
- **Server Connectivity Fixes**: Resolved recurring "Failed to fetch" errors with explicit host binding
- **Troubleshooting Documentation**: Comprehensive `SERVER_TROUBLESHOOTING.md` guide
- **Component Architecture**: Tabbed search interface with real-time filtering and pagination
- **User Experience**: Seamless search, filter, and bulk operation workflows

#### 🏷️ Tag Management System (PENDING)
- Custom tagging for contractors and partners
- Tag-based filtering and organization  
- Quick tag assignment interface
- Tag analytics and reporting

#### 📈 Advanced Analytics Dashboard
- Partner performance metrics and PowerConfidence tracking
- Contractor conversion analytics and funnel analysis
- Matching algorithm effectiveness reporting
- Business intelligence dashboards

#### 📝 Audit Trail & Compliance
- Complete audit trail for all data changes
- User activity logging and permissions
- Change history for compliance requirements
- Data integrity monitoring

### 🔮 PHASE 3 - Partner Self-Service Portal (UPCOMING)
**Timeline**: Week 5-6 | **Priority**: Medium

#### Partner Registration & Management
- Partner application and registration workflow
- Self-service partner profile management
- Document upload and verification system
- PowerConfidence score tracking and improvement

#### Advanced Features
- Partner-facing analytics and performance dashboards
- Automated quarterly review processes
- Advanced matching preferences and targeting
- Integration with external partner systems

### 📝 PHASE 4 - Production & Scaling (FUTURE)
**Timeline**: Week 7-8 | **Priority**: Low

#### Production Infrastructure
- PostgreSQL production database ALREADY DEPLOYED on AWS RDS
- Docker containerization and deployment
- CI/CD pipeline implementation
- Environment configuration and secrets management

#### Integration Services
- SMS verification service (Twilio integration)
- Email service (SendGrid/AWS SES)
- Partner subdomain routing system
- Real-time notifications and alerts

#### Performance & Security
- Performance optimization and caching
- Security hardening and penetration testing
- Monitoring and logging infrastructure
- Backup and disaster recovery systems

## 🚨 CRITICAL: DEPLOYMENT VERIFICATION PROTOCOL

### MANDATORY Before ANY Production Deployment
**NEVER assume code is fixed. ALWAYS verify with these exact steps:**

#### 1. **Compare Files FIRST**
```bash
# ALWAYS compare dev vs prod files before claiming alignment:
diff tpe-backend/src/services/file.js production/file.js
# Or check specific problem areas:
grep -n "problematic_code" both_files
```

#### 2. **Test Actual API Responses**
```bash
# Don't just check status codes, verify the actual data:
curl -s https://tpx.power100.io/api/endpoint | jq '.specific.field'
# Compare with development:
curl -s http://localhost:5000/api/endpoint | jq '.specific.field'
```

#### 3. **Check Error Logs**
```bash
# Production logs:
pm2 logs tpe-backend --lines 20 --nostream | grep -i error
# Development logs:
tail -50 tpe-backend/server.log | grep -i error
```

#### 4. **Verify Both Environments**
- ✅ Development backend code (cat/grep the actual file)
- ✅ Production backend code (cat/grep the actual file)  
- ✅ Development frontend code (cat/grep the actual file)
- ✅ Production frontend code (cat/grep the actual file)
- ✅ Test development API response
- ✅ Test production API response

#### 5. **Track Changes Properly**
- Use TodoWrite to track deployment steps
- Document which environment has which fix
- NEVER mark as "completed" without verification
- If you say "deployed", show the proof

#### 6. **Common Mistake Patterns to Avoid**
- ❌ "The production backend was fixed" (assumption)
- ✅ "I verified production has the fix by checking line 42: [show code]"
- ❌ "It should be working now"
- ✅ "Confirmed working: API returns success:true with no errors"
- ❌ "Frontend fix will solve this"
- ✅ "Backend sends error, fixing backend first at line X"

#### 7. **Understand Error Origins**
- "Unexpected token B in JSON" = Backend parsing issue, NOT frontend
- "Failed to fetch" = Backend not running or CORS issue
- 400 errors = Validation failure (check both frontend AND backend validation)
- 500 errors = Backend code error (check logs immediately)

## 🎛️ Special Instructions for Claude Code

### Always Do
- Create new branch for ANY code changes
- Write tests before implementing features
- Follow component-based architecture
- Maintain TypeScript strict mode
- **FOLLOW Modern Design System** (`docs/MODERN-DESIGN-SYSTEM.md`) for ALL UI development
- Use existing design system and colors (pill badges, rounded-2xl cards, hover effects)
- Implement responsive design
- Add proper error handling
- Include loading states
- **USE safe JSON helpers** (`safeJsonParse`, `safeJsonStringify`)
- **USE storage helpers** (`getFromStorage`, `setToStorage`)
- **READ `docs/STORAGE-AND-JSON-GUIDELINES.md`** before handling any data

### Never Do
- Work directly on main/master branch
- Delete existing code without backup
- Break existing functionality
- Ignore TypeScript errors
- Hardcode values that should be configurable
- Skip accessibility considerations
- **USE raw `JSON.parse()` or `JSON.stringify()`**
- **USE `localStorage` directly**
- **DOUBLE-STRINGIFY data** (calling stringify before setToStorage)
- **CREATE flat designs** without shadows or hover effects
- **SKIP pill badges** for section headers
- **USE simple borders** instead of shadow-based cards
- **CREATE buttons** without rounded-full styling

### When Making Changes
1. Analyze impact on contractor flow
2. Consider partner integration effects
3. **Verify Modern Design System compliance** (`docs/MODERN-DESIGN-SYSTEM.md`)
4. Test responsive behavior
5. Verify brand consistency (colors AND modern design patterns)
6. Check TypeScript compilation
7. Run existing tests
8. Create new tests as needed

## 🎯 Current System Capabilities (August 2025)

### ✅ Production-Ready Features
The Power100 Experience platform is now fully functional with the following capabilities:

#### **Contractor Experience**
- **5-Step Onboarding Flow**: Verification → Focus Selection → Profiling → Matching → Completion
- **Phone Verification**: SMS verification with development bypass (123456)
- **Focus Area Selection**: Multi-select from 8+ business focus areas
- **Business Profiling**: Revenue tiers, team size, growth readiness indicators
- **AI Partner Matching**: Real-time matching with scores and explanations
- **Demo Booking**: Seamless transition to partner introductions

#### **Partner Management System**
- **Comprehensive Partner Profiles**: 20+ fields including capabilities, regions, testimonials
- **PowerConfidence Scoring**: Customer satisfaction tracking system
- **Multi-dimensional Matching**: Focus areas, revenue compatibility, geographic regions
- **Administrative Tools**: Full CRUD operations via admin dashboard

#### **Administrative Interface**
- **Dashboard Analytics**: Contractor pipeline, partner performance, system metrics
- **Partner Management**: Add, edit, activate/deactivate strategic partners
- **Contractor Oversight**: View contractor progress, manage pipeline stages
- **Advanced Search**: Multi-field search with filtering across all data types
- **Bulk Operations**: Mass updates, exports, and status changes with progress tracking
- **Authentication**: Secure admin access with JWT tokens

#### **Technical Infrastructure**
- **Database**: PostgreSQL PRODUCTION on AWS RDS (tpedb database, tpeadmin user)
- **API Layer**: RESTful endpoints with authentication, validation, error handling
- **Search & Bulk APIs**: Advanced search endpoints and bulk operation services
- **Frontend**: Responsive Next.js application with modern UI components
- **Real-time Features**: Live matching animations, dynamic form validation, real-time search
- **Server Connectivity**: Robust connection handling with troubleshooting documentation

### 📊 System Metrics & Scale
- **Partner Capacity**: Ready for 16+ strategic partners with comprehensive profiles
- **Contractor Pipeline**: Supports unlimited contractor onboarding and tracking
- **Matching Algorithm**: 60/20/10/10 weight distribution with configurable parameters
- **Performance**: Optimized for real-time matching and responsive user experience

### 🔧 Development Environment
- **PRODUCTION**: PostgreSQL on AWS RDS + Next.js on AWS EC2 (https://tpx.power100.io)
  - Frontend Port: 3000
  - Backend Port: 5000
- **Local Development**: PostgreSQL backend + Next.js frontend
  - Frontend Port: 3002
  - Backend Port: 5000
- **Authentication**: Admin access credentials in `tpe-backend/.env` (ADMIN_EMAIL, ADMIN_PASSWORD)
- **Testing**: Comprehensive manual testing of all flows and features
- **Version Control**: Git with feature branches and comprehensive commit history

## 🗃️ Database Management & Extensibility

### Comprehensive Database Enhancement Roadmap
The Power100 Experience includes a comprehensive plan for evolving from a basic contractor flow system into a full-featured CRM with advanced partner directory capabilities, self-service portals, and intelligent matching algorithms.

**Key Documentation:**
- `docs/database-management-roadmap.md` - Complete enhancement roadmap with 5 implementation phases
- `docs/database-schema-evolution.md` - Technical procedures for safe schema changes
- `docs/field-addition-guide.md` - Step-by-step guide for adding new data fields

### Database Enhancement Phases
1. **Phase 1**: Foundation & Database Enhancement (Screenshot-based fields, basic CRUD)
2. **Phase 2**: Advanced Database Management (Search, filtering, bulk operations)
3. **Phase 3**: Self-Service Partner Portal (Registration, profile management)
4. **Phase 4**: Public Partner Directory (Contractor-facing search and discovery)
5. **Phase 5**: Intelligent Matching & Analytics (AI-driven matching, comprehensive analytics)

### Current Schema State (August 2025) - PRODUCTION PostgreSQL on AWS RDS
- **Contractors**: Complete schema (25+ fields) including verification, profiling, focus areas, readiness indicators
- **Strategic Partners**: Comprehensive profiles (20+ fields) including capabilities, testimonials, PowerConfidence scores
- **Admin Users**: Authentication system with JWT token management
- **Contractor-Partner Matches**: Working matching system with scores, reasons, and primary match tracking
- **Demo Bookings**: Scheduling system for contractor-partner introductions
- **Field Definitions**: Master registry with 40+ field configurations and validation rules

### Extensibility Framework
- **Dynamic Field Addition**: Add new fields in ~5 minutes using automated scripts
- **JSON Field Support**: Flexible data storage for custom fields and future expansion
- **Master Field Registry**: Central configuration for all field definitions and validation rules
- **Auto-Generated Forms**: UI components automatically adapt to new field definitions

### Data Points Roadmap (Based on UI Screenshots)
**Contractor Fields**: 25+ fields including verification, business profile, focus areas, readiness indicators, workflow tracking, and analytics
**Partner Fields**: 20+ fields including company info, service capabilities, social proof, performance metrics, and integration settings

## 🔍 Key Files to Always Consider

- `tpe-front-end/src/app/contractorflow/page.tsx` - Main flow logic
- `tpe-front-end/src/app/admindashboard/page.tsx` - Admin functionality  
- `tpe-front-end/src/app/globals.css` - Brand colors and styling
- `tpe-front-end/src/app/layout.tsx` - Navigation and overall structure
- `tpe-database/field-definitions.json` - Master field registry for extensibility
- `docs/database-management-roadmap.md` - Complete database enhancement plan
- `docs/SERVER_TROUBLESHOOTING.md` - Server connectivity issue solutions
- `tpe-front-end/src/components/admin/AdvancedSearch.tsx` - Advanced search interface
- `tpe-front-end/src/components/admin/BulkOperations.tsx` - Bulk operations management
- Entity files - Data models and API integration

## 🎯 Business Goals

### Primary Objectives
1. Streamline contractor-partner connections
2. Increase partner confidence through verified scoring
3. Reduce manual work in partner introductions
4. Scale the matching process through AI
5. Maintain high-quality user experience

### Success Metrics
- Contractor completion rate through full flow
- Partner satisfaction scores
- Demo booking conversion rates
- Time to successful partner connection
- User retention and repeat usage
- wait for fresh build to finish if we have to build fresh for changes to be picked up and applied. Do NOT restart the front end in development mode to pick up the changes faster
- always check data and database schema before migrating or pulling elements over into production
- **ALWAYS use dev-manager.js for ALL server operations** - NEVER manually kill processes or use npm scripts for server management
- dev-manager.js handles all Windows-specific process management, port conflicts, and graceful restarts automatically

## 🤖 System Auto Manager - IMPORTANT FOR DEVELOPMENT

### ⚠️ KNOWN LIMITATION: Field Alignment Not Checked
**The System Auto Manager checks file existence but NOT field name alignment!**
Always run `database-field-validator.js` separately to ensure field names match across layers.

### Always Start Development With System Protection
**CRITICAL**: When starting development for the day, ALWAYS run BOTH:
1. **System Auto Manager** - For file completeness
2. **Database Field Validator** - For field alignment

#### Starting Development (Two Options):

**Option 1 - If servers already running:**
```bash
npm run system:watch
```

**Option 2 - Fresh start with everything:**
```bash
npm run dev:with-watch
```
This starts both dev servers AND the system watcher together.

### What the System Auto Manager Does:
- **Automatically detects** when you're adding new entities (controllers, routes, types, forms)
- **Checks completeness** of all required files for each entity
- **Prompts to auto-generate** missing files with proper content
- **Updates existing files** (server.js, api.ts, matching services) automatically
- **Ensures nothing is missed** when adding new components to the system

### Available Commands:
- `npm run system:watch` - Run in watch mode (recommended during development)
- `npm run system:check` - One-time system integrity check
- `npm run system:add webinar` - Manually add a complete new entity
- `npm run dev:with-watch` - Start everything together

### How It Works:
1. When you create ANY entity file (e.g., `webinarController.js`), the system detects it
2. Within 3 seconds, it checks what's missing
3. Prompts: "Would you like to auto-generate missing files? (y/n)"
4. If yes, creates all required files with proper boilerplate
5. Prompts: "Would you like to auto-update existing files? (y/n)"
6. If yes, updates server.js, api.ts, and all connection points

### Example Protected Workflow:
```bash
# Start your day
npm run dev:with-watch  # Or npm run system:watch if servers are running

# Create a new controller
touch tpe-backend/src/controllers/webinarController.js

# System detects and prompts:
# "Entity 'webinar' is incomplete! Auto-generate missing files? (y/n)"
# Type 'y'

# System creates:
# - webinarRoutes.js
# - webinar.ts (types)
# - WebinarForm.tsx
# - Admin page
# - Updates server.js, api.ts, matching services

# You're fully protected and can focus on business logic!
```

**Never develop without this safety net - it prevents hours of debugging missing connections!**

## 🛠️ Server Management - ALWAYS USE dev-manager.js

### CRITICAL: Always Use dev-manager.js for Server Operations
**NEVER use npm scripts directly for server management. ALWAYS use dev-manager.js unless explicitly told otherwise.**

#### Available Commands:
```bash
# Starting servers
node dev-manager.js start all        # Start both frontend and backend
node dev-manager.js start frontend   # Start only frontend
node dev-manager.js start backend    # Start only backend

# Stopping servers
node dev-manager.js stop all         # Stop all servers
node dev-manager.js stop frontend    # Stop only frontend
node dev-manager.js stop backend     # Stop only backend

# Restarting servers
node dev-manager.js restart all      # Restart both servers
node dev-manager.js restart frontend # Restart only frontend
node dev-manager.js restart backend  # Restart only backend

# Status check
node dev-manager.js status           # Check status of all servers

# Clean build artifacts
node dev-manager.js clean            # Clean build folders
```

#### Why dev-manager.js?
- Handles Windows-specific process management correctly
- Properly kills processes using the correct PID
- Manages port conflicts automatically
- Provides graceful shutdown and restart
- Ensures clean build artifacts
- Prevents orphaned processes

**Example Usage:**
```bash
# When backend code changes are made:
node dev-manager.js restart backend

# When starting development for the day:
node dev-manager.js start all

# When fixing port conflicts:
node dev-manager.js restart all
```

**DO NOT USE:**
- ❌ `npm run backend:restart`
- ❌ `npm run dev`
- ❌ `npm start`
- ❌ Direct `taskkill` commands
- ❌ Manual process killing

**ALWAYS USE:**
- ✅ `node dev-manager.js` for ALL server operations

### 🛡️ CRITICAL: Always Start Development with Error Prevention

**MANDATORY**: When starting development, ALWAYS use:
```bash
npm run safe
```

This command:
1. Starts frontend and backend servers
2. **Automatically watches for JSON and array rendering errors**
3. **Checks your code in real-time as you save files**
4. **Prevents 90% of runtime errors before they happen**

**DO NOT USE:**
- ❌ `npm run dev:start` (no error protection)
- ❌ `node dev-manager.js start` (no error protection)
- ❌ Starting servers individually

**ALWAYS USE:**
- ✅ `npm run safe` - Start with automatic error prevention
- ✅ `npm run safe:restart` - Restart servers WITH error protection maintained
- ✅ `npm run error:check` - Before any commit

**For Server Maintenance:**
```bash
# When restarting servers (e.g., after backend changes):
npm run safe:restart

# NOT these:
❌ node dev-manager.js restart  # No error protection
❌ npm run dev:restart          # No error protection
❌ Ctrl+C then restart manually # Loses error protection
```

This ensures:
- JSON parsing errors are caught immediately
- React array rendering errors are prevented
- Error protection is maintained during restarts
- You never test broken code
- You never commit errors

See `docs/AUTO-ERROR-PREVENTION.md` for full details.
- whenever you are writing or referring to a current date, always do a web search and check what the current date is.
- never request to do a hard git rest unless it is absolutely necessary. For issues related to unwanted files being staged and committed or anything similar this is never a suitable option because it runs the risk of permenantely losing progressive changes. Uncommitted first, then unstaging is the only via option for these sort of situations. A hard git reset is ony for dire scenarios where losing progressive changes actually carry benefit to the project overall.
- when there is a detection during our checker sequence, even if you feel like it can be bypassedm ALWAYS output an explanation
   of what it is and an "answer in short" response so we understand what the error is about and how to address it. You can then
   suggest to skip it if it makes sense with a via argument for doing so. If I decide we skip it after you plea your case, ONLY
   THEN will we proceed to bypass our checkers. We should NEVER automatically bypass ur checkers. Its sole purpose is to check 
  for issues so I am getting into the habit of going against that.
- We're only doing "Start all" options for the dev-manager.js for the time being when we are restarting the servers. Or more specifically stay away from "restart" because the backend keeps crashing when we use this command
- 13-14 minutes is the average time it takes for auto deployment (via remote git push to master branch) to complete and updates to show in production
- stop using jq with windows curl commands. It doesn't work
- our current centralized service for our AI concierge to retrieve AI enhanced knowlege is aiKnowledgeService.js