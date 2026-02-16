// DATABASE-CHECKED: middleware layer - no direct table access
// Purpose: Sanitize member input before it reaches the AI Concierge agent.
// Detects prompt injection patterns, logs them, strips them, and continues.
// Does NOT block requests — sanitizes and flags for review.

const INJECTION_PATTERNS = [
  // System prompt extraction attempts
  { pattern: /ignore\s+(your|all|previous)\s+(instructions|rules|prompt)/i, label: 'ignore_instructions' },
  { pattern: /forget\s+(your|all|previous)\s+(instructions|rules|prompt|context)/i, label: 'forget_instructions' },
  { pattern: /show\s+me\s+(your|the)\s+(system\s+)?prompt/i, label: 'show_prompt' },
  { pattern: /what\s+are\s+your\s+(instructions|rules|guidelines)/i, label: 'extract_instructions' },
  { pattern: /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions)/i, label: 'repeat_prompt' },
  { pattern: /print\s+(your|the)\s+(system\s+)?(prompt|instructions)/i, label: 'print_prompt' },

  // Role hijacking
  { pattern: /you\s+are\s+now\s+(?!an?\s+AI\s+Concierge)/i, label: 'role_hijack' },
  { pattern: /act\s+as\s+(a\s+)?different\s+(ai|assistant|bot)/i, label: 'role_hijack' },
  { pattern: /pretend\s+(to\s+be|you\s+are)\s+(?!helping)/i, label: 'role_hijack' },
  { pattern: /switch\s+to\s+(a\s+)?new\s+(role|mode|persona)/i, label: 'role_switch' },

  // Cross-member data access
  { pattern: /show\s+me\s+member\s+\d+/i, label: 'cross_member_access' },
  { pattern: /access\s+(data|profile|info)\s+(for|of)\s+(member|user)\s+\d+/i, label: 'cross_member_access' },
  { pattern: /other\s+(members?|users?)\s+(data|profiles?|info)/i, label: 'cross_member_access' },

  // SQL injection within conversational input
  { pattern: /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE)\s+/i, label: 'sql_injection' },
  { pattern: /'\s*(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, label: 'sql_injection' },
  { pattern: /UNION\s+(ALL\s+)?SELECT/i, label: 'sql_injection' },

  // System access attempts
  { pattern: /access\s+(the\s+)?(database|server|admin|backend)/i, label: 'system_access' },
  { pattern: /run\s+(a\s+)?(command|query|script)\s+on/i, label: 'system_access' },
];

// Track repeated attempts per session for escalation
const sessionAttempts = new Map();
const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Periodic cleanup of old session tracking data
setInterval(() => {
  const cutoff = Date.now() - SESSION_CLEANUP_INTERVAL;
  for (const [key, data] of sessionAttempts.entries()) {
    if (data.lastAttempt < cutoff) {
      sessionAttempts.delete(key);
    }
  }
}, SESSION_CLEANUP_INTERVAL);

/**
 * Sanitize input by removing detected injection patterns
 */
function sanitizeInput(input, detections) {
  let sanitized = input;
  for (const detection of detections) {
    sanitized = sanitized.replace(detection.match, '[filtered]');
  }
  return sanitized;
}

/**
 * Detect injection patterns in input text
 */
function detectInjections(input) {
  const detections = [];
  for (const { pattern, label } of INJECTION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      detections.push({
        label,
        match: match[0],
        index: match.index,
      });
    }
  }
  return detections;
}

/**
 * Express middleware for prompt injection detection and sanitization.
 * Applies to AI concierge message endpoints.
 */
function promptInjectionGuard(req, res, next) {
  const message = req.body?.message || req.body?.content;
  if (!message || typeof message !== 'string') {
    return next();
  }

  const detections = detectInjections(message);

  if (detections.length === 0) {
    return next();
  }

  // Identify the member/contractor for logging
  const memberId = req.body?.member_id || null;
  const contractorId = req.body?.contractor_id || null;
  const sessionId = req.body?.session_id || 'unknown';
  const sessionKey = `${memberId || contractorId || 'anon'}-${sessionId}`;

  // Track attempts per session
  const attempts = sessionAttempts.get(sessionKey) || { count: 0, labels: [], lastAttempt: 0 };
  attempts.count += detections.length;
  attempts.labels.push(...detections.map(d => d.label));
  attempts.lastAttempt = Date.now();
  sessionAttempts.set(sessionKey, attempts);

  // Log the detection
  console.warn('[PROMPT_INJECTION_GUARD]', {
    timestamp: new Date().toISOString(),
    memberId,
    contractorId,
    sessionId,
    detections: detections.map(d => ({ label: d.label, snippet: d.match.substring(0, 50) })),
    totalSessionAttempts: attempts.count,
    escalated: attempts.count >= 3,
  });

  // Sanitize the input and continue
  req.body.message = sanitizeInput(message, detections);
  if (req.body.content) {
    req.body.content = sanitizeInput(req.body.content, detections);
  }

  // Flag for downstream if repeated offender (3+ attempts in session)
  req.promptInjectionDetected = true;
  req.promptInjectionEscalated = attempts.count >= 3;

  next();
}

module.exports = {
  promptInjectionGuard,
  detectInjections,
  sanitizeInput,
  // Exported for testing
  INJECTION_PATTERNS,
};
