/**
 * Question Library Routes
 *
 * API endpoints for managing the PCR question library.
 * Supports AI-powered question selection and manual question management.
 */

const express = require('express');
const router = express.Router();
const questionSelectorService = require('../services/questionSelectorService');
const { protect } = require('../middleware/auth');

/**
 * GET /api/question-library/categories
 * Get all metric categories with question counts
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await questionSelectorService.getAllCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('[QuestionLibrary] Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

/**
 * GET /api/question-library/categories/:categoryName/questions
 * Get all questions for a specific category
 */
router.get('/categories/:categoryName/questions', async (req, res) => {
  try {
    const { categoryName } = req.params;
    const questions = await questionSelectorService.getQuestionsForCategory(categoryName);

    if (questions.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No questions found for category: ${categoryName}`
      });
    }

    res.json({
      success: true,
      data: questions,
      count: questions.length
    });
  } catch (error) {
    console.error('[QuestionLibrary] Error fetching questions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch questions'
    });
  }
});

/**
 * POST /api/question-library/select
 * AI-powered question selection for a metric and partner
 */
router.post('/select', async (req, res) => {
  try {
    const { category_name, partner_id, use_ai = true, force_question_id = null } = req.body;

    if (!category_name) {
      return res.status(400).json({
        success: false,
        error: 'category_name is required'
      });
    }

    const selection = await questionSelectorService.selectQuestion(
      category_name,
      partner_id,
      { useAI: use_ai, forceQuestionId: force_question_id }
    );

    res.json({
      success: true,
      data: selection
    });
  } catch (error) {
    console.error('[QuestionLibrary] Error selecting question:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to select question'
    });
  }
});

/**
 * POST /api/question-library/select-for-template
 * Select questions for all metrics in a template
 */
router.post('/select-for-template', async (req, res) => {
  try {
    const { partner_id, metrics, use_ai = true } = req.body;

    if (!partner_id || !metrics || !Array.isArray(metrics)) {
      return res.status(400).json({
        success: false,
        error: 'partner_id and metrics array are required'
      });
    }

    const selections = await questionSelectorService.selectQuestionsForTemplate(
      partner_id,
      metrics,
      { useAI: use_ai }
    );

    res.json({
      success: true,
      data: selections
    });
  } catch (error) {
    console.error('[QuestionLibrary] Error selecting template questions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to select template questions'
    });
  }
});

/**
 * POST /api/question-library/questions
 * Add a new question to the library (admin only)
 */
router.post('/questions', protect, async (req, res) => {
  try {
    const {
      category_id,
      question_text,
      question_type = 'satisfaction',
      scale_low_label = 'Poor',
      scale_high_label = 'Excellent',
      context_keywords = [],
      is_default = false
    } = req.body;

    if (!category_id || !question_text) {
      return res.status(400).json({
        success: false,
        error: 'category_id and question_text are required'
      });
    }

    const question = await questionSelectorService.addQuestion(
      category_id,
      {
        question_text,
        question_type,
        scale_low_label,
        scale_high_label,
        context_keywords,
        is_default
      },
      req.user?.email || 'admin'
    );

    res.status(201).json({
      success: true,
      data: question
    });
  } catch (error) {
    console.error('[QuestionLibrary] Error adding question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add question'
    });
  }
});

/**
 * PUT /api/question-library/questions/:questionId
 * Update an existing question (admin only)
 */
router.put('/questions/:questionId', protect, async (req, res) => {
  try {
    const { questionId } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const allowedFields = [
      'question_text', 'question_type', 'scale_low_label', 'scale_high_label',
      'context_keywords', 'is_default', 'is_active'
    ];

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramIndex}`);
        values.push(key === 'context_keywords' ? value : value);
        paramIndex++;
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    setClause.push(`updated_at = NOW()`);
    values.push(questionId);

    const { query } = require('../config/database');
    const result = await query(`
      UPDATE pcr_question_library
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('[QuestionLibrary] Error updating question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update question'
    });
  }
});

/**
 * DELETE /api/question-library/questions/:questionId
 * Soft-delete a question (admin only)
 */
router.delete('/questions/:questionId', protect, async (req, res) => {
  try {
    const { questionId } = req.params;

    const { query } = require('../config/database');
    const result = await query(`
      UPDATE pcr_question_library
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [questionId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deactivated successfully'
    });
  } catch (error) {
    console.error('[QuestionLibrary] Error deleting question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete question'
    });
  }
});

module.exports = router;
