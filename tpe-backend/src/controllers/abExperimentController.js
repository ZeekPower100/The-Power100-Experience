// DATABASE-CHECKED: ab_experiments, ab_experiment_assignments columns verified December 5, 2025
/**
 * A/B Experiment Controller
 * API endpoints for managing and viewing experiment results
 */
const abExperimentService = require('../services/abExperimentService');

/**
 * Get all experiments
 * GET /api/ab-experiments
 */
const getAllExperiments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const experiments = await abExperimentService.getAllExperiments(status || null);

    res.json({
      success: true,
      experiments,
      count: experiments.length
    });
  } catch (error) {
    console.error('[ABExperiment] Error getting experiments:', error);
    next(error);
  }
};

/**
 * Get single experiment with detailed results
 * GET /api/ab-experiments/:id
 */
const getExperimentResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    const results = await abExperimentService.getExperimentResults(parseInt(id));

    if (!results) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('[ABExperiment] Error getting experiment results:', error);
    next(error);
  }
};

/**
 * Create new experiment
 * POST /api/ab-experiments
 */
const createExperiment = async (req, res, next) => {
  try {
    const {
      name,
      description,
      variants,
      success_metric,
      target_sample_size
    } = req.body;

    if (!name || !variants || variants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name and at least 2 variants are required'
      });
    }

    const experiment = await abExperimentService.createExperiment({
      name,
      description,
      variants,
      success_metric,
      target_sample_size,
      created_by: req.user?.id || null
    });

    res.status(201).json({
      success: true,
      experiment,
      message: 'Experiment created in draft status'
    });
  } catch (error) {
    console.error('[ABExperiment] Error creating experiment:', error);
    next(error);
  }
};

/**
 * Start an experiment
 * POST /api/ab-experiments/:id/start
 */
const startExperiment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const experiment = await abExperimentService.startExperiment(parseInt(id));

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    res.json({
      success: true,
      experiment,
      message: 'Experiment started'
    });
  } catch (error) {
    console.error('[ABExperiment] Error starting experiment:', error);
    next(error);
  }
};

/**
 * Complete/stop an experiment
 * POST /api/ab-experiments/:id/complete
 */
const completeExperiment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const experiment = await abExperimentService.completeExperiment(parseInt(id));

    if (!experiment) {
      return res.status(404).json({
        success: false,
        error: 'Experiment not found'
      });
    }

    res.json({
      success: true,
      experiment,
      message: 'Experiment completed'
    });
  } catch (error) {
    console.error('[ABExperiment] Error completing experiment:', error);
    next(error);
  }
};

/**
 * Assign user to experiment variant
 * POST /api/ab-experiments/:id/assign
 */
const assignUserToVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, user_type } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const assignment = await abExperimentService.assignUserToVariant(
      parseInt(id),
      parseInt(user_id),
      user_type || 'contractor'
    );

    res.json({
      success: true,
      assignment,
      variant: assignment.variant
    });
  } catch (error) {
    console.error('[ABExperiment] Error assigning user:', error);
    if (error.message.includes('not active')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

/**
 * Record conversion for user
 * POST /api/ab-experiments/:id/convert
 */
const recordConversion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, user_type, engagement_score, time_to_action } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const assignment = await abExperimentService.recordConversion(
      parseInt(id),
      parseInt(user_id),
      user_type || 'contractor',
      engagement_score,
      time_to_action
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      assignment,
      message: 'Conversion recorded'
    });
  } catch (error) {
    console.error('[ABExperiment] Error recording conversion:', error);
    next(error);
  }
};

/**
 * Get user's variant for experiment
 * GET /api/ab-experiments/:id/variant/:userId
 */
const getUserVariant = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { user_type } = req.query;

    const variant = await abExperimentService.getUserVariant(
      parseInt(id),
      parseInt(userId),
      user_type || 'contractor'
    );

    res.json({
      success: true,
      variant,
      hasAssignment: variant !== null
    });
  } catch (error) {
    console.error('[ABExperiment] Error getting user variant:', error);
    next(error);
  }
};

/**
 * Delete draft experiment
 * DELETE /api/ab-experiments/:id
 */
const deleteExperiment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await abExperimentService.deleteExperiment(parseInt(id));

    if (!deleted) {
      return res.status(400).json({
        success: false,
        error: 'Could not delete experiment (must be in draft status)'
      });
    }

    res.json({
      success: true,
      message: 'Experiment deleted'
    });
  } catch (error) {
    console.error('[ABExperiment] Error deleting experiment:', error);
    next(error);
  }
};

/**
 * Dashboard summary - get overview of all experiments
 * GET /api/ab-experiments/dashboard
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const allExperiments = await abExperimentService.getAllExperiments();

    // Calculate summary stats
    const activeExperiments = allExperiments.filter(e => e.status === 'active');
    const completedExperiments = allExperiments.filter(e => e.status === 'completed');
    const draftExperiments = allExperiments.filter(e => e.status === 'draft');

    const totalParticipants = allExperiments.reduce((sum, e) => sum + e.totalAssignments, 0);
    const totalConversions = allExperiments.reduce((sum, e) => sum + e.totalConversions, 0);

    // Get detailed results for active experiments
    const activeResults = await Promise.all(
      activeExperiments.map(e => abExperimentService.getExperimentResults(e.id))
    );

    res.json({
      success: true,
      summary: {
        totalExperiments: allExperiments.length,
        activeCount: activeExperiments.length,
        completedCount: completedExperiments.length,
        draftCount: draftExperiments.length,
        totalParticipants,
        totalConversions,
        overallConversionRate: totalParticipants > 0
          ? (totalConversions / totalParticipants * 100).toFixed(1)
          : 0
      },
      activeExperiments: activeResults,
      recentCompleted: completedExperiments.slice(0, 5),
      drafts: draftExperiments
    });
  } catch (error) {
    console.error('[ABExperiment] Error getting dashboard:', error);
    next(error);
  }
};

module.exports = {
  getAllExperiments,
  getExperimentResults,
  createExperiment,
  startExperiment,
  completeExperiment,
  assignUserToVariant,
  recordConversion,
  getUserVariant,
  deleteExperiment,
  getDashboardSummary
};
