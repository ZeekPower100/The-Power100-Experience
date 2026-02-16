// DATABASE-CHECKED: skill_definitions columns verified on 2026-02-16
const express = require('express');
const router = express.Router();
const { flexibleProtect } = require('../middleware/flexibleAuth');
const skillLoader = require('../services/skillLoaderService');

// All skill routes require authentication
router.use(flexibleProtect);

// GET /api/skills — List all skills (filterable by context_type, is_active, priority)
router.get('/', async (req, res) => {
  try {
    const filters = {};
    if (req.query.context_type) filters.context_type = req.query.context_type;
    if (req.query.is_active !== undefined) filters.is_active = req.query.is_active === 'true';
    if (req.query.priority) filters.priority = req.query.priority;

    const skills = await skillLoader.listSkills(filters);
    res.json({ success: true, data: skills, count: skills.length });
  } catch (error) {
    console.error('[SKILL_ROUTES] Error listing skills:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/skills/:id — Get single skill with full content
router.get('/:id', async (req, res) => {
  try {
    const { query: dbQuery } = require('../config/database');
    const result = await dbQuery('SELECT * FROM skill_definitions WHERE id = $1', [req.params.id]);
    const skill = result.rows?.[0];

    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    res.json({ success: true, data: skill });
  } catch (error) {
    console.error('[SKILL_ROUTES] Error getting skill:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/skills — Create new skill from admin UI
router.post('/', async (req, res) => {
  try {
    const { skill_name, description, emoji, context_type, priority, skill_content, metadata } = req.body;

    if (!skill_name || !skill_content) {
      return res.status(400).json({ success: false, error: 'skill_name and skill_content are required' });
    }

    const skill = await skillLoader.createSkill({
      skill_name, description, emoji, context_type, priority, skill_content, metadata,
    });

    res.status(201).json({ success: true, data: skill });
  } catch (error) {
    console.error('[SKILL_ROUTES] Error creating skill:', error.message);
    if (error.message.includes('unique constraint')) {
      return res.status(409).json({ success: false, error: `Skill '${req.body.skill_name}' already exists` });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/skills/:id — Update skill content/metadata
router.put('/:id', async (req, res) => {
  try {
    const skill = await skillLoader.updateSkill(parseInt(req.params.id), req.body);

    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found or no fields to update' });
    }

    res.json({ success: true, data: skill });
  } catch (error) {
    console.error('[SKILL_ROUTES] Error updating skill:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/skills/:id/toggle — Enable/disable a skill
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { is_active } = req.body;
    if (is_active === undefined) {
      return res.status(400).json({ success: false, error: 'is_active is required' });
    }

    const skill = await skillLoader.toggleSkill(parseInt(req.params.id), is_active);

    if (!skill) {
      return res.status(404).json({ success: false, error: 'Skill not found' });
    }

    res.json({ success: true, data: skill, message: `Skill ${is_active ? 'enabled' : 'disabled'}` });
  } catch (error) {
    console.error('[SKILL_ROUTES] Error toggling skill:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/skills/seed — Re-seed from filesystem SKILL.md files
router.post('/seed', async (req, res) => {
  try {
    const results = await skillLoader.seedFromFilesystem();
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('[SKILL_ROUTES] Error seeding skills:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
