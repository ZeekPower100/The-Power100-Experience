@echo off
REM Create focus area mapping table

set PGPASSWORD=TPXP0stgres!!

echo Creating focus area mappings table...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE TABLE IF NOT EXISTS focus_area_mappings (id SERIAL PRIMARY KEY, contractor_focus_area VARCHAR(100) NOT NULL, partner_focus_area VARCHAR(100) NOT NULL, confidence_score FLOAT DEFAULT 1.0, auto_mapped BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(contractor_focus_area, partner_focus_area));"

echo.
echo Inserting initial mappings...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "INSERT INTO focus_area_mappings (contractor_focus_area, partner_focus_area, confidence_score, auto_mapped) VALUES ('greenfield_growth', 'greenfield_growth', 1.0, false), ('closing_higher_percentage', 'closing_higher_percentage', 1.0, false), ('controlling_lead_flow', 'controlling_lead_flow', 1.0, false), ('installation_quality', 'installation_quality', 1.0, false), ('hiring_sales_leadership', 'hiring_sales_leadership', 1.0, false), ('marketing_automation', 'marketing_automation', 1.0, false), ('customer_retention', 'customer_retention', 1.0, false), ('operational_efficiency', 'operational_efficiency', 1.0, false), ('technology_integration', 'technology_integration', 1.0, false), ('financial_management', 'financial_management', 1.0, false) ON CONFLICT (contractor_focus_area, partner_focus_area) DO NOTHING;"

echo.
echo Creating indexes...
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE INDEX IF NOT EXISTS idx_focus_mapping_contractor ON focus_area_mappings(contractor_focus_area);"
"C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d tpedb -c "CREATE INDEX IF NOT EXISTS idx_focus_mapping_partner ON focus_area_mappings(partner_focus_area);"

echo.
echo Focus area mapping table created successfully!