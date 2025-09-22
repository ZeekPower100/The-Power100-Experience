const { Client } = require('pg');

// Configuration for both databases
const localConfig = {
  host: 'localhost',
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!',
  port: 5432
};

const productionConfig = {
  host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
  database: 'tpedb',
  user: 'tpeadmin',
  password: 'dBP0wer100!!',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

async function compareSchemas() {
  console.log('📊 COMPARING LOCAL vs PRODUCTION DATABASE SCHEMAS\n');
  console.log('=' .repeat(70));

  const localClient = new Client(localConfig);
  const prodClient = new Client(productionConfig);

  try {
    // Connect to both databases
    await localClient.connect();
    await prodClient.connect();
    console.log('✅ Connected to both databases\n');

    // Get tables from both databases
    const localTablesResult = await localClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const prodTablesResult = await prodClient.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const localTables = new Set(localTablesResult.rows.map(r => r.table_name));
    const prodTables = new Set(prodTablesResult.rows.map(r => r.table_name));

    // Find differences
    const onlyInLocal = [...localTables].filter(t => !prodTables.has(t));
    const onlyInProd = [...prodTables].filter(t => !localTables.has(t));
    const inBoth = [...localTables].filter(t => prodTables.has(t));

    console.log('📊 TABLE SUMMARY:');
    console.log(`  Local tables: ${localTables.size}`);
    console.log(`  Production tables: ${prodTables.size}`);
    console.log(`  Shared tables: ${inBoth.length}\n`);

    if (onlyInLocal.length > 0) {
      console.log('⚠️ TABLES ONLY IN LOCAL:');
      onlyInLocal.forEach(t => console.log(`  - ${t}`));
      console.log();
    }

    if (onlyInProd.length > 0) {
      console.log('⚠️ TABLES ONLY IN PRODUCTION:');
      onlyInProd.forEach(t => console.log(`  - ${t}`));
      console.log();
    }

    // Check critical tables for column differences
    const criticalTables = [
      'partners', 'video_content', 'contractors', 'ai_metadata',
      'video_analysis', 'strategic_partners', 'books', 'podcasts'
    ];

    console.log('=' .repeat(70));
    console.log('\n🔍 CHECKING COLUMN DIFFERENCES FOR CRITICAL TABLES:\n');

    for (const tableName of criticalTables) {
      if (!localTables.has(tableName) || !prodTables.has(tableName)) {
        if (!localTables.has(tableName)) {
          console.log(`❌ Table '${tableName}' missing in LOCAL`);
        }
        if (!prodTables.has(tableName)) {
          console.log(`❌ Table '${tableName}' missing in PRODUCTION`);
        }
        continue;
      }

      // Get columns for this table from both databases
      const localColumnsResult = await localClient.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);

      const prodColumnsResult = await prodClient.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);

      const localCols = new Map(localColumnsResult.rows.map(c => [c.column_name, c]));
      const prodCols = new Map(prodColumnsResult.rows.map(c => [c.column_name, c]));

      const colsOnlyInLocal = [...localCols.keys()].filter(c => !prodCols.has(c));
      const colsOnlyInProd = [...prodCols.keys()].filter(c => !localCols.has(c));

      if (colsOnlyInLocal.length === 0 && colsOnlyInProd.length === 0) {
        console.log(`✅ ${tableName}: Columns match (${localCols.size} columns)`);
      } else {
        console.log(`\n⚠️ ${tableName}: COLUMN DIFFERENCES FOUND`);
        if (colsOnlyInLocal.length > 0) {
          console.log('  Only in LOCAL:');
          colsOnlyInLocal.forEach(c => {
            const col = localCols.get(c);
            console.log(`    - ${c} (${col.data_type})`);
          });
        }
        if (colsOnlyInProd.length > 0) {
          console.log('  Only in PRODUCTION:');
          colsOnlyInProd.forEach(c => {
            const col = prodCols.get(c);
            console.log(`    - ${c} (${col.data_type})`);
          });
        }
      }
    }

    // Check for AI-related columns in video_content specifically
    console.log('\n' + '=' .repeat(70));
    console.log('\n🤖 VIDEO_CONTENT AI COLUMNS CHECK:\n');

    const aiColumns = ['ai_processing_status', 'ai_summary', 'ai_insights',
                      'ai_engagement_score', 'last_ai_analysis'];

    for (const col of aiColumns) {
      const localHas = await localClient.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'video_content' AND column_name = $1",
        [col]
      );
      const prodHas = await prodClient.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name = 'video_content' AND column_name = $1",
        [col]
      );

      const status = (localHas.rows.length > 0 && prodHas.rows.length > 0) ? '✅' :
                    (localHas.rows.length > 0) ? '⚠️ LOCAL ONLY' :
                    (prodHas.rows.length > 0) ? '⚠️ PROD ONLY' : '❌ MISSING';

      console.log(`  ${col}: ${status}`);
    }

    console.log('\n' + '=' .repeat(70));
    console.log('📊 COMPARISON COMPLETE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await localClient.end();
    await prodClient.end();
  }
}

compareSchemas();