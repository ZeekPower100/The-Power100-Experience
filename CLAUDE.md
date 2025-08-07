# The Power100 Experience (TPE) - Full-Stack Project Context

## 🏗️ Project Overview

The Power100 Experience is a comprehensive full-stack web application that connects contractors with strategic partners through an AI-driven matching system. The platform guides contractors through a personalized experience to identify business goals and connects them with verified partners.

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
5. **Completion**: Demo booking and email introduction

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

### Components
- Using shadcn/ui components (Button, Card, Badge)
- Framer Motion for animations
- Lucide React for icons
- Tailwind CSS for styling

## 🔄 Development Workflow Requirements

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

### PowerConfidence Scoring & Feedback Loop System
**CRITICAL BUSINESS DIFFERENTIATOR** - Comprehensive feedback collection system for all partner clients

#### Quarterly Feedback Loop Process
1. **SMS Trigger**: Automated quarterly text messages to ALL partner clients (TPE + non-TPE originated)
2. **Feedback Flow**: Link directs to 5-step feedback experience (similar to contractor onboarding)
3. **Data Collection**: Multi-format feedback (text, audio, video when applicable)
4. **PowerConfidence Calculation**: Algorithm processes feedback into partner scores
5. **Report Generation**: Quarterly partner performance and industry reports

#### AI Coaching System Integration
- **Unlocked Access**: Contractors who complete feedback gain access to AI coaching
- **Multi-Source Training**: AI trained on all feedback data, industry insights, partner performance
- **Contextual Guidance**: AI provides partner-specific recommendations based on similar client experiences
- **Conversation Memory**: Persistent conversation history for personalized coaching
- **Industry Intelligence**: Size/service-matched insights from feedback database

#### Partner Feedback Visibility
- Partners receive their PowerConfidence scores and feedback summaries
- Real-time unbiased third-party validation system
- Performance tracking and improvement recommendations
- Industry benchmarking capabilities

## 🛠️ Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **State Management**: React hooks, local state
- **Icons**: Lucide React
- **UI Components**: shadcn/ui
- **Backend**: Node.js with Express.js (✅ COMPLETE)
- **Database**: SQLite for development, PostgreSQL for production (✅ COMPLETE)
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
- **Database**: SQLite development setup with comprehensive schema
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

### 🔄 PHASE 3 - PowerConfidence Feedback Loop System (CURRENT PRIORITY)
**Timeline**: Week 3-5 | **Priority**: CRITICAL - Core Business Differentiator

#### Quarterly Feedback Collection System
- **5-Step Feedback Flow**: Mirror contractor onboarding experience for partner service evaluation
- **SMS-to-Web Integration**: Text message triggers with feedback flow links
- **Multi-Format Data Collection**: Text responses, audio recordings, video testimonials
- **Client Database Management**: Track ALL partner clients (TPE + non-TPE originated)
- **Automated Quarterly Scheduling**: System-driven feedback collection cycles

#### PowerConfidence Scoring Algorithm
- **Initial Scoring**: AI analysis of partner onboarding demonstrations and proof-of-capability content
- **Ongoing Feedback Processing**: Convert multi-format quarterly client feedback into numerical scores
- **Weighted Scoring System**: Service quality, communication, results delivery, recommendation likelihood
- **Historical Trend Analysis**: Quarter-over-quarter performance tracking with initial baseline
- **Industry Benchmarking**: Comparative scoring across partner categories and demonstration quality

#### AI Coaching System (Industry Intelligence Engine)
- **Feedback-Gated Access**: Unlock AI coaching for contractors who complete feedback
- **Multi-Source AI Training**: 
  - Partner onboarding video/audio demonstrations (10s to 100s per partner)
  - Initial PowerConfidence scoring from partner proof-of-capability content
  - Quarterly client feedback data and performance metrics
  - Contractor interaction patterns and success outcomes
- **Deep Industry Expertise**: AI trained on comprehensive partner demonstration content
- **Contextual Recommendations**: Size/service-matched insights from verified partner capabilities
- **Conversation Persistence**: Advanced memory system with business context and coaching history
- **Broad + Specific Intelligence**: Answer both contractor-specific and general industry questions

#### Reporting & Analytics
- **Quarterly Partner Reports**: Individual performance summaries with feedback highlights
- **Industry Reports**: Aggregate performance trends and benchmarks
- **Admin Dashboard Integration**: Real-time feedback monitoring and score management
- **Partner Feedback Visibility**: Transparent score and feedback access for partners
- **Data Export Capabilities**: Flexible reporting for various stakeholder needs

### 🔮 PHASE 4 - Partner Self-Service Portal (UPCOMING)
**Timeline**: Week 6-7 | **Priority**: Medium

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

### 📝 PHASE 5 - Production & Scaling (FUTURE)
**Timeline**: Week 8-9 | **Priority**: Low

#### Production Infrastructure
- PostgreSQL production database setup
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

## 🎛️ Special Instructions for Claude Code

### Always Do
- Create new branch for ANY code changes
- Write tests before implementing features  
- Follow component-based architecture
- Maintain TypeScript strict mode
- Use existing design system and colors
- Implement responsive design
- Add proper error handling
- Include loading states
- **Follow database connection standards** (see `docs/development-best-practices.md`)
- **Use authentication development checklist** (see `docs/DEVELOPMENT_CHECKLIST.md`)
- **Test API endpoints independently** before frontend integration

### Never Do
- Work directly on main/master branch
- Delete existing code without backup
- Break existing functionality
- Ignore TypeScript errors
- Hardcode values that should be configurable
- Skip accessibility considerations
- **Mix database connection methods** (query wrapper + direct connections)
- **Skip authentication flow testing protocol**
- **Update dependencies without compatibility checks**

### When Making Changes
1. Analyze impact on contractor flow
2. Consider partner integration effects  
3. Test responsive behavior
4. Verify brand consistency
5. Check TypeScript compilation
6. Run existing tests
7. Create new tests as needed

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
- **Database**: SQLite with comprehensive schema, ready for production PostgreSQL
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
- **Local Development**: SQLite backend + Next.js frontend on ports 5000/3002
- **Authentication**: Admin access via admin@power100.io / admin123
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

### Current Schema State (August 2025)
- **Contractors**: 18+ records with complete schema (25+ fields) including verification, profiling, focus areas, readiness indicators
- **Strategic Partners**: 11+ records with comprehensive profiles (20+ fields) including capabilities, testimonials, PowerConfidence scores
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

### **Core Application Files**
- `tpe-front-end/src/app/contractorflow/page.tsx` - Main flow logic
- `tpe-front-end/src/app/admindashboard/page.tsx` - Admin functionality  
- `tpe-front-end/src/app/globals.css` - Brand colors and styling
- `tpe-front-end/src/app/layout.tsx` - Navigation and overall structure
- `tpe-database/field-definitions.json` - Master field registry for extensibility
- `tpe-front-end/src/components/admin/AdvancedSearch.tsx` - Advanced search interface
- `tpe-front-end/src/components/admin/BulkOperations.tsx` - Bulk operations management
- Entity files - Data models and API integration

### **Partner Portal & Authentication**
- `tpe-front-end/src/app/partner-portal/page.tsx` - Partner login interface
- `tpe-front-end/src/app/partner-portal/dashboard/page.tsx` - Partner dashboard
- `tpe-backend/src/controllers/partnerAuthController.js` - Partner authentication logic
- `tpe-backend/src/middleware/partnerAuth.js` - Partner authentication middleware
- `tpe-backend/src/routes/partnerAuthRoutes.js` - Partner API routes

### **Documentation & Standards**
- `docs/development-best-practices.md` - **CRITICAL: Development standards & troubleshooting**
- `docs/DEVELOPMENT_CHECKLIST.md` - **REQUIRED: Pre-development checklist**
- `docs/database-management-roadmap.md` - Complete database enhancement plan
- `docs/SERVER_TROUBLESHOOTING.md` - Server connectivity issue solutions

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