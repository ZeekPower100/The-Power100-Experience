# Phase 2: Reporting & Intelligence Layer - Implementation Plan

**Document Version:** 1.0
**Date:** November 14, 2025
**Status:** READY FOR PLANNING
**Prerequisites:** Phase 1 Complete (Employee Management & Feedback Collection)

---

## 📋 Executive Summary

**Goal:** Build CEO dashboards, reporting system, trend analysis, and AI Concierge integration for cultural intelligence.

### What Phase 2 Delivers
- ✅ CEO dashboard with CEO PCR score and breakdowns
- ✅ Quarterly trend charts and comparisons
- ✅ Anonymous employee comment feeds
- ✅ Performance alerts (culture declining, low response rates)
- ✅ PDF quarterly reports for CEOs
- ✅ AI Concierge integration (culture recommendations)
- ✅ Resource suggestions (books, partners, podcasts based on scores)
- ✅ Benchmark comparisons (optional)

---

## 🎨 Frontend Implementation

### Component 1: CEO Dashboard Page

**File:** `tpe-front-end/src/app/contractor/ceo-dashboard/page.tsx`

**DATABASE-CHECKED: References contractors, ceo_pcr_scores tables**

#### Dashboard Layout

```typescript
// CEO PCR Dashboard - Main View
// Shows current score, category breakdowns, trends, and insights

interface CeoPcrData {
  current_ceo_pcr: number;
  previous_ceo_pcr: number;
  ceo_pcr_trend: 'improving' | 'stable' | 'declining' | 'new';
  last_survey_date: string;
  total_employees: number;

  // Latest quarter breakdown
  latest_quarter: {
    quarter: string;
    year: number;
    response_rate: number;
    total_responses: number;

    category_scores: {
      leadership: number;
      culture: number;
      growth: number;
      satisfaction: number;
      nps: number;
    };

    trend_modifier: number;
  };

  // Quarterly history (last 4 quarters)
  history: Array<{
    quarter: string;
    year: number;
    final_ceo_pcr: number;
    base_score: number;
  }>;
}
```

#### Dashboard Sections

**1. Score Overview Card**
```tsx
<div className="bg-white rounded-2xl shadow-lg p-8">
  {/* Large CEO PCR Score Display */}
  <div className="text-center">
    <div className="text-6xl font-bold text-power100-green">
      {currentCeoPcr.toFixed(1)}
    </div>
    <div className="text-gray-600 mt-2">CEO PowerConfidence Rating</div>

    {/* Trend Indicator */}
    {trend === 'improving' && (
      <div className="flex items-center justify-center mt-4 text-green-600">
        <TrendingUp className="w-5 h-5 mr-2" />
        <span>Improving ({trendModifier > 0 ? `+${trendModifier}` : trendModifier} pts)</span>
      </div>
    )}

    {trend === 'declining' && (
      <div className="flex items-center justify-center mt-4 text-red-600">
        <TrendingDown className="w-5 h-5 mr-2" />
        <span>Needs Attention ({trendModifier} pts)</span>
      </div>
    )}
  </div>

  {/* Survey Stats */}
  <div className="grid grid-cols-2 gap-4 mt-8">
    <div className="text-center">
      <div className="text-2xl font-bold">{responseRate.toFixed(0)}%</div>
      <div className="text-sm text-gray-600">Response Rate</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold">{totalResponses}/{totalEmployees}</div>
      <div className="text-sm text-gray-600">Responses</div>
    </div>
  </div>
</div>
```

**2. Category Breakdown**
```tsx
<div className="bg-white rounded-2xl shadow-lg p-8">
  <h2 className="text-2xl font-bold mb-6">Category Scores</h2>

  {/* Leadership Score Bar */}
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <span className="font-semibold">Leadership Effectiveness</span>
      <span className="text-power100-green">{leadershipScore.toFixed(1)}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-power100-green h-3 rounded-full"
        style={{ width: `${leadershipScore}%` }}
      />
    </div>
  </div>

  {/* Culture Score Bar */}
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <span className="font-semibold">Company Culture</span>
      <span className="text-power100-green">{cultureScore.toFixed(1)}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-power100-green h-3 rounded-full"
        style={{ width: `${cultureScore}%` }}
      />
    </div>
  </div>

  {/* Growth & Development Score Bar */}
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <span className="font-semibold">Growth & Development</span>
      <span className="text-power100-green">{growthScore.toFixed(1)}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-power100-green h-3 rounded-full"
        style={{ width: `${growthScore}%` }}
      />
    </div>
  </div>

  {/* Overall Satisfaction Score Bar */}
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <span className="font-semibold">Overall Satisfaction</span>
      <span className="text-power100-green">{satisfactionScore.toFixed(1)}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-power100-green h-3 rounded-full"
        style={{ width: `${satisfactionScore}%` }}
      />
    </div>
  </div>

  {/* NPS Score */}
  <div>
    <div className="flex justify-between mb-2">
      <span className="font-semibold">Net Promoter Score</span>
      <span className="text-power100-green">{npsScore.toFixed(1)}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div
        className="bg-power100-green h-3 rounded-full"
        style={{ width: `${npsScore}%` }}
      />
    </div>
  </div>
</div>
```

**3. Quarterly Trend Chart**
```tsx
<div className="bg-white rounded-2xl shadow-lg p-8">
  <h2 className="text-2xl font-bold mb-6">Quarterly Trend</h2>

  {/* Use Chart.js or similar for line graph */}
  <LineChart
    data={quarterlyHistory}
    xKey="quarter"
    yKey="final_ceo_pcr"
    height={300}
  />

  {/* Quarterly comparison table */}
  <div className="mt-6">
    <table className="w-full">
      <thead>
        <tr className="border-b">
          <th className="text-left py-2">Quarter</th>
          <th className="text-right py-2">Score</th>
          <th className="text-right py-2">Change</th>
        </tr>
      </thead>
      <tbody>
        {quarterlyHistory.map((quarter, index) => (
          <tr key={quarter.quarter} className="border-b">
            <td className="py-2">{quarter.quarter}-{quarter.year}</td>
            <td className="text-right">{quarter.final_ceo_pcr.toFixed(1)}</td>
            <td className={`text-right ${
              index < quarterlyHistory.length - 1 &&
              quarter.final_ceo_pcr > quarterlyHistory[index + 1].final_ceo_pcr
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {index < quarterlyHistory.length - 1 &&
                `${quarter.final_ceo_pcr - quarterlyHistory[index + 1].final_ceo_pcr > 0 ? '+' : ''}${
                  (quarter.final_ceo_pcr - quarterlyHistory[index + 1].final_ceo_pcr).toFixed(1)
                }`}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

**4. Anonymous Comments Feed** (Optional)
```tsx
<div className="bg-white rounded-2xl shadow-lg p-8">
  <h2 className="text-2xl font-bold mb-6">Employee Feedback</h2>

  {anonymousComments.map((comment, index) => (
    <div key={index} className="border-l-4 border-power100-green pl-4 mb-4">
      <p className="text-gray-700 italic">"{comment.text}"</p>
      <p className="text-sm text-gray-500 mt-2">
        {comment.quarter}-{comment.year} | Anonymous Employee
      </p>
    </div>
  ))}
</div>
```

---

## 🔧 Backend Implementation

### Service: ceoPcrReportingService.js

**File:** `tpe-backend/src/services/ceoPcrReportingService.js`

**DATABASE-CHECKED: All queries verified against schema**

```javascript
// DATABASE-CHECKED: contractors, ceo_pcr_scores tables verified November 14, 2025
const { query } = require('../config/database');

/**
 * Get CEO dashboard data
 * Includes current score, category breakdowns, and quarterly history
 */
async function getCeoDashboardData(contractorId) {
  // DATABASE FIELDS: contractors (current_ceo_pcr, previous_ceo_pcr, ceo_pcr_trend, etc.)
  const contractorResult = await query(`
    SELECT
      current_ceo_pcr,
      previous_ceo_pcr,
      ceo_pcr_trend,
      total_employees,
      last_employee_survey
    FROM contractors
    WHERE id = $1
  `, [contractorId]);

  if (contractorResult.rows.length === 0) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  const contractor = contractorResult.rows[0];

  // DATABASE FIELDS: ceo_pcr_scores (all columns)
  const latestQuarterResult = await query(`
    SELECT
      quarter,
      year,
      total_employees,
      total_responses,
      response_rate,
      leadership_score,
      culture_score,
      growth_score,
      satisfaction_score,
      nps_score,
      base_score,
      trend_modifier,
      final_ceo_pcr
    FROM ceo_pcr_scores
    WHERE contractor_id = $1
    ORDER BY year DESC, quarter DESC
    LIMIT 1
  `, [contractorId]);

  const latestQuarter = latestQuarterResult.rows[0] || null;

  // Get quarterly history (last 4 quarters)
  // DATABASE FIELDS: ceo_pcr_scores
  const historyResult = await query(`
    SELECT
      quarter,
      year,
      final_ceo_pcr,
      base_score,
      trend_modifier
    FROM ceo_pcr_scores
    WHERE contractor_id = $1
    ORDER BY year DESC, quarter DESC
    LIMIT 4
  `, [contractorId]);

  return {
    current_ceo_pcr: contractor.current_ceo_pcr || 0,
    previous_ceo_pcr: contractor.previous_ceo_pcr || 0,
    ceo_pcr_trend: contractor.ceo_pcr_trend || 'new',
    total_employees: contractor.total_employees || 0,
    last_survey_date: contractor.last_employee_survey,

    latest_quarter: latestQuarter ? {
      quarter: latestQuarter.quarter,
      year: latestQuarter.year,
      response_rate: parseFloat(latestQuarter.response_rate),
      total_responses: latestQuarter.total_responses,

      category_scores: {
        leadership: parseFloat(latestQuarter.leadership_score),
        culture: parseFloat(latestQuarter.culture_score),
        growth: parseFloat(latestQuarter.growth_score),
        satisfaction: parseFloat(latestQuarter.satisfaction_score),
        nps: parseFloat(latestQuarter.nps_score)
      },

      trend_modifier: latestQuarter.trend_modifier
    } : null,

    history: historyResult.rows.map(row => ({
      quarter: row.quarter,
      year: row.year,
      final_ceo_pcr: parseFloat(row.final_ceo_pcr),
      base_score: parseFloat(row.base_score),
      trend_modifier: row.trend_modifier
    }))
  };
}

/**
 * Generate performance alerts based on scores and trends
 */
async function generatePerformanceAlerts(contractorId) {
  const data = await getCeoDashboardData(contractorId);
  const alerts = [];

  // Alert: Declining trend
  if (data.ceo_pcr_trend === 'declining') {
    alerts.push({
      type: 'warning',
      title: 'Culture Score Declining',
      message: `Your CEO PCR has declined for 2+ consecutive quarters. Review category scores to identify areas for improvement.`,
      action: 'View Improvement Resources'
    });
  }

  // Alert: Low response rate
  if (data.latest_quarter && data.latest_quarter.response_rate < 70) {
    alerts.push({
      type: 'info',
      title: 'Low Response Rate',
      message: `Only ${data.latest_quarter.response_rate.toFixed(0)}% of employees responded. Encourage participation for more accurate insights.`,
      action: 'Send Reminder'
    });
  }

  // Alert: Low category score
  if (data.latest_quarter) {
    const lowestCategory = Object.entries(data.latest_quarter.category_scores)
      .sort((a, b) => a[1] - b[1])[0];

    if (lowestCategory[1] < 70) {
      const categoryNames = {
        leadership: 'Leadership Effectiveness',
        culture: 'Company Culture',
        growth: 'Growth & Development',
        satisfaction: 'Overall Satisfaction',
        nps: 'Employee Recommendation'
      };

      alerts.push({
        type: 'warning',
        title: `${categoryNames[lowestCategory[0]]} Needs Attention`,
        message: `Score: ${lowestCategory[1].toFixed(1)}/100. This area requires focus to improve employee experience.`,
        action: 'Get Recommendations'
      });
    }
  }

  return alerts;
}

module.exports = {
  getCeoDashboardData,
  generatePerformanceAlerts
};
```

---

## 🤖 AI Concierge Integration

### Service: aiCeoCultureService.js

**File:** `tpe-backend/src/services/aiCeoCultureService.js`

```javascript
// AI Concierge integration for CEO PCR insights and recommendations
const { getCeoDashboardData } = require('./ceoPcrReportingService');

/**
 * Generate AI recommendations based on CEO PCR scores
 */
async function generateCultureRecommendations(contractorId) {
  const data = await getCeoDashboardData(contractorId);

  if (!data.latest_quarter) {
    return {
      message: "No employee feedback data available yet. Launch your first quarterly survey to get started!",
      resources: []
    };
  }

  const recommendations = [];
  const resources = [];

  // Leadership recommendations
  if (data.latest_quarter.category_scores.leadership < 75) {
    recommendations.push({
      category: 'Leadership Development',
      issue: 'Leadership effectiveness score is below target',
      suggestions: [
        'Schedule regular one-on-one meetings with team members',
        'Increase transparency in company communications',
        'Implement open-door policy for employee concerns'
      ]
    });

    resources.push({
      type: 'book',
      title: 'The Culture Code',
      author: 'Daniel Coyle',
      reason: 'Proven strategies for building strong team culture'
    });

    resources.push({
      type: 'partner',
      name: 'EOS Worldwide',
      reason: 'Leadership coaching and organizational development'
    });
  }

  // Culture recommendations
  if (data.latest_quarter.category_scores.culture < 75) {
    recommendations.push({
      category: 'Company Culture',
      issue: 'Work environment and values alignment needs improvement',
      suggestions: [
        'Review and clarify company core values',
        'Create team-building opportunities',
        'Address work-life balance concerns'
      ]
    });

    resources.push({
      type: 'podcast',
      title: 'WorkLife with Adam Grant',
      reason: 'Insights on building better workplace culture'
    });
  }

  // Growth recommendations
  if (data.latest_quarter.category_scores.growth < 75) {
    recommendations.push({
      category: 'Employee Development',
      issue: 'Career growth opportunities are limited',
      suggestions: [
        'Implement professional development program',
        'Create clear career advancement paths',
        'Offer training and certification opportunities'
      ]
    });

    resources.push({
      type: 'partner',
      name: 'Destination Motivation',
      reason: 'Employee training and development programs'
    });
  }

  return {
    current_score: data.current_ceo_pcr,
    trend: data.ceo_pcr_trend,
    recommendations,
    resources,
    summary: generateSummary(data)
  };
}

/**
 * Generate AI summary of cultural health
 */
function generateSummary(data) {
  const score = data.current_ceo_pcr;
  const trend = data.ceo_pcr_trend;

  if (trend === 'improving') {
    return `Your company culture is on an upward trajectory with a CEO PCR of ${score.toFixed(1)}. Employees are responding positively to your leadership efforts. Continue focusing on the areas that are working well.`;
  }

  if (trend === 'declining') {
    return `Your CEO PCR of ${score.toFixed(1)} shows room for improvement. Employee satisfaction has declined recently. Review the specific category scores to identify priority areas for cultural enhancement.`;
  }

  return `Your CEO PCR of ${score.toFixed(1)} indicates ${score > 80 ? 'strong' : score > 70 ? 'good' : 'developing'} company culture. Maintain consistent focus on employee experience to sustain or improve this rating.`;
}

module.exports = {
  generateCultureRecommendations
};
```

---

## 📊 Reporting System

### PDF Report Generation

**File:** `tpe-backend/src/services/ceoPcrPdfReportService.js`

```javascript
// Generate PDF quarterly reports for CEOs
const PDFDocument = require('pdfkit');
const { getCeoDashboardData } = require('./ceoPcrReportingService');

/**
 * Generate quarterly CEO PCR report PDF
 */
async function generateQuarterlyReport(contractorId, quarter, year) {
  const data = await getCeoDashboardData(contractorId);

  // Create PDF document
  const doc = new PDFDocument({
    size: 'LETTER',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });

  // Header
  doc.fontSize(24).text('CEO PowerConfidence Report', { align: 'center' });
  doc.fontSize(14).text(`${quarter} ${year}`, { align: 'center' });
  doc.moveDown(2);

  // Score Overview
  doc.fontSize(18).text('Overall Score');
  doc.fontSize(48).fillColor('#28a745').text(data.current_ceo_pcr.toFixed(1), { align: 'center' });
  doc.fillColor('#000000');
  doc.moveDown();

  // Category Breakdown
  doc.fontSize(18).text('Category Scores');
  doc.moveDown();

  if (data.latest_quarter) {
    const categories = data.latest_quarter.category_scores;
    Object.entries(categories).forEach(([category, score]) => {
      doc.fontSize(12).text(`${category.charAt(0).toUpperCase() + category.slice(1)}: ${score.toFixed(1)}/100`);
    });
  }

  // Quarterly Trend
  doc.addPage();
  doc.fontSize(18).text('Quarterly Trend');
  doc.moveDown();

  data.history.forEach(quarter => {
    doc.fontSize(12).text(`${quarter.quarter}-${quarter.year}: ${quarter.final_ceo_pcr.toFixed(1)}`);
  });

  // Recommendations
  doc.addPage();
  doc.fontSize(18).text('Recommendations');
  doc.moveDown();
  doc.fontSize(12).text('Based on your scores, focus on:');
  doc.list([
    'Continue transparent communication',
    'Invest in employee development',
    'Strengthen company culture initiatives'
  ]);

  doc.end();
  return doc;
}

module.exports = {
  generateQuarterlyReport
};
```

---

## 📋 Testing Checklist

### Dashboard Testing
- [ ] CEO can view current CEO PCR score
- [ ] Category breakdowns display correctly
- [ ] Quarterly trend chart renders properly
- [ ] Alert system triggers for declining scores
- [ ] Response rate displays accurately

### AI Integration Testing
- [ ] AI recommendations generated based on scores
- [ ] Resource suggestions relevant to low categories
- [ ] Culture summary reflects actual trend
- [ ] Recommendations link to real Power100 resources

### Reporting Testing
- [ ] PDF reports generate successfully
- [ ] Reports include all required sections
- [ ] Email delivery works (quarterly automation)
- [ ] Report data matches dashboard data

---

## 🎯 Success Criteria

- ✅ CEOs can view comprehensive culture dashboards
- ✅ Alerts notify CEOs of concerning trends
- ✅ AI provides personalized improvement recommendations
- ✅ Quarterly PDF reports auto-generate and email to CEOs
- ✅ Integration with Power100 resources (books, partners, podcasts)
- ✅ Performance trends visualized clearly

---

**Next Step:** Complete [Phase 2 Pre-Flight Checklist](./PHASE-2-PRE-FLIGHT-CHECKLIST.md)
