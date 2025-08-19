// Validation middleware for Power Cards and other API endpoints

// Validate Power Card template creation
const validatePowerCardTemplate = (req, res, next) => {
  const {
    partner_id,
    partner_type,
    metric_1_name,
    metric_1_question,
    metric_2_name,
    metric_2_question,
    metric_3_name,
    metric_3_question
  } = req.body;

  // Required fields
  if (!partner_id) {
    return res.status(400).json({
      success: false,
      message: 'Partner ID is required'
    });
  }

  if (!metric_1_name || !metric_1_question) {
    return res.status(400).json({
      success: false,
      message: 'Metric 1 name and question are required'
    });
  }

  if (!metric_2_name || !metric_2_question) {
    return res.status(400).json({
      success: false,
      message: 'Metric 2 name and question are required'
    });
  }

  if (!metric_3_name || !metric_3_question) {
    return res.status(400).json({
      success: false,
      message: 'Metric 3 name and question are required'
    });
  }

  // Validate partner type
  const validPartnerTypes = ['strategic_partner', 'manufacturer', 'podcast', 'event'];
  if (partner_type && !validPartnerTypes.includes(partner_type)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid partner type. Must be one of: ' + validPartnerTypes.join(', ')
    });
  }

  next();
};

// Validate Power Card campaign creation
const validatePowerCardCampaign = (req, res, next) => {
  const {
    campaign_name,
    quarter,
    year,
    start_date,
    end_date
  } = req.body;

  // Required fields
  if (!campaign_name) {
    return res.status(400).json({
      success: false,
      message: 'Campaign name is required'
    });
  }

  if (!quarter) {
    return res.status(400).json({
      success: false,
      message: 'Quarter is required'
    });
  }

  if (!year || year < 2024 || year > 2030) {
    return res.status(400).json({
      success: false,
      message: 'Valid year is required (2024-2030)'
    });
  }

  if (!start_date) {
    return res.status(400).json({
      success: false,
      message: 'Start date is required'
    });
  }

  if (!end_date) {
    return res.status(400).json({
      success: false,
      message: 'End date is required'
    });
  }

  // Validate date format and logic
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format. Use YYYY-MM-DD'
    });
  }

  if (endDate <= startDate) {
    return res.status(400).json({
      success: false,
      message: 'End date must be after start date'
    });
  }

  next();
};

// Validate Power Card survey response
const validatePowerCardResponse = (req, res, next) => {
  const {
    satisfaction_score,
    recommendation_score,
    metric_1_score,
    metric_2_score,
    metric_3_score
  } = req.body;

  // Validate score ranges
  const validateScore = (score, fieldName, min = 1, max = 10) => {
    if (score !== undefined && score !== null) {
      if (typeof score !== 'number' || score < min || score > max) {
        return `${fieldName} must be a number between ${min} and ${max}`;
      }
    }
    return null;
  };

  // Check satisfaction score (1-10)
  const satisfactionError = validateScore(satisfaction_score, 'Satisfaction score');
  if (satisfactionError) {
    return res.status(400).json({
      success: false,
      message: satisfactionError
    });
  }

  // Check recommendation score (NPS: 0-10)
  const recommendationError = validateScore(recommendation_score, 'Recommendation score', 0, 10);
  if (recommendationError) {
    return res.status(400).json({
      success: false,
      message: recommendationError
    });
  }

  // Check custom metric scores (1-10)
  const metric1Error = validateScore(metric_1_score, 'Metric 1 score');
  if (metric1Error) {
    return res.status(400).json({
      success: false,
      message: metric1Error
    });
  }

  const metric2Error = validateScore(metric_2_score, 'Metric 2 score');
  if (metric2Error) {
    return res.status(400).json({
      success: false,
      message: metric2Error
    });
  }

  const metric3Error = validateScore(metric_3_score, 'Metric 3 score');
  if (metric3Error) {
    return res.status(400).json({
      success: false,
      message: metric3Error
    });
  }

  // Validate time to complete
  if (req.body.time_to_complete !== undefined && 
      (typeof req.body.time_to_complete !== 'number' || req.body.time_to_complete < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Time to complete must be a positive number'
    });
  }

  next();
};

module.exports = {
  validatePowerCardTemplate,
  validatePowerCardCampaign,
  validatePowerCardResponse
};