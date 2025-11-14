# Live PCRs - Dynamic Partner Quality Rankings
**Status**: In Development
**Route**: `/live-pcrs`
**Access**: Public (No Authentication Required)
**Last Updated**: November 13, 2025

---

## 🎯 Overview

Live PCRs is a publicly accessible, dynamic showcase of partner PowerConfidence Ratings (PCRs) that updates quarterly. Inspired by ESPN's Power Rankings format, this page provides a "breathing pulse" of partner quality and performance in real-time.

### **Key Concept: No Numerical Rankings**
Unlike ESPN's competitive rankings, Live PCRs **does not use #1, #2, #3** numerical positions. This is intentional:

1. **Multiple Excellence**: Multiple partners can achieve the same PCR score - all deserve equal recognition
2. **Non-Competitive**: Partners collaborate, they don't compete for the same trophy
3. **Apples vs Oranges**: Marketing partners shouldn't be ranked against software partners - different services, different contexts
4. **Authentic Authority**: We show real, 1st-party data without artificial hierarchies that damage relationships

**Solution**: Partners are **sorted by PCR score (descending), then alphabetically** when tied. The visual order communicates quality without forcing false competition.

---

## 🎨 Design Philosophy

### ESPN-Inspired Elements (That Work for Us):
1. **Clean, scannable cards** - Each partner has a dedicated card
2. **Movement indicators** - ▲▼ showing quarterly trends
3. **Key stats at-a-glance** - PCR, feedback %, focus areas
4. **Brief analysis paragraph** - Context about performance
5. **Brand color consistency** - Black/White/Power100 Red (#FB0401)

### TPX-Specific Enhancements:
1. **Filter bar as sub-navigation** - Black bar with white text, sticky
2. **Hero title with animation** - "Live PCRs" floating with breathing space
3. **Modern card design** - Shadow, hover effects, gradient accents
4. **Mobile-first responsive** - Cards stack beautifully on mobile

---

## 📐 Page Structure

```
┌─────────────────────────────────────────────────────┐
│   Website Navigation (existing TPX nav)             │
└─────────────────────────────────────────────────────┘
                    ↓
              (breathing space)
                    ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│              "Live PCRs"                           │
│         (Hero title - animated, floating)          │
│    Similar to homepage "Your Personal Concierge"   │
│                                                     │
└─────────────────────────────────────────────────────┘
                    ↓
              (breathing space)
                    ↓
┌─────────────────────────────────────────────────────┐
│ █████████████████████████████████████████████████  │
│ █  ALL FOCUS AREAS  |  GROWTH  |  EFFICIENCY  █   │
│ █  Revenue: ALL  |  $1M-$5M  |  $5M-$10M     █   │
│ █  Feedback: ALL  |  90%+  |  85-90%         █   │
│ █████████████████████████████████████████████████  │
└─────────────────────────────────────────────────────┘
          ↓ (rankings begin immediately)
┌─────────────────────────────────────────────────────┐
│  [LOGO]  TechForce Solutions                       │
│                                                     │
│  PCR: 92.5  ▲ +5.2 from Q3 2025                   │
│                                                     │
│  Focus Areas: [Digital Marketing] [Lead Gen]       │
│  Revenue: $5M-$10M | Feedback: 95% (42 responses)  │
│                                                     │
│  TechForce continues to lead in customer           │
│  satisfaction with strong Q4 performance...        │
│                                                     │
│  [View Full Profile →]                             │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│  [LOGO]  Growth Partners Inc                       │
│  PCR: 92.5  ▲ +3.1 from Q3 2025                   │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Frontend Components:
- **Route**: `tpe-front-end/src/app/live-pcrs/page.tsx`
- **Components**:
  - `LivePCRHero.tsx` - Animated hero title
  - `PCRFilterBar.tsx` - Black sub-nav filter system
  - `PartnerPCRCard.tsx` - Individual partner card
  - `PCRMovementIndicator.tsx` - ▲▼ trend arrows

### Backend API:
- **Endpoint**: `GET /api/public/live-pcrs`
- **Query Params**:
  - `focus_area` - Filter by focus area
  - `revenue_range` - Filter by revenue tier
  - `feedback_min` - Filter by minimum feedback percentage
- **Response**:
  ```json
  {
    "success": true,
    "partners": [
      {
        "id": 1,
        "company_name": "TechForce Solutions",
        "logo_url": "...",
        "pcr_score": 92.5,
        "pcr_movement": 5.2,
        "quarter": "Q4",
        "year": 2025,
        "focus_areas": ["Digital Marketing", "Lead Generation"],
        "revenue_tier": "$5M-$10M",
        "avg_feedback_score": 95,
        "total_responses": 42,
        "analysis_snippet": "Brief performance summary..."
      }
    ],
    "filters": {
      "focus_areas": ["All", "Growth", "Efficiency", ...],
      "revenue_ranges": ["All", "$1M-$5M", "$5M-$10M", ...],
      "feedback_tiers": ["All", "90%+", "85-90%", ...]
    }
  }
  ```

### Data Source:
- **Table**: `strategic_partners`
- **PCR Calculation**: Uses existing PCR service
- **Quarterly Data**: Pulls from `quarterly_pcr_data` table
- **Movement**: Compares current quarter vs previous quarter

---

## 🎨 Filter Bar Design

### Black Sub-Navigation Filter System:

**Visual Design:**
- Background: `bg-black`
- Text: Bold, all caps, white (`text-white font-bold uppercase`)
- Active filter: `bg-power100-red text-white`
- Inactive filter: `text-white hover:text-power100-red`
- Dividers: Vertical lines (`border-r border-gray-700`)
- Sticky: `sticky top-0 z-40`

**Filter Categories:**

1. **Focus Areas Row:**
   ```
   ALL FOCUS AREAS  |  GROWTH  |  EFFICIENCY  |  RETENTION  |  MARKETING  |  OPERATIONS
   ```

2. **Revenue Range Row:**
   ```
   ALL REVENUE  |  $1M-$5M  |  $5M-$10M  |  $10M-$25M  |  $25M+
   ```

3. **Feedback Score Row:**
   ```
   ALL FEEDBACK  |  95%+  |  90-95%  |  85-90%  |  80-85%
   ```

**Interaction:**
- Click filter → Page updates instantly
- Active filters highlighted in red
- Multiple filters can be active (AND logic)
- "ALL" resets that category

---

## 📊 Partner Card Design

### Card Structure:
```tsx
<div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-8 border-2 border-gray-100">
  {/* Header: Logo + Company Name + PCR */}
  <div className="flex items-center gap-6 mb-6">
    <img src={logo} className="w-24 h-24 object-contain" />
    <div className="flex-1">
      <h3 className="text-3xl font-bold text-gray-900">{company_name}</h3>
      <div className="flex items-center gap-4 mt-2">
        <div className="text-5xl font-bold bg-gradient-to-r from-power100-red to-red-600 bg-clip-text text-transparent">
          {pcr_score}
        </div>
        <PCRMovementIndicator movement={pcr_movement} quarter="Q4" year={2025} />
      </div>
    </div>
  </div>

  {/* Focus Areas Pills */}
  <div className="flex flex-wrap gap-2 mb-4">
    {focus_areas.map(area => (
      <span className="bg-red-100 text-power100-red px-4 py-2 rounded-full text-sm font-semibold">
        {area}
      </span>
    ))}
  </div>

  {/* Stats Bar */}
  <div className="flex gap-6 text-gray-600 mb-4">
    <span>Revenue: {revenue_tier}</span>
    <span className="border-l border-gray-300 pl-6">
      Feedback: {avg_feedback_score}% ({total_responses} responses)
    </span>
  </div>

  {/* Analysis Paragraph */}
  <p className="text-gray-700 leading-relaxed mb-6">
    {analysis_snippet}
  </p>

  {/* View Profile CTA */}
  <a href={`/partners/${slug}`} className="inline-flex items-center gap-2 text-power100-red hover:text-red-700 font-semibold">
    View Full Profile
    <ArrowRight className="w-5 h-5" />
  </a>
</div>
```

---

## 🔄 PCR Movement Indicators

### Visual Design:
```tsx
// Upward movement (positive)
▲ +5.2 from Q3 2025
(Green arrow, green text)

// Downward movement (negative)
▼ -2.1 from Q3 2025
(Red arrow, red text)

// No movement
━ No change from Q3 2025
(Gray dash, gray text)
```

### Calculation:
```javascript
const movement = current_pcr - previous_quarter_pcr;
const direction = movement > 0 ? 'up' : movement < 0 ? 'down' : 'stable';
```

---

## 🎯 Sorting & Display Logic

### Primary Sort: PCR Score (Descending)
```sql
ORDER BY pcr_score DESC
```

### Secondary Sort: Alphabetical (A-Z)
```sql
ORDER BY pcr_score DESC, company_name ASC
```

### Why This Works:
1. **Highest quality partners first** - PCR is the primary indicator
2. **Fair tiebreakers** - Alphabetical is neutral, not arbitrary
3. **No false hierarchies** - Partners at 92.5 PCR are equally excellent
4. **Visual order without numbers** - Position implies quality without explicit ranking

---

## 📱 Responsive Design

### Desktop (1024px+):
- 2-column card grid
- Full filter bar visible
- Large PCR scores (5xl)

### Tablet (768-1023px):
- 1-column card grid
- Full filter bar with wrapping
- Medium PCR scores (4xl)

### Mobile (<768px):
- 1-column stacked cards
- Filter bar becomes dropdown menu
- Smaller PCR scores (3xl)
- Condensed stats

---

## 🚀 Future Enhancements

### Phase 1 (Current):
- ✅ Partners only
- ✅ PCR sorting with alphabetical tiebreaker
- ✅ Focus area + revenue + feedback filters
- ✅ Quarterly movement indicators

### Phase 2 (Future):
- [ ] **Events PCR Rankings** - Separate tab/page for events
- [ ] **Books PCR Rankings** - Book ratings and reviews
- [ ] **Podcasts PCR Rankings** - Podcast quality scores
- [ ] **Trend Tags** - "Rising Star", "Consistent Performer", "Momentum Leader"
- [ ] **Search functionality** - Find specific partners
- [ ] **Export/Share** - Share specific filtered views

### Phase 3 (Advanced):
- [ ] **Historical view** - See PCR changes over multiple quarters
- [ ] **Comparison tool** - Compare 2-3 partners side-by-side
- [ ] **Predictive insights** - AI-predicted trends
- [ ] **Category champions** - "Best in Digital Marketing", etc.

---

## ✅ Success Metrics

### User Engagement:
- Page views per month
- Time on page
- Filter usage frequency
- Click-through to partner profiles

### Business Impact:
- Partner profile views generated
- Contractor engagement with ranked partners
- Partner feedback on rankings accuracy
- Public trust indicators (shares, bookmarks)

---

## 🎨 Brand Alignment

### Color Palette:
- **Primary**: Power100 Red (#FB0401)
- **Neutral**: Black, White, Gray tones
- **Accents**: Green (positive), Red (negative)

### Typography:
- **Hero Title**: Same as homepage hero
- **Card Headers**: Bold, 2xl-3xl
- **Body Text**: Regular, readable line-height
- **Filter Bar**: Bold, uppercase, tracking-wide

### Animations:
- **Hero entrance**: Fade-in + slide-up (like homepage)
- **Card hover**: Lift + shadow increase
- **Filter transitions**: Smooth color changes
- **Movement indicators**: Subtle pulse on page load

---

## 📝 Content Guidelines

### Partner Analysis Snippets:
- **Length**: 2-3 sentences maximum
- **Tone**: Professional, data-driven, encouraging
- **Format**: "[Company] continues to [achievement] with [metric]. [Insight about trend]. [Future outlook or highlight]."
- **Example**: "TechForce continues to lead in customer satisfaction with strong Q4 performance across all metrics. Their 95% feedback score represents the highest quarterly rating achieved to date. Recent expansion into video marketing services shows promising early results."

### Filter Labels:
- **Clear and concise** - "ALL", "GROWTH", not "All Focus Areas (Click to Filter)"
- **Action-oriented** - Clicking does something immediate
- **Consistent case** - ALL CAPS for impact

---

## 🔐 Technical Notes

### Caching Strategy:
- PCR data updates quarterly → Cache for 24 hours
- Filter combinations cached client-side
- Invalidate cache on new quarterly data

### Performance:
- Lazy load partner logos
- Paginate if >100 partners (unlikely short-term)
- Optimize images (WebP format)

### SEO Optimization:
- **Title**: "Live PCRs - Power100 Partner Quality Rankings"
- **Description**: "Real-time PowerConfidence Ratings for verified Power100 partners. See quarterly performance, customer feedback, and partner quality metrics updated every quarter."
- **Keywords**: PowerConfidence Rating, PCR, partner quality, home service contractors, business partners
- **Open Graph**: Custom card image for social sharing

---

**Documentation Complete**
Ready for implementation review and iteration based on visual feedback.
