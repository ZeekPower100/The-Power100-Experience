// DATABASE-CHECKED: event_feedback_responses columns verified on 2026-04-30
// Backs the public anonymous event-feedback form at
// power100.io/grosso-closers-camp-2026-feedback/ (and future partner events).
// Submissions are stored ANONYMOUSLY — no name, email, phone, IP, or company-name PII.
// Greg + Zeek receive the unified operator alert per the default policy.

const crypto = require('crypto');
const { query } = require('../config/database');

const ALLOWED_TENURES = new Set([
  'over_2_years',
  '1_to_2_years',
  '6_to_12_months',
  '0_to_6_months',
  'not_currently_client',
]);

const ALLOWED_COMPANY_SIZES = new Set([
  '0_1m', '1m_5m', '5m_10m', '10m_25m', '25m_plus',
]);

const TENURE_LABELS = {
  over_2_years: 'Over 2 years',
  '1_to_2_years': '1–2 years',
  '6_to_12_months': '6–12 months',
  '0_to_6_months': '0–6 months',
  not_currently_client: 'Not currently a client',
};

const COMPANY_SIZE_LABELS = {
  '0_1m': '$0–$1M',
  '1m_5m': '$1M–$5M',
  '5m_10m': '$5M–$10M',
  '10m_25m': '$10M–$25M',
  '25m_plus': '$25M+',
};

function asInt15(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
}

async function submitEventFeedback(req, res) {
  try {
    const b = req.body || {};
    const partnerId = parseInt(b.partner_id, 10);
    const eventName = (b.event_name || '').toString().trim().slice(0, 150);

    if (!Number.isFinite(partnerId) || !eventName) {
      return res.status(400).json({ success: false, error: 'partner_id and event_name are required' });
    }
    if (!b.consent_given) {
      return res.status(400).json({ success: false, error: 'Consent is required to submit anonymous feedback' });
    }

    const ratings = {
      vibe: asInt15(b.rating_vibe),
      value: asInt15(b.rating_value),
      content: asInt15(b.rating_content),
      facility: asInt15(b.rating_facility),
      energy: asInt15(b.rating_energy),
    };
    if (Object.values(ratings).some(v => v === null)) {
      return res.status(400).json({ success: false, error: 'All five ratings (vibe, value, content, facility, energy) must be 1–5' });
    }

    const tenure = (b.client_tenure || '').toString();
    if (!ALLOWED_TENURES.has(tenure)) {
      return res.status(400).json({ success: false, error: 'Invalid client_tenure value' });
    }

    const companySize = (b.company_size || '').toString();
    if (companySize && !ALLOWED_COMPANY_SIZES.has(companySize)) {
      return res.status(400).json({ success: false, error: 'Invalid company_size value' });
    }

    const position = (b.position || '').toString().trim().slice(0, 100) || null;

    // Hash the IP+UA for spam-detection only — no raw PII stored
    const rawSig = `${req.ip || ''}::${req.get('user-agent') || ''}`;
    const submissionHash = crypto.createHash('sha256').update(rawSig).digest('hex');
    const userAgent = (req.get('user-agent') || '').slice(0, 500);

    const ins = await query(
      `INSERT INTO event_feedback_responses (
        partner_id, event_name, position, company_size,
        rating_vibe, rating_value, rating_content, rating_facility, rating_energy,
        client_tenure, consent_given, submission_hash, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, $12, NOW())
      RETURNING id`,
      [
        partnerId, eventName, position, companySize || null,
        ratings.vibe, ratings.value, ratings.content, ratings.facility, ratings.energy,
        tenure, submissionHash, userAgent,
      ]
    );
    const responseId = ins.rows[0].id;

    // Look up partner name for the operator alert
    const partnerRow = await query('SELECT company_name FROM strategic_partners WHERE id = $1', [partnerId]).catch(() => ({ rows: [] }));
    const partnerName = partnerRow.rows[0]?.company_name || `Partner #${partnerId}`;

    // Operator alert (fire-and-forget — Greg + Zeek by default per CLAUDE.md policy)
    const avgRating = (ratings.vibe + ratings.value + ratings.content + ratings.facility + ratings.energy) / 5;
    try {
      const { sendOperatorAlert } = require('../services/communicationService');
      sendOperatorAlert({
        event: 'event_feedback_submitted',
        title: `New feedback for ${partnerName} · ${eventName} (avg ${avgRating.toFixed(1)}/5)`,
        fields: {
          Partner: partnerName,
          Event: eventName,
          'Avg Rating': `${avgRating.toFixed(1)} / 5`,
          Vibe: ratings.vibe,
          Value: ratings.value,
          Content: ratings.content,
          Facility: ratings.facility,
          Energy: ratings.energy,
          Position: position || '(not provided)',
          'Company Size': companySize ? COMPANY_SIZE_LABELS[companySize] : '(not provided)',
          'Client Tenure': TENURE_LABELS[tenure],
          'Response ID': responseId,
        },
      }).catch(e => console.warn('[eventFeedback] operator alert failed:', e.message));
    } catch (e) { console.warn('[eventFeedback] operator alert require failed:', e.message); }

    return res.json({ success: true, response_id: responseId });
  } catch (err) {
    console.error('[eventFeedback] submit error:', err.message, err.stack);
    return res.status(500).json({ success: false, error: 'Submission failed. Please try again.' });
  }
}

module.exports = { submitEventFeedback };
