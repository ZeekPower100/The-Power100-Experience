/**
 * Timezone Detector
 * Auto-detects timezone from phone number area codes
 */

// Map of US area codes to timezones
// This is a simplified mapping - covers major area codes
const AREA_CODE_TO_TIMEZONE = {
  // Eastern Time (UTC-5/-4)
  '212': 'America/New_York', '646': 'America/New_York', '917': 'America/New_York', // NYC
  '718': 'America/New_York', '347': 'America/New_York', '929': 'America/New_York',
  '201': 'America/New_York', '551': 'America/New_York', // New Jersey
  '215': 'America/New_York', '267': 'America/New_York', '445': 'America/New_York', // Philadelphia
  '404': 'America/New_York', '678': 'America/New_York', '470': 'America/New_York', // Atlanta
  '305': 'America/New_York', '786': 'America/New_York', '954': 'America/New_York', // Miami
  '407': 'America/New_York', '321': 'America/New_York', // Orlando
  '617': 'America/New_York', '857': 'America/New_York', // Boston
  '703': 'America/New_York', '571': 'America/New_York', // Virginia
  '202': 'America/New_York', // Washington DC
  '301': 'America/New_York', '240': 'America/New_York', // Maryland
  '910': 'America/New_York', '919': 'America/New_York', '980': 'America/New_York', // North Carolina
  '803': 'America/New_York', '843': 'America/New_York', // South Carolina

  // Central Time (UTC-6/-5)
  '312': 'America/Chicago', '773': 'America/Chicago', '872': 'America/Chicago', // Chicago
  '214': 'America/Chicago', '469': 'America/Chicago', '972': 'America/Chicago', // Dallas
  '713': 'America/Chicago', '281': 'America/Chicago', '832': 'America/Chicago', // Houston
  '210': 'America/Chicago', '726': 'America/Chicago', // San Antonio
  '512': 'America/Chicago', '737': 'America/Chicago', // Austin
  '314': 'America/Chicago', '636': 'America/Chicago', // St. Louis
  '612': 'America/Chicago', '651': 'America/Chicago', // Minneapolis
  '816': 'America/Chicago', '913': 'America/Chicago', // Kansas City
  '504': 'America/Chicago', // New Orleans
  '414': 'America/Chicago', // Milwaukee
  '615': 'America/Chicago', '629': 'America/Chicago', // Nashville
  '901': 'America/Chicago', // Memphis

  // Mountain Time (UTC-7/-6)
  '303': 'America/Denver', '720': 'America/Denver', // Denver
  '602': 'America/Denver', '480': 'America/Denver', '623': 'America/Denver', // Phoenix (Note: AZ doesn't observe DST)
  '801': 'America/Denver', '385': 'America/Denver', // Salt Lake City
  '505': 'America/Denver', // Albuquerque
  '406': 'America/Denver', // Montana
  '307': 'America/Denver', // Wyoming

  // Pacific Time (UTC-8/-7)
  '213': 'America/Los_Angeles', '323': 'America/Los_Angeles', '310': 'America/Los_Angeles', // Los Angeles
  '818': 'America/Los_Angeles', '424': 'America/Los_Angeles', '747': 'America/Los_Angeles',
  '415': 'America/Los_Angeles', '628': 'America/Los_Angeles', // San Francisco
  '510': 'America/Los_Angeles', '925': 'America/Los_Angeles', // Oakland
  '408': 'America/Los_Angeles', '669': 'America/Los_Angeles', // San Jose
  '619': 'America/Los_Angeles', '858': 'America/Los_Angeles', // San Diego
  '916': 'America/Los_Angeles', '279': 'America/Los_Angeles', // Sacramento
  '206': 'America/Los_Angeles', '253': 'America/Los_Angeles', // Seattle
  '503': 'America/Los_Angeles', '971': 'America/Los_Angeles', // Portland
  '702': 'America/Los_Angeles', '725': 'America/Los_Angeles', // Las Vegas
};

/**
 * Detect timezone from phone number
 * @param {string} phone - Phone number (any format)
 * @returns {string} - IANA timezone (e.g., 'America/New_York')
 */
function detectTimezone(phone) {
  if (!phone) {
    return 'America/New_York'; // Default to Eastern
  }

  // Extract just the digits
  const digits = phone.replace(/\D/g, '');

  // Get area code (first 3 digits after country code)
  let areaCode;
  if (digits.length === 11 && digits.startsWith('1')) {
    // +1 XXX format
    areaCode = digits.substring(1, 4);
  } else if (digits.length === 10) {
    // XXX format
    areaCode = digits.substring(0, 3);
  } else {
    return 'America/New_York'; // Default if format is unclear
  }

  // Look up timezone
  const timezone = AREA_CODE_TO_TIMEZONE[areaCode];

  if (timezone) {
    console.log(`[TimezoneDetector] Detected ${timezone} from area code ${areaCode}`);
    return timezone;
  }

  // Default to Eastern if area code not found
  console.log(`[TimezoneDetector] Area code ${areaCode} not found, defaulting to Eastern`);
  return 'America/New_York';
}

/**
 * Get friendly timezone name
 * @param {string} timezone - IANA timezone
 * @returns {string} - Friendly name (e.g., 'Eastern Time')
 */
function getFriendlyTimezoneName(timezone) {
  const names = {
    'America/New_York': 'Eastern Time',
    'America/Chicago': 'Central Time',
    'America/Denver': 'Mountain Time',
    'America/Los_Angeles': 'Pacific Time',
  };

  return names[timezone] || 'Eastern Time';
}

module.exports = {
  detectTimezone,
  getFriendlyTimezoneName,
  AREA_CODE_TO_TIMEZONE
};
