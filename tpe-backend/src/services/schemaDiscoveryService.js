const { query } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

/**
 * Database Schema Auto-Discovery Service
 * Automatically detects database schema changes and maintains
 * a dynamic knowledge base for the AI Concierge
 */
class SchemaDiscoveryService {
  constructor() {
    this.schemaCache = null;
    this.lastDiscoveryTime = null;
    this.sensitivePatterns = [
      'password', 'pwd', 'secret', 'token', 'key', 'salt', 'hash',
      'ssn', 'social_security', 'credit_card', 'bank_account'
    ];
    this.aiProcessedFields = [
      'ai_summary', 'ai_insights', 'ai_tags', 'ai_quality_score',
      'key_differentiators', 'ai_confidence_score', 'ai_processing_status'
    ];
  }

  /**
   * Discover all tables and columns in the database
   * @param {boolean} forceRefresh - Force immediate refresh regardless of cache
   */
  async discoverSchema(forceRefresh = false) {
    try {
      // Check if we should use cached version
      if (!forceRefresh && !this.isStale() && this.schemaCache) {
        console.log('[SchemaDiscovery] Using cached schema (use forceRefresh=true to bypass)');
        return this.schemaCache;
      }

      console.log('[SchemaDiscovery] Starting schema discovery...');

      // Load entity metadata ONCE at the beginning
      if (forceRefresh || !this.entityTablesCache || this.isMetadataCacheStale()) {
        await this.loadEntityTablesFromMetadata();
      }

      // Get all tables
      const tablesResult = await query(`
        SELECT 
          table_name,
          table_type
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type IN ('BASE TABLE', 'VIEW')
        ORDER BY table_name
      `);

      const schema = {};

      // For each table, get column information
      for (const table of tablesResult.rows) {
        const tableName = table.table_name;

        // Skip system tables
        if (tableName.startsWith('pg_') || tableName.startsWith('sql_')) {
          continue;
        }

        // Get columns for this table
        const columnsResult = await query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length,
            numeric_precision,
            numeric_scale
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        // Get row count for context
        let rowCount = 0;
        try {
          const countResult = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
          rowCount = parseInt(countResult.rows[0].count);
        } catch (e) {
          // Some views might not support COUNT(*)
          rowCount = -1;
        }

        // Get foreign key relationships
        const fkResult = await query(`
          SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_name = $1
        `, [tableName]);

        // Build table metadata
        schema[tableName] = {
          type: table.table_type,
          rowCount,
          columns: {},
          foreignKeys: {},
          hasAIFields: false,
          hasSensitiveData: false,
          isEntityTable: await this.isEntityTable(tableName, forceRefresh),
          apiPropertyName: this.getApiPropertyName(tableName),
          aiRelevance: await this.calculateAIRelevance(tableName, columnsResult.rows)
        };

        // Process columns
        for (const column of columnsResult.rows) {
          const columnName = column.column_name;
          const isSensitive = this.isSensitiveField(columnName);
          const isAIProcessed = this.isAIProcessedField(columnName);

          schema[tableName].columns[columnName] = {
            dataType: column.data_type,
            nullable: column.is_nullable === 'YES',
            maxLength: column.character_maximum_length,
            precision: column.numeric_precision,
            scale: column.numeric_scale,
            defaultValue: column.column_default,
            isSensitive,
            isAIProcessed,
            semanticType: this.inferSemanticType(columnName, column.data_type)
          };

          if (isSensitive) schema[tableName].hasSensitiveData = true;
          if (isAIProcessed) schema[tableName].hasAIFields = true;
        }

        // Process foreign keys
        for (const fk of fkResult.rows) {
          schema[tableName].foreignKeys[fk.column_name] = {
            referencedTable: fk.foreign_table_name,
            referencedColumn: fk.foreign_column_name
          };
        }
      }

      // Detect relationships between tables
      await this.detectRelationships(schema);

      // Cache the schema
      this.schemaCache = schema;
      this.lastDiscoveryTime = new Date();

      console.log(`[SchemaDiscovery] Discovered ${Object.keys(schema).length} tables`);

      // Save to file for debugging
      await this.saveSchemaToFile(schema);

      return schema;
    } catch (error) {
      console.error('[SchemaDiscovery] Error discovering schema:', error);
      throw error;
    }
  }

  /**
   * Check if a field name indicates sensitive data
   */
  isSensitiveField(fieldName) {
    const lowerField = fieldName.toLowerCase();
    return this.sensitivePatterns.some(pattern => lowerField.includes(pattern));
  }

  /**
   * Check if a field is AI-processed
   */
  isAIProcessedField(fieldName) {
    const lowerField = fieldName.toLowerCase();
    return this.aiProcessedFields.some(field => lowerField.includes(field));
  }

  /**
   * Determine if a table is a main entity table
   * Now reads from database metadata for dynamic configuration
   */
  async isEntityTable(tableName, forceRefresh = false) {
    try {
      // Only reload if explicitly forced or cache is missing
      if (forceRefresh || !this.entityTablesCache) {
        await this.loadEntityTablesFromMetadata();
      }

      return this.entityTablesCache.includes(tableName);
    } catch (error) {
      console.error('[SchemaDiscovery] Error checking entity table status:', error);
      // Fallback to hardcoded list if metadata fails
      const fallbackTables = [
        'contractors', 'strategic_partners', 'books', 'podcasts', 'events',
        'demo_bookings', 'contractor_partner_matches', 'video_content', 'video_analysis', 'webinars'
      ];
      return fallbackTables.includes(tableName);
    }
  }

  /**
   * Load entity tables from database metadata
   */
  async loadEntityTablesFromMetadata() {
    try {
      const result = await query(`
        SELECT table_name, api_property_name
        FROM ai_metadata
        WHERE is_entity_table = true
        AND include_in_knowledge_base = true
      `);

      this.entityTablesCache = result.rows.map(row => row.table_name);
      this.tableApiMappings = {};
      result.rows.forEach(row => {
        this.tableApiMappings[row.table_name] = row.api_property_name;
      });
      this.metadataCacheTime = new Date();

      console.log('[SchemaDiscovery] Loaded entity tables from metadata:', this.entityTablesCache);
    } catch (error) {
      console.error('[SchemaDiscovery] Error loading entity tables from metadata:', error);
      // Initialize with empty cache to prevent repeated failures
      this.entityTablesCache = [];
      this.tableApiMappings = {};
    }
  }

  /**
   * Check if metadata cache is stale
   */
  isMetadataCacheStale() {
    if (!this.metadataCacheTime) return true;
    const minutesSinceCache = (Date.now() - this.metadataCacheTime.getTime()) / (1000 * 60);
    // Reduced to 5 minutes for faster updates when new tables are added
    return minutesSinceCache > 5; // Refresh every 5 minutes
  }

  /**
   * Get API property name for a table
   */
  getApiPropertyName(tableName) {
    return this.tableApiMappings?.[tableName] || tableName;
  }

  /**
   * Calculate how relevant a table is for AI operations
   */
  async calculateAIRelevance(tableName, columns) {
    let score = 0;

    // Entity tables are highly relevant
    if (await this.isEntityTable(tableName)) score += 50;

    // Tables with AI fields are very relevant
    const hasAIFields = columns.some(col => 
      this.isAIProcessedField(col.column_name)
    );
    if (hasAIFields) score += 30;

    // Tables with content fields are relevant
    const contentFields = ['description', 'summary', 'content', 'text', 'notes'];
    const hasContentFields = columns.some(col =>
      contentFields.some(field => col.column_name.toLowerCase().includes(field))
    );
    if (hasContentFields) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Infer the semantic type of a column based on its name and data type
   */
  inferSemanticType(columnName, dataType) {
    const lowerName = columnName.toLowerCase();

    // Identity fields
    if (lowerName === 'id' || lowerName.endsWith('_id')) return 'identifier';

    // Temporal fields
    if (dataType.includes('timestamp') || dataType.includes('date')) return 'temporal';

    // Numeric measurements
    if (dataType.includes('numeric') || dataType.includes('integer')) {
      if (lowerName.includes('score')) return 'score';
      if (lowerName.includes('count')) return 'count';
      if (lowerName.includes('amount') || lowerName.includes('price')) return 'monetary';
      return 'numeric';
    }

    // Text fields
    if (dataType.includes('text') || dataType.includes('varchar')) {
      if (lowerName.includes('email')) return 'email';
      if (lowerName.includes('phone')) return 'phone';
      if (lowerName.includes('url') || lowerName.includes('link')) return 'url';
      if (lowerName.includes('description') || lowerName.includes('summary')) return 'description';
      if (lowerName.includes('name') || lowerName.includes('title')) return 'name';
      return 'text';
    }

    // Boolean fields
    if (dataType === 'boolean') return 'boolean';

    // JSON fields
    if (dataType === 'jsonb' || dataType === 'json') return 'structured';

    return 'unknown';
  }

  /**
   * Detect relationships between tables
   */
  async detectRelationships(schema) {
    for (const [tableName, tableInfo] of Object.entries(schema)) {
      // Look for foreign keys that reference entity tables
      for (const [columnName, fkInfo] of Object.entries(tableInfo.foreignKeys)) {
        const referencedTable = fkInfo.referencedTable;

        // Mark cross-references
        if (await this.isEntityTable(referencedTable)) {
          if (!tableInfo.relatedEntities) {
            tableInfo.relatedEntities = [];
          }
          tableInfo.relatedEntities.push({
            entity: referencedTable,
            via: columnName,
            type: 'foreign_key'
          });
        }
      }
    }
  }

  /**
   * Get schema with only AI-relevant tables and fields
   */
  async getAIRelevantSchema() {
    if (!this.schemaCache || this.isStale()) {
      await this.discoverSchema();
    }

    const relevantSchema = {};

    for (const [tableName, tableInfo] of Object.entries(this.schemaCache)) {
      // Skip tables with low AI relevance
      if (tableInfo.aiRelevance < 20) continue;

      // Skip tables with only sensitive data
      if (tableInfo.hasSensitiveData && !tableInfo.hasAIFields && !tableInfo.isEntityTable) continue;

      relevantSchema[tableName] = {
        ...tableInfo,
        columns: {}
      };

      // Filter columns
      for (const [columnName, columnInfo] of Object.entries(tableInfo.columns)) {
        // Skip sensitive fields unless they're AI-processed
        if (columnInfo.isSensitive && !columnInfo.isAIProcessed) continue;

        relevantSchema[tableName].columns[columnName] = columnInfo;
      }
    }

    return relevantSchema;
  }

  /**
   * Generate SQL queries for AI Concierge based on discovered schema
   */
  async generateDynamicQueries() {
    const schema = await this.getAIRelevantSchema();
    const queries = {};

    for (const [tableName, tableInfo] of Object.entries(schema)) {
      if (!tableInfo.isEntityTable) continue;

      // Build column list excluding sensitive fields
      const columns = Object.entries(tableInfo.columns)
        .filter(([_, info]) => !info.isSensitive)
        .map(([name, _]) => name);

      // Generate SELECT query
      queries[tableName] = {
        selectAll: `SELECT ${columns.join(', ')} FROM ${tableName}`,
        selectActive: tableInfo.columns.is_active 
          ? `SELECT ${columns.join(', ')} FROM ${tableName} WHERE is_active = true`
          : `SELECT ${columns.join(', ')} FROM ${tableName}`,
        count: `SELECT COUNT(*) as count FROM ${tableName}`,
        aiFields: Object.entries(tableInfo.columns)
          .filter(([_, info]) => info.isAIProcessed)
          .map(([name, _]) => name)
      };
    }

    return queries;
  }

  /**
   * Check if schema cache is stale
   */
  isStale() {
    if (!this.lastDiscoveryTime) return true;

    // In development, cache for only 5 minutes for faster testing
    const cacheHours = process.env.NODE_ENV === 'development' ? 0.083 : 24; // 5 minutes or 24 hours

    const hoursSinceDiscovery = (Date.now() - this.lastDiscoveryTime.getTime()) / (1000 * 60 * 60);
    return hoursSinceDiscovery > cacheHours;
  }

  /**
   * Force refresh the schema cache
   */
  async forceRefresh() {
    console.log('[SchemaDiscovery] Force refreshing schema AND metadata...');
    // Clear main schema cache
    this.schemaCache = null;
    this.lastDiscoveryTime = null;
    // Clear entity tables metadata cache
    this.entityTablesCache = null;
    this.metadataCacheTime = null;
    this.tableApiMappings = null;
    console.log('[SchemaDiscovery] All caches cleared, forcing full refresh');
    return await this.discoverSchema(true);
  }

  /**
   * Save schema to file for debugging
   */
  async saveSchemaToFile(schema) {
    try {
      const filePath = path.join(__dirname, '../../logs/discovered-schema.json');
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(
        filePath,
        JSON.stringify(schema, null, 2),
        'utf8'
      );
      console.log(`[SchemaDiscovery] Schema saved to ${filePath}`);
    } catch (error) {
      console.error('[SchemaDiscovery] Error saving schema to file:', error);
    }
  }

  /**
   * Get a summary of the discovered schema
   */
  async getSchemaSummary() {
    if (!this.schemaCache || this.isStale()) {
      await this.discoverSchema();
    }

    const summary = {
      discoveredAt: this.lastDiscoveryTime,
      totalTables: Object.keys(this.schemaCache).length,
      entityTables: [],
      tablesWithAI: [],
      tablesWithSensitiveData: [],
      totalColumns: 0,
      aiProcessedColumns: [],
      relationships: []
    };

    for (const [tableName, tableInfo] of Object.entries(this.schemaCache)) {
      if (tableInfo.isEntityTable) {
        summary.entityTables.push({
          name: tableName,
          rowCount: tableInfo.rowCount,
          aiRelevance: tableInfo.aiRelevance
        });
      }

      if (tableInfo.hasAIFields) {
        summary.tablesWithAI.push(tableName);
      }

      if (tableInfo.hasSensitiveData) {
        summary.tablesWithSensitiveData.push(tableName);
      }

      summary.totalColumns += Object.keys(tableInfo.columns).length;

      for (const [columnName, columnInfo] of Object.entries(tableInfo.columns)) {
        if (columnInfo.isAIProcessed) {
          summary.aiProcessedColumns.push(`${tableName}.${columnName}`);
        }
      }

      if (tableInfo.relatedEntities) {
        summary.relationships.push(...tableInfo.relatedEntities.map(rel => ({
          from: tableName,
          to: rel.entity,
          via: rel.via
        })));
      }
    }

    return summary;
  }
}

module.exports = new SchemaDiscoveryService();