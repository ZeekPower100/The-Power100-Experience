const { query } = require('../config/database');

/**
 * Automatically detect and register new entity tables and AI columns
 * Follows database naming conventions:
 * - Tables: snake_case (e.g., case_studies)
 * - Columns: snake_case (e.g., ai_summary)
 * - API Properties: camelCase (e.g., caseStudies)
 */
class AutoEntityDetector {
  constructor() {
    // Patterns that indicate entity tables
    this.entityTablePatterns = [
      '_content', '_studies', '_resources', '_library', '_materials',
      '_sessions', '_tools', '_programs', '_courses', '_analysis'
    ];

    // AI column patterns (snake_case as per database convention)
    this.aiColumnPatterns = [
      'ai_summary', 'ai_insights', 'ai_tags', 'ai_processing_status',
      'ai_quality_score', 'ai_confidence_score', 'ai_key_topics',
      'ai_sentiment', 'ai_metrics', 'key_differentiators'
    ];

    // Foreign keys that suggest entity relationships
    this.entityForeignKeys = [
      'contractor_id', 'partner_id', 'strategic_partner_id',
      'book_id', 'podcast_id', 'event_id', 'video_id', 'case_study_id'
    ];
  }

  /**
   * Convert snake_case to camelCase for API property names
   */
  snakeToCamel(snakeCase) {
    return snakeCase.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Main detection routine - finds new tables AND columns
   */
  async detectAndRegister() {
    const results = {
      newTables: [],
      newAIColumns: [],
      errors: []
    };

    try {
      // 1. Detect new tables
      const newTables = await this.detectNewTables();
      results.newTables = newTables;

      // 2. Detect new AI columns in existing tables
      const newColumns = await this.detectNewAIColumns();
      results.newAIColumns = newColumns;

      // 3. If changes found, refresh caches
      if (newTables.length > 0 || newColumns.length > 0) {
        await this.refreshSystemCaches();
      }

      return results;
    } catch (error) {
      console.error('[AutoDetector] Error in detection:', error);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * Detect tables not in ai_metadata that should be
   */
  async detectNewTables() {
    try {
      // Find all tables not registered in ai_metadata
      const unregisteredTables = await query(`
        SELECT t.table_name,
               COUNT(c.column_name) as column_count
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c
          ON t.table_name = c.table_name
          AND t.table_schema = c.table_schema
        WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
        AND NOT EXISTS (
          SELECT 1 FROM ai_metadata am
          WHERE am.table_name = t.table_name
        )
        AND t.table_name NOT LIKE 'pg_%'
        AND t.table_name NOT LIKE 'sql_%'
        GROUP BY t.table_name
        ORDER BY t.table_name
      `);

      const registeredTables = [];

      for (const table of unregisteredTables.rows) {
        const tableName = table.table_name;

        // Check if this should be an entity table
        const shouldRegister = await this.shouldBeEntityTable(tableName);

        if (shouldRegister) {
          const registered = await this.registerTable(tableName);
          if (registered) {
            registeredTables.push({
              table: tableName,
              apiName: this.snakeToCamel(tableName),
              reason: shouldRegister.reason
            });
          }
        }
      }

      return registeredTables;
    } catch (error) {
      console.error('[AutoDetector] Error detecting new tables:', error);
      return [];
    }
  }

  /**
   * Detect new AI columns added to existing tables
   */
  async detectNewAIColumns() {
    try {
      const newColumns = [];

      // Get all registered entity tables
      const entityTables = await query(`
        SELECT table_name
        FROM ai_metadata
        WHERE is_entity_table = true
      `);

      for (const table of entityTables.rows) {
        const tableName = table.table_name;

        // Check for AI columns
        const aiColumns = await query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
          AND table_schema = 'public'
          AND (
            column_name LIKE 'ai_%'
            OR column_name = 'key_differentiators'
          )
          ORDER BY ordinal_position
        `, [tableName]);

        if (aiColumns.rows.length > 0) {
          // Check if these are new (not tracked)
          for (const col of aiColumns.rows) {
            const isNew = await this.isNewAIColumn(tableName, col.column_name);
            if (isNew) {
              newColumns.push({
                table: tableName,
                column: col.column_name,
                dataType: col.data_type
              });
              console.log(`[AutoDetector] Found new AI column: ${tableName}.${col.column_name}`);
            }
          }
        }
      }

      return newColumns;
    } catch (error) {
      console.error('[AutoDetector] Error detecting AI columns:', error);
      return [];
    }
  }

  /**
   * Check if an AI column is newly added (simplified check)
   */
  async isNewAIColumn(tableName, columnName) {
    // In a production system, you'd track processed columns
    // For now, we'll consider any ai_ column as potentially new
    // You could add a processed_columns table to track this
    return columnName.startsWith('ai_') || columnName === 'key_differentiators';
  }

  /**
   * Determine if a table should be registered as an entity
   */
  async shouldBeEntityTable(tableName) {
    // Check 1: Name pattern matching
    for (const pattern of this.entityTablePatterns) {
      if (tableName.includes(pattern)) {
        return {
          should: true,
          reason: `Table name contains entity pattern: ${pattern}`
        };
      }
    }

    // Check 2: Has AI columns
    const columnsResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      AND table_schema = 'public'
      AND (
        column_name LIKE 'ai_%'
        OR column_name = 'key_differentiators'
      )
    `, [tableName]);

    if (columnsResult.rows.length > 0) {
      return {
        should: true,
        reason: `Has ${columnsResult.rows.length} AI columns`
      };
    }

    // Check 3: Has entity foreign keys
    const fkResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1
      AND table_schema = 'public'
      AND column_name = ANY($2)
    `, [tableName, this.entityForeignKeys]);

    if (fkResult.rows.length > 0) {
      return {
        should: true,
        reason: `Has entity foreign keys: ${fkResult.rows.map(r => r.column_name).join(', ')}`
      };
    }

    return { should: false, reason: null };
  }

  /**
   * Register a table in ai_metadata
   */
  async registerTable(tableName) {
    try {
      // Convert snake_case to camelCase for API
      const apiPropertyName = this.snakeToCamel(tableName);

      const result = await query(`
        INSERT INTO ai_metadata (
          table_name,
          is_entity_table,
          api_property_name,
          description,
          include_in_knowledge_base,
          is_ai_relevant,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (table_name)
        DO UPDATE SET
          is_entity_table = EXCLUDED.is_entity_table,
          updated_at = NOW()
        RETURNING *
      `, [
        tableName,
        true,
        apiPropertyName,
        `Auto-detected entity table with AI capabilities`,
        true,
        true
      ]);

      console.log(`[AutoDetector] ✅ Registered: ${tableName} → ${apiPropertyName}`);
      return result.rows[0];
    } catch (error) {
      console.error(`[AutoDetector] Failed to register ${tableName}:`, error.message);
      return null;
    }
  }

  /**
   * Refresh system caches after detection
   */
  async refreshSystemCaches() {
    try {
      console.log('[AutoDetector] Refreshing system caches...');

      // Clear schema discovery cache
      const schemaDiscovery = require('./schemaDiscoveryService');
      await schemaDiscovery.forceRefresh();

      // Clear AI knowledge cache
      const aiKnowledgeService = require('./aiKnowledgeService');
      aiKnowledgeService.clearCache();

      console.log('[AutoDetector] ✅ Caches refreshed');
    } catch (error) {
      console.error('[AutoDetector] Cache refresh failed:', error.message);
    }
  }

  /**
   * Run detection on server startup or periodically
   */
  async runAutoDetection() {
    console.log('[AutoDetector] 🔍 Starting auto-detection scan...');

    const results = await this.detectAndRegister();

    console.log('[AutoDetector] 📊 Detection complete:', {
      tablesFound: results.newTables.length,
      columnsFound: results.newAIColumns.length,
      errors: results.errors.length
    });

    if (results.newTables.length > 0) {
      console.log('[AutoDetector] New tables:', results.newTables.map(t => t.table));
    }

    if (results.newAIColumns.length > 0) {
      console.log('[AutoDetector] New AI columns:',
        results.newAIColumns.map(c => `${c.table}.${c.column}`)
      );
    }

    return results;
  }
}

module.exports = new AutoEntityDetector();