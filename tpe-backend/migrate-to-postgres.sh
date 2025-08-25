#!/bin/bash

# Export SQLite data
echo "Exporting data from SQLite..."
sqlite3 power100.db <<SQL
.mode csv
.headers on
.output contractors.csv
SELECT * FROM contractors;
.output strategic_partners.csv
SELECT * FROM strategic_partners;
.output admin_users.csv
SELECT * FROM admin_users;
.quit
SQL

# Create PostgreSQL schema
echo "Creating PostgreSQL schema..."
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb <<SQL
-- Drop tables if exist
DROP TABLE IF EXISTS contractor_partner_matches CASCADE;
DROP TABLE IF EXISTS demo_bookings CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS partners CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create tables
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    capabilities TEXT,
    regions TEXT,
    revenue_tiers TEXT,
    testimonials TEXT,
    powerconfidence_score INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contractors (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    company_name VARCHAR(255),
    revenue_tier VARCHAR(100),
    team_size VARCHAR(100),
    focus_areas TEXT,
    readiness_indicators TEXT,
    is_verified BOOLEAN DEFAULT false,
    verification_code VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
SQL

echo "Migration complete!"
