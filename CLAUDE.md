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
- **Backend**: Node.js (to be built)
- **Database**: PostgreSQL (to be designed)

## 🚧 Development Status

### ✅ Completed (Frontend)
- Basic contractor flow structure (5 steps)
- Admin dashboard with analytics
- Partner management interface
- Brand styling and responsive layout
- Navigation and routing

### 🚧 In Progress
- Individual step components for contractor flow
- Partner matching algorithm implementation
- Email integration system
- SMS verification system

### 📝 TODO - Frontend
- Complete contractor flow step components
- Implement partner matching logic
- Add comprehensive testing suite

### 📝 TODO - Backend (To Be Built)
- **API Design & Setup**
  - RESTful API with Express.js
  - Authentication & authorization system
  - JWT token management
  - Rate limiting and security middleware

- **Database Design**
  - PostgreSQL database setup
  - Contractor profiles schema
  - Strategic partner profiles schema
  - Demo booking system schema
  - PowerConfidence scoring schema
  - User authentication schema

- **Core API Endpoints**
  - `/api/contractors` - CRUD operations
  - `/api/partners` - Partner management
  - `/api/bookings` - Demo booking system
  - `/api/verification` - SMS/email verification
  - `/api/matching` - Partner matching algorithm
  - `/api/admin` - Admin dashboard data

- **Integration Services**
  - SMS verification service (Twilio)
  - Email service (SendGrid/AWS SES)
  - Partner subdomain routing
  - Quarterly customer feedback system
  - PowerConfidence scoring calculations

- **Deployment & Infrastructure**
  - Docker containerization
  - Production database setup
  - Environment configuration
  - CI/CD pipeline integration
  - Monitoring and logging

### 📝 TODO - Full-Stack Integration
- Connect frontend to backend APIs
- Implement real-time features
- Add comprehensive error handling
- Performance optimization
- Security hardening

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

### Never Do
- Work directly on main/master branch
- Delete existing code without backup
- Break existing functionality
- Ignore TypeScript errors
- Hardcode values that should be configurable
- Skip accessibility considerations

### When Making Changes
1. Analyze impact on contractor flow
2. Consider partner integration effects  
3. Test responsive behavior
4. Verify brand consistency
5. Check TypeScript compilation
6. Run existing tests
7. Create new tests as needed

## 🔍 Key Files to Always Consider

- `tpe-front-end/src/app/contractorflow/page.tsx` - Main flow logic
- `tpe-front-end/src/app/admindashboard/page.tsx` - Admin functionality  
- `tpe-front-end/src/app/globals.css` - Brand colors and styling
- `tpe-front-end/src/app/layout.tsx` - Navigation and overall structure
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