// DATABASE-CHECKED: skill_definitions columns verified on 2026-02-16
// Purpose: DB-primary skill loader with filesystem seeding.
// Based on OpenClaw src/agents/skills/workspace.ts — adapted for multi-tenant DB storage.
//
// Runtime flow:
// 1. On server startup: seedFromFilesystem() scans SKILL.md files → UPSERT into skill_definitions
// 2. On agent invocation: getSkillsForContext() queries DB → buildPromptExtension() for system prompt
// 3. On admin edit: Direct DB update via API → change takes effect on next message

const path = require('path');
const fs = require('fs');
const matter = require('gray-matter');
const { query } = require('../config/database');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

// ============================================================
// Filesystem Seeding — SKILL.md files → Database
// ============================================================

/**
 * Parse a SKILL.md file into structured data for the database.
 * @param {string} filePath - Full path to SKILL.md
 * @returns {Object} Parsed skill data
 */
function parseSeedFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(raw);

  // Extract fields from frontmatter
  const skillName = frontmatter.name;
  const description = frontmatter.description || '';
  const emoji = frontmatter.metadata?.openclaw?.emoji || '';
  const contextType = frontmatter.metadata?.openclaw?.context || 'universal';
  const priority = frontmatter.metadata?.openclaw?.priority || 'normal';

  if (!skillName) {
    throw new Error(`[SKILL_LOADER] SKILL.md missing 'name' in frontmatter: ${filePath}`);
  }

  return {
    skill_name: skillName,
    description,
    emoji,
    context_type: contextType,
    priority,
    skill_content: content.trim(),
    metadata: frontmatter.metadata || {},
    seed_file_path: path.relative(SKILLS_DIR, filePath).replace(/\\/g, '/'),
  };
}

/**
 * Scan the skills directory for SKILL.md files and UPSERT into skill_definitions.
 * Existing DB records matching a seed file path get updated; new ones get inserted.
 * @returns {Promise<{seeded: number, updated: number, errors: string[]}>}
 */
async function seedFromFilesystem() {
  const results = { seeded: 0, updated: 0, errors: [] };

  function findSkillFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findSkillFiles(fullPath));
      } else if (entry.name === 'SKILL.md') {
        files.push(fullPath);
      }
    }
    return files;
  }

  const skillFiles = findSkillFiles(SKILLS_DIR);
  console.log(`[SKILL_LOADER] Found ${skillFiles.length} SKILL.md files to seed`);

  for (const filePath of skillFiles) {
    try {
      const skill = parseSeedFile(filePath);

      // UPSERT: insert new skill or update existing one matching skill_name
      const result = await query(
        `INSERT INTO skill_definitions
          (skill_name, description, emoji, context_type, priority, skill_content, metadata, seed_file_path, last_seeded_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (skill_name) DO UPDATE SET
           description = EXCLUDED.description,
           emoji = EXCLUDED.emoji,
           context_type = EXCLUDED.context_type,
           priority = EXCLUDED.priority,
           skill_content = EXCLUDED.skill_content,
           metadata = EXCLUDED.metadata,
           seed_file_path = EXCLUDED.seed_file_path,
           last_seeded_at = NOW()
         RETURNING id, (xmax = 0) as is_new`,
        [
          skill.skill_name,
          skill.description,
          skill.emoji,
          skill.context_type,
          skill.priority,
          skill.skill_content,
          JSON.stringify(skill.metadata),
          skill.seed_file_path,
        ]
      );

      const row = result.rows[0];
      if (row.is_new) {
        results.seeded++;
        console.log(`[SKILL_LOADER] Seeded new skill: ${skill.skill_name}`);
      } else {
        results.updated++;
        console.log(`[SKILL_LOADER] Updated skill: ${skill.skill_name}`);
      }
    } catch (err) {
      results.errors.push(`${filePath}: ${err.message}`);
      console.error(`[SKILL_LOADER] Error seeding ${filePath}:`, err.message);
    }
  }

  console.log(`[SKILL_LOADER] Seeding complete: ${results.seeded} new, ${results.updated} updated, ${results.errors.length} errors`);
  return results;
}

// ============================================================
// Runtime — Database → Agent Prompt
// ============================================================

/**
 * Get all active skills for a given context type.
 * @param {string} contextType - 'inner_circle', 'contractor', 'event', 'universal'
 * @returns {Promise<Array>}
 */
async function getSkillsForContext(contextType) {
  const result = await query(
    `SELECT * FROM skill_definitions
     WHERE (context_type = $1 OR context_type = 'universal')
       AND is_active = true
     ORDER BY
       CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END,
       skill_name`,
    [contextType]
  );
  return result.rows || [];
}

/**
 * Build the system prompt extension from active skills.
 * Skills are formatted as Markdown sections with emoji headers.
 * @param {string} contextType
 * @returns {Promise<string>}
 */
async function buildPromptExtension(contextType) {
  const skills = await getSkillsForContext(contextType);

  if (skills.length === 0) {
    return '';
  }

  const sections = skills.map(skill => {
    const emoji = skill.emoji || '';
    const header = `### ${emoji} ${skill.description || skill.skill_name}`.trim();
    return `${header}\n\n${skill.skill_content}`;
  });

  return `## Active Skills\n\n${sections.join('\n\n---\n\n')}`;
}

/**
 * Get a single skill by name.
 * @param {string} skillName
 * @returns {Promise<Object|null>}
 */
async function getSkillByName(skillName) {
  const result = await query(
    'SELECT * FROM skill_definitions WHERE skill_name = $1',
    [skillName]
  );
  return result.rows?.[0] || null;
}

// ============================================================
// Admin API Support
// ============================================================

/**
 * List skills with optional filters.
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
async function listSkills(filters = {}) {
  let sql = 'SELECT * FROM skill_definitions WHERE 1=1';
  const params = [];

  if (filters.context_type) {
    params.push(filters.context_type);
    sql += ` AND context_type = $${params.length}`;
  }
  if (filters.is_active !== undefined) {
    params.push(filters.is_active);
    sql += ` AND is_active = $${params.length}`;
  }
  if (filters.priority) {
    params.push(filters.priority);
    sql += ` AND priority = $${params.length}`;
  }

  sql += ' ORDER BY context_type, priority, skill_name';

  const result = await query(sql, params);
  return result.rows || [];
}

/**
 * Create a new skill (from admin UI).
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function createSkill(data) {
  const result = await query(
    `INSERT INTO skill_definitions
      (skill_name, description, emoji, context_type, priority, skill_content, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      data.skill_name,
      data.description || '',
      data.emoji || '',
      data.context_type || 'universal',
      data.priority || 'normal',
      data.skill_content,
      JSON.stringify(data.metadata || {}),
    ]
  );
  return result.rows[0];
}

/**
 * Update a skill's content or metadata.
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<Object|null>}
 */
async function updateSkill(id, data) {
  const fields = [];
  const params = [];
  let paramIndex = 1;

  const allowedFields = ['description', 'emoji', 'context_type', 'priority', 'skill_content', 'metadata', 'is_active', 'version'];
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      const value = field === 'metadata' ? JSON.stringify(data[field]) : data[field];
      fields.push(`${field} = $${paramIndex}`);
      params.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) return null;

  params.push(id);
  const result = await query(
    `UPDATE skill_definitions SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    params
  );
  return result.rows?.[0] || null;
}

/**
 * Toggle a skill active/inactive.
 * @param {number} id
 * @param {boolean} isActive
 * @returns {Promise<Object|null>}
 */
async function toggleSkill(id, isActive) {
  const result = await query(
    'UPDATE skill_definitions SET is_active = $1 WHERE id = $2 RETURNING *',
    [isActive, id]
  );
  return result.rows?.[0] || null;
}

module.exports = {
  // Seeding
  seedFromFilesystem,
  parseSeedFile,

  // Runtime
  getSkillsForContext,
  buildPromptExtension,
  getSkillByName,

  // Admin
  listSkills,
  createSkill,
  updateSkill,
  toggleSkill,
};
