# Partner Payments & Tier Management System - Complete Overview

**Document Version:** 1.0
**Date:** October 30, 2025
**Status:** PLANNED (Ready for Implementation After Scoring Phase 2)
**Owner:** Greg Cummings & Development Team

---

## 🎯 Vision & Purpose

### The Problem
Strategic partners need a **seamless way to upgrade tiers** and Power100 needs **efficient subscription management** and **automated billing**:

- **Admin Challenge**: No UI to change partner tiers (currently API-only)
- **Subscription Tracking**: Manual tracking of subscription status, renewals, expirations
- **Payment Collection**: No automated billing system for $3,600/mo Gold or $6,000/mo Platinum tiers
- **Partner Self-Service**: Partners can't upgrade themselves or manage subscriptions

### The Solution
**Partner-Payments System**: A complete business operations platform that:
- Gives admins instant tier management through UI dropdowns
- Tracks subscription lifecycle automatically (active/expired/cancelled)
- Integrates with Stripe for automated billing and renewals
- Enables partner self-service upgrades (future)

### Core Vision

> "The PCR scoring system determines trust and ranking. The Partner-Payments system handles the business operations that drive revenue and engagement."

**Clear Separation of Concerns:**
- **PCR/Scoring** = Trust algorithm (what partners deserve based on performance)
- **PCR/Partner-Payments** = Business operations (how partners pay and how we manage subscriptions)

---

## 🏗️ System Architecture

### Relationship to PCR Scoring

```
┌─────────────────────────────────────────────────────────────┐
│                    PCR ECOSYSTEM                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐      ┌──────────────────────┐   │
│  │   PCR/Scoring        │      │  PCR/Partner-Payments│   │
│  │   (Algorithm)        │◄─────┤  (Business Ops)      │   │
│  │                      │      │                      │   │
│  │ • Profile scoring    │      │ • Admin UI           │   │
│  │ • Quarterly feedback │      │ • Subscription mgmt  │   │
│  │ • Base PCR calc      │      │ • Billing integration│   │
│  │ • Tier multipliers   │      │ • Partner self-serve │   │
│  │ • Momentum & badges  │      │                      │   │
│  └──────────────────────┘      └──────────────────────┘   │
│           │                              │                 │
│           │  Reads tier for              │  Updates tier & │
│           │  multiplier                  │  triggers recalc │
│           └──────────────────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Integration Points:**
1. **Partner-Payments → Scoring**: When tier changes, triggers PCR recalculation
2. **Scoring → Partner-Payments**: Reads `engagement_tier` to determine multiplier
3. **Both systems**: Share `strategic_partners` table (Payments writes tier, Scoring reads tier)

---

## 💰 Tier Structure (Aligned with PCR Scoring)

### Free Tier (Default)
- **Cost**: $0/month
- **Multiplier**: 1.5x
- **Frontend Label**: "Free Tier"
- **Database Value**: `'free'`
- **Features**: Basic profile, standard visibility

### Gold Tier (Mid-Tier)
- **Cost**: $3,600/month (12-month commitment)
- **Multiplier**: 2.5x
- **Frontend Label**: "Power Gold"
- **Database Value**: `'gold'`
- **Features**: Enhanced content package, deeper due diligence, PCR boost (+4 points at Base 80)

### Platinum Tier (Premium)
- **Cost**: $6,000/month (12-month commitment)
- **Multiplier**: 5.0x
- **Frontend Label**: "Power Platinum"
- **Database Value**: `'platinum'`
- **Features**: Premium transparency package, maximum PCR boost (+14 points at Base 80), priority placement

---

## 📋 Three-Phase Implementation

### Phase 1: Admin Tier Management UI (2-3 Days)
**Goal:** Give admins ability to manually manage partner tiers through UI

**What Gets Built:**

#### 1.1 Admin Dashboard Enhancement
**Location**: `/admindashboard/partners` (existing partner management page)

**New UI Components:**
```tsx
// Tier Selector Component
<Select value={partner.engagement_tier}>
  <SelectItem value="free">Free Tier (1.5x)</SelectItem>
  <SelectItem value="gold">Power Gold ($3,600/mo - 2.5x)</SelectItem>
  <SelectItem value="platinum">Power Platinum ($6,000/mo - 5.0x)</SelectItem>
</Select>

// Tier Info Display
<div className="tier-info">
  <Badge variant={tierColor}>{displayName}</Badge>
  <span>Multiplier: {multiplier}x</span>
  <span>PCR Boost: +{boost} points</span>
</div>

// Subscription Dates
<DateRangePicker
  start={subscriptionStart}
  end={subscriptionEnd}
  disabled={tier === 'free'}
/>
```

**Features:**
- ✅ Dropdown selector on partner edit page
- ✅ Display current tier with badge
- ✅ Show subscription start/end dates
- ✅ Display PCR multiplier next to tier
- ✅ Confirmation modal for tier changes
- ✅ Automatic PCR recalculation after save
- ✅ Audit log entry for tier changes

#### 1.2 Partner List Enhancements
**Show tier info in partner list table:**
- Tier badge column (color-coded: gray=free, gold=gold, purple=platinum)
- PCR score column (shows updated score with multiplier)
- Subscription status indicator (Active/Expired/Cancelled)
- Quick-action button to change tier

#### 1.3 Tier Change Confirmation Modal
```tsx
<ConfirmationModal>
  <h3>Change Tier for {partnerName}?</h3>

  <TierComparison>
    <div>Current: Free (1.5x)</div>
    <div>New: Power Gold (2.5x)</div>
  </TierComparison>

  <PCRImpact>
    <div>Current PCR: 65</div>
    <div>New PCR: ~69 (+4 points)</div>
  </PCRImpact>

  <SubscriptionDates>
    <DateInput label="Start Date" />
    <DateInput label="End Date" />
  </SubscriptionDates>

  <Actions>
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Confirm Change</Button>
  </Actions>
</ConfirmationModal>
```

#### 1.4 Backend API (Already Complete!)
- ✅ `PATCH /api/partners/:id/engagement-tier` endpoint exists
- ✅ Validates tier values (free/gold/platinum)
- ✅ Updates subscription dates
- ✅ Triggers PCR recalculation automatically
- ✅ Returns updated partner with new PCR scores

**Deliverable:** Admins can change partner tiers through UI, see immediate PCR impact, manage subscription dates.

**Testing Checklist:**
- [ ] Dropdown displays correct tier options
- [ ] Tier change triggers PCR recalculation
- [ ] Subscription dates save correctly
- [ ] Free tier clears subscription dates
- [ ] Confirmation modal shows accurate PCR impact preview
- [ ] Audit log captures tier changes with timestamp and admin user

---

### Phase 2: Subscription Management (3-5 Days)
**Goal:** Automate subscription lifecycle tracking and notifications

**What Gets Built:**

#### 2.1 Subscription Status Tracking

**New Database Schema:**
```sql
-- Extend strategic_partners table
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS auto_renewal BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS renewal_notification_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_date DATE,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS subscription_notes TEXT;

-- Subscription history table
CREATE TABLE partner_subscription_history (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),
  event_type VARCHAR(50),  -- 'upgrade', 'downgrade', 'renewal', 'cancellation', 'expiration'
  from_tier VARCHAR(20),
  to_tier VARCHAR(20),
  subscription_start DATE,
  subscription_end DATE,
  amount_paid NUMERIC(10,2),
  payment_method VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES admin_users(id)
);

CREATE INDEX idx_subscription_history_partner ON partner_subscription_history(partner_id);
CREATE INDEX idx_subscription_history_event ON partner_subscription_history(event_type);
```

#### 2.2 Automated Expiration Handling

**Background Job (Daily Cron):**
```javascript
// Check for expiring subscriptions daily
async function checkExpiringSubscriptions() {
  const today = new Date();
  const in30Days = addDays(today, 30);
  const in7Days = addDays(today, 7);

  // Find subscriptions expiring soon
  const expiringSoon = await query(`
    SELECT * FROM strategic_partners
    WHERE subscription_status = 'active'
      AND subscription_end_date BETWEEN $1 AND $2
      AND renewal_notification_sent = false
  `, [today, in30Days]);

  // Send renewal reminders
  for (const partner of expiringSoon) {
    const daysUntilExpiry = differenceInDays(partner.subscription_end_date, today);

    if (daysUntilExpiry <= 30 && daysUntilExpiry > 7) {
      await sendRenewalReminder(partner, '30-day notice');
    } else if (daysUntilExpiry <= 7) {
      await sendRenewalReminder(partner, '7-day urgent notice');
    }
  }

  // Auto-expire past-due subscriptions
  const expired = await query(`
    SELECT * FROM strategic_partners
    WHERE subscription_status = 'active'
      AND subscription_end_date < $1
      AND auto_renewal = false
  `, [today]);

  for (const partner of expired) {
    await expireSubscription(partner);
  }
}
```

#### 2.3 Subscription Dashboard

**New Admin Page: `/admindashboard/subscriptions`**

**Tabs:**
1. **Active Subscriptions** (paid tiers, current)
2. **Expiring Soon** (< 30 days until expiration)
3. **Expired** (past end date, need renewal)
4. **Cancelled** (manually cancelled by partner/admin)
5. **History** (all subscription events)

**Dashboard Features:**
- Filter by tier (Gold/Platinum)
- Sort by expiration date
- Bulk renewal actions
- Quick-view subscription details
- Export subscription report (CSV)

#### 2.4 Partner Communication

**Email Templates:**
- **30-Day Renewal Notice**: "Your Power Gold subscription expires in 30 days"
- **7-Day Urgent Notice**: "Final reminder: Subscription expires in 7 days"
- **Expiration Notice**: "Your subscription has expired, downgraded to Free tier"
- **Renewal Confirmation**: "Thank you! Your subscription has been renewed"
- **Cancellation Confirmation**: "Your subscription has been cancelled"

**Deliverable:** Automated subscription tracking, renewal reminders, expiration handling, subscription dashboard.

**Testing Checklist:**
- [ ] Daily cron job runs and detects expiring subscriptions
- [ ] 30-day renewal emails sent correctly
- [ ] 7-day urgent emails sent correctly
- [ ] Auto-expiration downgrades to free tier
- [ ] Subscription history logs all events
- [ ] Dashboard displays accurate subscription states
- [ ] Filters and sorts work correctly

---

### Phase 3: Billing Integration (5-7 Days)
**Goal:** Automate payment collection and enable partner self-service

**What Gets Built:**

#### 3.1 Stripe Integration

**Backend Services:**
```javascript
// Stripe service layer
const stripeService = {
  // Create customer
  async createCustomer(partner) {
    return await stripe.customers.create({
      name: partner.company_name,
      email: partner.primary_email,
      metadata: { partner_id: partner.id }
    });
  },

  // Create subscription
  async createSubscription(customer, tier) {
    const priceId = tier === 'gold'
      ? process.env.STRIPE_GOLD_PRICE_ID
      : process.env.STRIPE_PLATINUM_PRICE_ID;

    return await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      metadata: { partner_id: partner.id, tier }
    });
  },

  // Handle webhook events
  async handleWebhook(event) {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
    }
  }
};
```

**New Database Fields:**
```sql
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_payment_date DATE,
ADD COLUMN IF NOT EXISTS last_payment_amount NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50);  -- 'current', 'past_due', 'failed'
```

#### 3.2 Invoice Management

**Invoice Table:**
```sql
CREATE TABLE partner_invoices (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),
  stripe_invoice_id VARCHAR(100),
  invoice_number VARCHAR(50),
  amount NUMERIC(10,2),
  tier VARCHAR(20),
  period_start DATE,
  period_end DATE,
  status VARCHAR(50),  -- 'paid', 'pending', 'failed', 'refunded'
  paid_at TIMESTAMP,
  invoice_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_partner ON partner_invoices(partner_id);
CREATE INDEX idx_invoices_status ON partner_invoices(status);
```

**Admin Invoice Dashboard:**
- View all invoices (filter by status/partner/date)
- Download invoice PDFs
- Resend invoice emails
- Mark invoice as paid (manual override)
- Refund processing

#### 3.3 Partner Self-Service Portal (Future Enhancement)

**New Partner-Facing Page: `/partner-portal/:partnerId`**

**Features:**
- View current tier and benefits
- Upgrade to Gold/Platinum (payment flow)
- View subscription details and renewal date
- Download invoices
- Update payment method
- Cancel subscription (with confirmation)

**Upgrade Flow:**
```tsx
<TierUpgradeFlow>
  <Step1_SelectTier>
    <TierCard tier="gold" price="$3,600/mo" benefits={[...]} />
    <TierCard tier="platinum" price="$6,000/mo" benefits={[...]} />
  </Step1_SelectTier>

  <Step2_PaymentDetails>
    <StripeCardElement />
    <BillingAddress />
  </Step2_PaymentDetails>

  <Step3_Review>
    <OrderSummary tier="gold" amount="$3,600" />
    <CommitmentTerms duration="12 months" />
  </Step3_Review>

  <Step4_Confirmation>
    <Success>
      Welcome to Power Gold!
      Your PCR has been upgraded.
    </Success>
  </Step4_Confirmation>
</TierUpgradeFlow>
```

#### 3.4 Payment Failure Handling

**Retry Logic:**
```javascript
async function handlePaymentFailure(invoice) {
  const partner = await getPartnerByStripeCustomer(invoice.customer);

  // Stripe auto-retries 3 times over 2 weeks
  const retryCount = invoice.attempt_count;

  if (retryCount === 1) {
    // First failure: Send friendly reminder
    await sendEmail(partner, 'payment_failed_reminder');
  } else if (retryCount === 2) {
    // Second failure: Urgent notice
    await sendEmail(partner, 'payment_failed_urgent');
  } else if (retryCount >= 3) {
    // Final failure: Downgrade to free tier
    await updateEngagementTier(partner.id, 'free', null, null);
    await sendEmail(partner, 'subscription_expired_payment_failure');

    // Log event
    await logSubscriptionEvent({
      partner_id: partner.id,
      event_type: 'payment_failure_downgrade',
      notes: `Failed after ${retryCount} attempts`
    });
  }
}
```

**Deliverable:** Complete Stripe integration, automated payment collection, invoice management, partner self-service upgrade flow.

**Testing Checklist:**
- [ ] Stripe test mode integration working
- [ ] Subscription creation successful
- [ ] Payment webhooks process correctly
- [ ] Invoice generation works
- [ ] Payment failure triggers downgrade
- [ ] Partner can upgrade via self-service portal
- [ ] Payment method updates save correctly
- [ ] Cancellation flow works end-to-end

---

## 🎨 UI/UX Mockups

### Admin Tier Management (Phase 1)

```
┌────────────────────────────────────────────────────────────────┐
│  Edit Partner: BuildPro CRM                          [Save]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Basic Information                                             │
│  ├─ Company Name: BuildPro CRM                                │
│  ├─ Email: contact@buildpro.com                               │
│  └─ ... (other fields)                                        │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐│
│  │ 💰 Tier Management                                       ││
│  ├──────────────────────────────────────────────────────────┤│
│  │                                                          ││
│  │  Current Tier: [Free Tier (1.5x)            ▼]          ││
│  │                                                          ││
│  │  ℹ️  Changing tier will recalculate PCR automatically   ││
│  │                                                          ││
│  │  PCR Impact Preview:                                     ││
│  │  Current: 65  →  New: ~69 (+4 points)                   ││
│  │                                                          ││
│  │  Subscription Dates (for paid tiers):                   ││
│  │  Start:  [MM/DD/YYYY]   End:  [MM/DD/YYYY]              ││
│  │                                                          ││
│  │  Status: ● Active    [Change Tier...]                   ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Subscription Dashboard (Phase 2)

```
┌────────────────────────────────────────────────────────────────┐
│  Subscriptions                                                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Active] [Expiring Soon] [Expired] [Cancelled] [History]     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    Expiring Soon (5)                     │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │                                                          │ │
│  │  🟡 BuildPro CRM                    Power Gold  19 days  │ │
│  │     Expires: Nov 18, 2025           $3,600/mo           │ │
│  │     [Send Reminder]  [Renew]  [View Details]            │ │
│  │                                                          │ │
│  │  🟡 ContractorPro                   Power Gold  23 days  │ │
│  │     Expires: Nov 22, 2025           $3,600/mo           │ │
│  │     [Send Reminder]  [Renew]  [View Details]            │ │
│  │                                                          │ │
│  │  🔴 TechFlow Solutions         Power Platinum   7 days  │ │
│  │     Expires: Nov 6, 2025 (URGENT)   $6,000/mo           │ │
│  │     [Send Reminder]  [Renew]  [View Details]            │ │
│  │                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Integration Points

### 1. PCR Scoring System
**Data Flow:**
```
Partner-Payments                    PCR Scoring
     │                                  │
     │ Tier changed to "gold"           │
     ├─────────────────────────────────>│
     │                                  │
     │                   Reads tier, calculates PCR
     │                   Base: 80 → Final: 74
     │                                  │
     │ Returns updated partner          │
     │<─────────────────────────────────┤
     │ { finalPCR: 74, tier: "gold" }   │
```

**Trigger Points:**
- Admin changes tier via dropdown → POST `/api/partners/:id/engagement-tier`
- Partner upgrades via self-service → POST `/api/partners/:id/engagement-tier`
- Subscription expires → Downgrades to free → Triggers PCR recalc

### 2. Stripe Webhooks
**Event Handling:**
```javascript
// Webhook endpoint: POST /api/webhooks/stripe
app.post('/api/webhooks/stripe', async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.body,
    req.headers['stripe-signature'],
    process.env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case 'invoice.payment_succeeded':
      // Extend subscription end date
      await extendSubscription(partnerId, 1 month);
      break;

    case 'invoice.payment_failed':
      // Mark as past_due, send reminder
      await markPaymentFailed(partnerId);
      break;

    case 'customer.subscription.deleted':
      // Downgrade to free tier
      await updateEngagementTier(partnerId, 'free');
      break;
  }

  res.json({ received: true });
});
```

### 3. Email System
**Templates Needed:**
- Tier upgrade confirmation
- Payment receipt
- 30-day renewal reminder
- 7-day urgent renewal
- Subscription expired notice
- Payment failed notice
- Cancellation confirmation

**Integration with existing email service:**
```javascript
const emailService = require('../services/emailService');

await emailService.sendTemplate({
  to: partner.primary_email,
  template: 'tier_upgrade_confirmation',
  data: {
    partnerName: partner.company_name,
    newTier: 'Power Gold',
    amount: '$3,600/mo',
    subscriptionStart: startDate,
    subscriptionEnd: endDate,
    pcrBoost: '+4 points'
  }
});
```

---

## 📊 Success Metrics

### Phase 1 Targets
- ✅ Admin can change tier in < 30 seconds
- ✅ PCR recalculation happens automatically
- ✅ Tier changes logged in audit trail
- ✅ Zero manual SQL updates needed

### Phase 2 Targets
- ✅ 100% of expiring subscriptions get reminders
- ✅ Auto-expiration downgrades within 24 hours of end date
- ✅ Subscription dashboard shows real-time status
- ✅ Renewal rate > 80% (with reminders)

### Phase 3 Targets
- ✅ Payment processing success rate > 95%
- ✅ Partner self-service upgrades functional
- ✅ Invoice generation within 1 hour of payment
- ✅ Payment failure retry logic prevents accidental downgrades
- ✅ Revenue tracking accurate to the cent

---

## 🔐 Security Considerations

### Payment Data
- **PCI Compliance**: Never store credit card numbers (Stripe handles this)
- **Stripe Elements**: Use Stripe.js for secure card input
- **Webhook Verification**: Validate Stripe signatures on all webhooks
- **Environment Variables**: Store API keys securely (never commit to git)

### Access Control
- **Admin Only**: Tier management requires admin JWT token
- **Partner Portal**: Partners can only view/manage their own subscription
- **Audit Logging**: Log all tier changes with admin user ID and timestamp
- **Invoice Privacy**: Partners can only download their own invoices

### Data Protection
- **HTTPS Only**: All payment pages use SSL
- **Rate Limiting**: Prevent abuse of payment endpoints
- **GDPR Compliance**: Allow partners to download/delete payment history
- **Backup Strategy**: Daily backups of invoice and subscription data

---

## 🎯 Business Impact

### Revenue Generation
- **Predictable Income**: Monthly recurring revenue from Gold/Platinum tiers
- **Reduced Churn**: Automated reminders increase renewal rates
- **Self-Service Upgrades**: Partners can upgrade without admin intervention
- **Invoice Automation**: Eliminates manual invoice generation

### Operational Efficiency
- **Time Savings**: Admins spend seconds (not minutes) changing tiers
- **Reduced Errors**: Automated processes eliminate manual mistakes
- **Better Tracking**: Real-time subscription status visibility
- **Audit Trail**: Complete history of all tier/payment events

### Partner Experience
- **Transparency**: Partners see exactly what they're paying for
- **Convenience**: Self-service portal for upgrades/downgrades
- **Trust**: Professional billing and invoicing builds credibility
- **Flexibility**: Easy to upgrade, pause, or cancel subscriptions

---

## 📚 Related Documents

**PCR Scoring System:**
- [PCR Scoring Overview](../Scoring/PCR-SCORING-OVERVIEW.md)
- [Phase 1: Core Calculation Engine](../Scoring/phase-1/PHASE-1-COMPLETE.md)
- [Phase 2: Momentum & Badges](../Scoring/phase-2/) (In Progress)

**Partner Management:**
- Partner Profile Schema: `strategic_partners` table
- Admin Dashboard: `tpe-front-end/src/app/admindashboard/`
- Partner API: `tpe-backend/src/controllers/partnerController.js`

**Stripe Documentation:**
- [Stripe Subscriptions API](https://stripe.com/docs/api/subscriptions)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Elements](https://stripe.com/docs/stripe-js)

---

## 🚀 Implementation Timeline

### Overall: 10-15 Days Total

**Phase 1: Admin Tier Management UI** (2-3 days)
- Day 1: Admin dashboard UI components (dropdowns, tier badges)
- Day 2: Tier change modal, confirmation flow, integration with API
- Day 3: Testing, audit logging, polish

**Phase 2: Subscription Management** (3-5 days)
- Day 4-5: Database schema, subscription tracking service
- Day 6: Automated expiration handling, renewal reminders
- Day 7: Subscription dashboard UI
- Day 8: Testing, email templates, polish

**Phase 3: Billing Integration** (5-7 days)
- Day 9-10: Stripe integration backend (customers, subscriptions, webhooks)
- Day 11-12: Invoice management system
- Day 13-14: Partner self-service portal (upgrade flow)
- Day 15: Payment failure handling, testing, production deployment

**Dependencies:**
- Phase 1: PCR Phase 1 complete ✅
- Phase 2: Phase 1 complete
- Phase 3: Phase 2 complete, Stripe account configured

---

## 🎉 Expected Outcomes

### For Power100 Business
- **Revenue Growth**: Automated billing drives subscription sales
- **Operational Efficiency**: Admins manage tiers in seconds, not minutes
- **Data Intelligence**: Track subscription patterns, renewal rates, churn
- **Professional Operations**: Enterprise-grade billing system

### For Admins
- **Easy Tier Management**: Change tiers via dropdown (no more API calls)
- **Visibility**: Real-time subscription status dashboard
- **Automation**: Renewal reminders and expiration handling automatic
- **Audit Trail**: Complete history of all tier/payment changes

### For Partners
- **Self-Service**: Upgrade tiers without contacting admin
- **Transparency**: Clear billing, invoices, subscription details
- **Flexibility**: Easy to upgrade, pause, or cancel
- **Trust**: Professional payment system builds confidence

---

**Last Updated:** October 30, 2025
**Status:** Planned (Implementation starts after PCR Scoring Phase 2)
**Next Step:** Complete PCR Scoring Phase 2 (Momentum & Badges), then return to Partner-Payments Phase 1

**Estimated Start Date for Phase 1:** November 2025
**Prerequisites:** PCR Scoring Phase 2 complete, Stripe account configured
