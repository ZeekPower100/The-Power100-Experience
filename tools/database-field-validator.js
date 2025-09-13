#!/usr/bin/env node

/**
 * Database Field Validator - Ensures Frontend/Backend/Database Alignment
 * 
 * This tool validates that field names used in frontend forms, backend controllers,
 * and database schemas are perfectly aligned.
 * 
 * Usage:
 * - Validate all entities: node tools/database-field-validator.js
 * - Validate specific entity: node tools/database-field-validator.js --entity events
 * - Watch mode: node tools/database-field-validator.js --watch
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chokidar = require('chokidar');

class DatabaseFieldValidator {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.backendPath = path.join(this.projectRoot, 'tpe-backend');
    this.frontendPath = path.join(this.projectRoot, 'tpe-front-end');
    
    // Legitimate field mappings (frontend/backend field → database field)
    // These are intentional mappings that should NOT be flagged as errors
    this.legitimateMappings = {
      // Common mappings across entities
      global: {
        'is_active': 'is_active',  // Common status field
        'status': 'status',        // Common status field
        'focus_areas': 'focus_areas_covered',  // Frontend uses simpler name
      },
      // Event-specific mappings
      events: {
        // expected_attendance is now aligned across all layers
        'event_image_url': 'logo_url',               // Frontend uses more specific name
        'start_date': 'date',                        // Frontend splits dates
        'end_date': 'registration_deadline',         // Frontend splits dates
        'website_url': 'website',                    // Frontend adds _url suffix
      },
      // Book-specific mappings
      books: {
        'book_cover_url': 'cover_image_url',        // Frontend uses book_ prefix
        'author_name': 'author',                    // Frontend more specific
      },
      // Podcast-specific mappings
      podcasts: {
        'podcast_name': 'name',                     // Frontend uses podcast_ prefix
        'host_name': 'host',                        // Frontend more specific
      },
      // Partner-specific mappings
      partners: {
        // Contact field mappings (form field → database field)
        'ceo_name': 'ceo_contact_name',
        'ceo_email': 'ceo_contact_email',
        'ceo_phone': 'ceo_contact_phone',
        'ceo_title': 'ceo_contact_title',
        'cx_name': 'cx_contact_name',
        'cx_email': 'cx_contact_email',
        'cx_phone': 'cx_contact_phone',
        'cx_title': 'cx_contact_title',
        'sales_name': 'sales_contact_name',
        'sales_email': 'sales_contact_email',
        'sales_phone': 'sales_contact_phone',
        'sales_title': 'sales_contact_title',
        'onboarding_name': 'onboarding_contact_name',
        'onboarding_email': 'onboarding_contact_email',
        'onboarding_phone': 'onboarding_contact_phone',
        'onboarding_title': 'onboarding_contact_title',
        'marketing_name': 'marketing_contact_name',
        'marketing_email': 'marketing_contact_email',
        'marketing_phone': 'marketing_contact_phone',
        'marketing_title': 'marketing_contact_title',
        'contact_name': 'primary_contact',
        // Event/content relationships
        'events_sponsored': 'sponsored_events',
        'podcasts_appeared': 'podcast_appearances',
        'books_recommended': 'books_read_recommended',
        'referral_partnerships': 'best_working_partnerships',
        'other_sponsored_events': 'sponsored_events',
        'other_podcast_appearances': 'podcast_appearances'
        // client_count now maps directly to client_count column (no mapping needed)
      }
    };
    
    // Dropdown value alignments - CRITICAL for data consistency
    // These define the expected values for select/dropdown fields
    this.dropdownValues = {
      events: {
        event_type: {
          expected: ['Conference', 'Workshop', 'Seminar', 'Webinar', 'Networking', 'Training', 'Summit', 'Bootcamp', 'Retreat', 'Other'],
          caseSensitive: true,
          description: 'Must use Capitalized values (e.g., "Conference" not "conference")'
        },
        format: {
          expected: ['In-person', 'Virtual', 'Hybrid'],
          caseSensitive: true,
          description: 'Must use Capitalized with hyphen (e.g., "In-person" not "in_person")'
        },
        expected_attendance: {
          expected: ['1-50', '51-100', '101-250', '251-500', '500+'],
          caseSensitive: false,
          description: 'Must use range format (e.g., "1-50" not a number like "50")'
        }
      },
      books: {
        // Add book-specific dropdown values here when needed
      },
      podcasts: {
        // Add podcast-specific dropdown values here when needed
      }
    };
    
    // Known entity mappings
    this.entities = {
      events: {
        table: 'events',
        controller: 'eventController.js',
        routes: 'eventRoutes.js',
        form: 'EventOnboardingForm.tsx',
        adminForm: 'EventForm.tsx'
      },
      books: {
        table: 'books',
        controller: 'bookController.js',
        routes: 'bookRoutes.js',
        form: 'BookOnboardingForm.tsx',
        adminForm: 'BookForm.tsx'
      },
      podcasts: {
        table: 'podcasts',
        controller: 'podcastController.js',
        routes: 'podcastRoutes.js',
        form: 'PodcastOnboardingForm.tsx',
        adminForm: 'PodcastForm.tsx'
      },
      contractors: {
        table: 'contractors',
        controller: 'contractorController.js',
        routes: 'contractorRoutes.js',
        form: null,
        adminForm: 'ContractorForm.tsx'
      },
      partners: {
        table: 'strategic_partners',
        controller: 'partnerController.js',
        routes: 'partnerRoutes.js',
        form: null,
        adminForm: 'PartnerForm.tsx'
      }
    };
    
    this.validationResults = [];
  }

  /**
   * Get database schema for a table
   */
  getDatabaseSchema(tableName) {
    try {
      // Create a batch file for Windows compatibility
      const batchContent = `@echo off
set PGPASSWORD=TPXP0stgres!!
"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -U postgres -d tpedb -c "SELECT column_name FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position;" -t`;
      
      const tempBatch = path.join(this.projectRoot, 'temp_db_check.bat');
      fs.writeFileSync(tempBatch, batchContent);
      
      const output = execSync(tempBatch, { 
        encoding: 'utf-8',
        cwd: this.projectRoot
      });
      
      // Clean up temp file
      fs.unlinkSync(tempBatch);
      
      return output
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('-'))
        .filter(col => !['id', 'created_at', 'updated_at'].includes(col));
    } catch (error) {
      console.error(`Failed to get schema for ${tableName}:`, error.message);
      return [];
    }
  }

  /**
   * Extract field names from controller
   */
  extractControllerFields(controllerPath) {
    if (!fs.existsSync(controllerPath)) return { creates: [], updates: [] };
    
    const content = fs.readFileSync(controllerPath, 'utf-8');
    const fields = new Set();
    
    // Find destructuring patterns in create/update functions
    // Only extract from req.body and mappedBody (actual data fields)
    // Ignore req.query (search parameters) and req.params (URL parameters)
    const patterns = [
      /const\s*{\s*([^}]+)\s*}\s*=\s*req\.body/g,
      /const\s*{\s*([^}]+)\s*}\s*=\s*mappedBody/g,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        // Remove comments and clean up the destructuring content
        const cleanedContent = match[1]
          .split('\n')
          .map(line => {
            // Remove single-line comments
            const commentIndex = line.indexOf('//');
            if (commentIndex !== -1) {
              return line.substring(0, commentIndex);
            }
            return line;
          })
          .join(',');
        
        const fieldList = cleanedContent
          .split(',')
          .map(f => f.trim())
          .map(f => f.split('=')[0].trim())
          .map(f => f.split(':')[0].trim()) // Handle "query: searchQuery" patterns
          .filter(f => f && !f.includes('...') && !f.includes('//') && !f.includes('/*'));
        
        fieldList.forEach(field => {
          // Additional filtering for edge cases
          // Also exclude common non-database fields
          const excludedFields = [
            'submission_type',     // UI field, not in database
            'contractor_id',       // From params, not body
            'code',               // Verification code
            'selected_partner_id', // Temporary selection
            'query',              // Search parameter
            'limit',              // Pagination
            'offset',             // Pagination
            'sortBy',             // Sorting
            'sortOrder',          // Sorting
            'focusAreas',         // Search filter
            'revenueRange',       // Search filter
            'revenueRanges',      // Search filter
            'stage',              // Search filter
            'isActive',           // Search filter
            'verificationStatus', // Search filter
            'teamSizeMin',        // Search filter
            'teamSizeMax',        // Search filter
            'readinessIndicators',// Search filter
            'dateFrom',           // Date filter
            'dateTo',             // Date filter
            'confidenceScoreMin', // Search filter
            'confidenceScoreMax', // Search filter
            'barnes_noble_url',   // Not yet added to DB
            'author_website_purchase_url', // Not yet added to DB
            'onboarding_url',     // Computed field
            'demo_booking_url'    // Computed field
          ];
          if (field && 
              !field.startsWith('//') && 
              !field.includes('\n') &&
              !excludedFields.includes(field)) {
            fields.add(field);
          }
        });
      }
    });
    
    return Array.from(fields);
  }

  /**
   * Extract field names from frontend form
   */
  extractFormFields(formPath) {
    if (!fs.existsSync(formPath)) return [];
    
    const content = fs.readFileSync(formPath, 'utf-8');
    const fields = new Set();
    
    // Find formData field references
    const patterns = [
      /formData\.(\w+)/g,
      /handleFieldChange\(['"](\w+)['"]/g,
      /handleArrayFieldChange\(['"](\w+)['"]/g,
      /setFormData\([^)]*{\s*([^}]+)\s*}/g,
      /useState[<\w]*\(\s*{\s*([^}]+)\s*}\s*\)/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        if (match[1]) {
          if (match[1].includes(':')) {
            // Handle useState object - remove comments
            const cleanedContent = match[1]
              .split('\n')
              .map(line => {
                const commentIndex = line.indexOf('//');
                if (commentIndex !== -1) {
                  return line.substring(0, commentIndex);
                }
                return line;
              })
              .join(',');
            
            const fieldList = cleanedContent
              .split(',')
              .map(f => f.trim())
              .map(f => f.split(':')[0].trim())
              .filter(f => f && !f.includes('...') && !f.includes('//'));
            
            fieldList.forEach(field => {
              // Filter out template syntax and invalid field names
              if (field && 
                  !field.includes('[') && 
                  !field.includes(']') && 
                  !field.includes('.') &&
                  !field.startsWith('//') &&
                  field.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
                fields.add(field);
              }
            });
          } else {
            // Filter out template syntax and invalid field names
            if (match[1].match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
              fields.add(match[1]);
            }
          }
        }
      }
    });
    
    return Array.from(fields);
  }

  /**
   * Validate field alignment for an entity
   */
  validateEntity(entityName) {
    const entity = this.entities[entityName];
    if (!entity) {
      console.log(`❌ Unknown entity: ${entityName}`);
      return false;
    }
    
    console.log(`\n🔍 Validating ${entityName}...`);
    
    // Get database schema
    const dbFields = this.getDatabaseSchema(entity.table);
    console.log(`   📊 Database fields (${dbFields.length}):`, dbFields.slice(0, 5).join(', '), '...');
    
    // Get controller fields
    const controllerPath = path.join(this.backendPath, 'src/controllers', entity.controller);
    const controllerFields = this.extractControllerFields(controllerPath);
    console.log(`   🎮 Controller fields (${controllerFields.length}):`, controllerFields.slice(0, 5).join(', '), '...');
    
    // Get form fields
    const formFields = [];
    if (entity.form) {
      const formPath = path.join(this.frontendPath, 'src/components', entityName.slice(0, -1), entity.form);
      formFields.push(...this.extractFormFields(formPath));
    }
    if (entity.adminForm) {
      const adminFormPath = path.join(this.frontendPath, 'src/components/admin', entity.adminForm);
      formFields.push(...this.extractFormFields(adminFormPath));
    }
    console.log(`   📝 Form fields (${formFields.length}):`, formFields.slice(0, 5).join(', '), '...');
    
    // Check for legitimate mappings
    const detectedMappings = [];
    formFields.forEach(field => {
      const globalMapping = this.legitimateMappings.global[field];
      const entityMapping = this.legitimateMappings[entityName] && this.legitimateMappings[entityName][field];
      const mappedField = entityMapping || globalMapping;
      
      if (mappedField && mappedField !== field && dbFields.includes(mappedField)) {
        detectedMappings.push(`${field} → ${mappedField}`);
      }
    });
    
    if (detectedMappings.length > 0) {
      console.log(`   🔄 Detected legitimate mappings: ${detectedMappings.join(', ')}`);
    }
    
    // Find mismatches
    const issues = [];
    
    // Check controller fields against database
    controllerFields.forEach(field => {
      if (!dbFields.includes(field) && !['is_active', 'status'].includes(field)) {
        issues.push({
          type: 'controller_no_db',
          field,
          message: `Controller uses field "${field}" but it doesn't exist in database`
        });
      }
    });
    
    // Check form fields against database
    formFields.forEach(field => {
      // Check if this is a legitimate mapping
      const globalMapping = this.legitimateMappings.global[field];
      const entityMapping = this.legitimateMappings[entityName] && this.legitimateMappings[entityName][field];
      const mappedField = entityMapping || globalMapping;
      
      if (mappedField) {
        // This is a legitimate mapping - check if the mapped field exists in DB
        if (!dbFields.includes(mappedField)) {
          issues.push({
            type: 'mapped_field_missing',
            field,
            mappedTo: mappedField,
            message: `Form field "${field}" maps to "${mappedField}" but database field doesn't exist`
          });
        }
        // If mapped field exists, this is OK - no issue
      } else if (!dbFields.includes(field)) {
        // Not a legitimate mapping and field doesn't exist
        // Check for common mismatches that should be fixed
        const knownMismatches = {
          'speakers': 'speaker_profiles',
          'testimonials': 'past_attendee_testimonials',
          'key_topics': 'topics',
          'submitter_name': 'organizer_name',
          'submitter_email': 'organizer_email',
          'submitter_phone': 'organizer_phone',
          'submitter_company': 'organizer_company'
        };
        
        if (knownMismatches[field]) {
          issues.push({
            type: 'field_mismatch',
            field,
            correct: knownMismatches[field],
            message: `Form uses "${field}" but database has "${knownMismatches[field]}"`
          });
        } else {
          issues.push({
            type: 'form_no_db',
            field,
            message: `Form uses field "${field}" but it doesn't exist in database`
          });
        }
      }
    });
    
    // Check dropdown value alignments
    const dropdownIssues = this.validateDropdownValues(entityName, entity);
    issues.push(...dropdownIssues);
    
    // Report results
    if (issues.length > 0) {
      console.log(`\n❌ ${entityName} has ${issues.length} field alignment issues:\n`);
      issues.forEach(issue => {
        if (issue.type === 'field_mismatch') {
          console.log(`   ⚠️  ${issue.message}`);
          console.log(`      Fix: Change "${issue.field}" to "${issue.correct}" in form`);
        } else if (issue.type === 'dropdown_case_mismatch') {
          console.log(`   ⚠️  VALUE CASE: ${issue.message}`);
          console.log(`      Fix: Change dropdown value from "${issue.publicValue}" to "${issue.adminValue}"`);
        } else if (issue.type === 'dropdown_format_mismatch') {
          console.log(`   ⚠️  VALUE FORMAT: ${issue.message}`);
          console.log(`      Fix: Change dropdown value from "${issue.currentValue}" to "${issue.expectedValue}"`);
        } else if (issue.type === 'dropdown_unexpected_value') {
          console.log(`   ❌ INVALID VALUE: ${issue.message}`);
        } else if (issue.type === 'admin_dropdown_mismatch') {
          console.log(`   ⚠️  ADMIN FORM: ${issue.message}`);
        } else {
          console.log(`   ❌ ${issue.message}`);
        }
      });
      
      this.validationResults.push({
        entity: entityName,
        passed: false,
        issues
      });
      
      return false;
    } else {
      console.log(`   ✅ All fields are properly aligned!`);
      
      this.validationResults.push({
        entity: entityName,
        passed: true,
        issues: []
      });
      
      return true;
    }
  }

  /**
   * Extract dropdown/select options from a form file
   */
  extractDropdownOptions(formPath, fieldName) {
    if (!fs.existsSync(formPath)) return [];
    
    const content = fs.readFileSync(formPath, 'utf-8');
    const options = [];
    
    // First try to find constant definitions (e.g., EVENT_TYPE_OPTIONS, EXPECTED_ATTENDANCE_OPTIONS)
    const fieldNameUpper = fieldName.replace(/_/g, '_?').toUpperCase();
    const constantPattern = new RegExp(`const \\w*${fieldNameUpper}\\w*_OPTIONS\\s*=\\s*\\[([\\s\\S]*?)\\];`, 'i');
    const constantMatch = constantPattern.exec(content);
    
    if (constantMatch) {
      // Extract values from { value: 'xxx', label: 'yyy' } format
      const valuePattern = /value:\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = valuePattern.exec(constantMatch[1])) !== null) {
        options.push(match[1]);
      }
      return options; // If we found a constant, use only those values
    }
    
    // Otherwise look for select/dropdown specific to this field
    // Find the select element for this specific field
    const fieldPattern = new RegExp(
      `(?:value|name|id)=["']${fieldName}["'][\\s\\S]*?(?:<\\/select>|<\\/Select>)`,
      'gi'
    );
    const fieldMatch = fieldPattern.exec(content);
    
    if (fieldMatch) {
      // Extract SelectItem or option values only from this specific select
      const selectPattern = /<(?:SelectItem|option)\\s+value=["']([^"']+)["']/gi;
      let match;
      while ((match = selectPattern.exec(fieldMatch[0])) !== null) {
        if (match[1] && !options.includes(match[1])) {
          options.push(match[1]);
        }
      }
    }
    
    return options;
  }

  /**
   * Validate dropdown values between public and admin forms
   */
  validateDropdownValues(entityName, entity) {
    const issues = [];
    const dropdownConfig = this.dropdownValues[entityName];
    
    if (!dropdownConfig) {
      return issues; // No dropdown validations defined for this entity
    }
    
    console.log(`   🔍 Checking dropdown value alignments...`);
    
    Object.keys(dropdownConfig).forEach(fieldName => {
      const config = dropdownConfig[fieldName];
      const publicFormPath = entity.form ? path.join(this.frontendPath, 'src/components', entityName.slice(0, -1), entity.form) : null;
      const adminFormPath = entity.adminForm ? path.join(this.frontendPath, 'src/components/admin', entity.adminForm) : null;
      
      // Extract values from both forms
      const publicValues = publicFormPath ? this.extractDropdownOptions(publicFormPath, fieldName) : [];
      const adminValues = adminFormPath ? this.extractDropdownOptions(adminFormPath, fieldName) : [];
      
      // Check for case mismatches if case sensitive
      if (config.caseSensitive && publicValues.length > 0 && adminValues.length > 0) {
        publicValues.forEach(publicValue => {
          const adminMatch = adminValues.find(av => av.toLowerCase() === publicValue.toLowerCase());
          if (adminMatch && adminMatch !== publicValue) {
            issues.push({
              type: 'dropdown_case_mismatch',
              field: fieldName,
              publicValue,
              adminValue: adminMatch,
              message: `Dropdown "${fieldName}" has case mismatch: public="${publicValue}" vs admin="${adminMatch}"`
            });
          }
        });
      }
      
      // Check for value format mismatches
      publicValues.forEach(value => {
        if (!config.expected.includes(value)) {
          const expectedFormat = config.expected.find(ev => 
            ev.toLowerCase().replace(/[-_\s]/g, '') === value.toLowerCase().replace(/[-_\s]/g, '')
          );
          
          if (expectedFormat) {
            issues.push({
              type: 'dropdown_format_mismatch',
              field: fieldName,
              currentValue: value,
              expectedValue: expectedFormat,
              message: `Dropdown "${fieldName}" value format issue: "${value}" should be "${expectedFormat}". ${config.description}`
            });
          } else if (!value.startsWith('Select') && value !== '') {
            issues.push({
              type: 'dropdown_unexpected_value',
              field: fieldName,
              value,
              message: `Dropdown "${fieldName}" has unexpected value: "${value}". Expected: ${config.expected.join(', ')}`
            });
          }
        }
      });
      
      // Check that admin values match expected
      adminValues.forEach(value => {
        if (!config.expected.includes(value) && !value.startsWith('Select') && value !== '') {
          issues.push({
            type: 'admin_dropdown_mismatch',
            field: fieldName,
            value,
            message: `Admin form dropdown "${fieldName}" has non-standard value: "${value}"`
          });
        }
      });
    });
    
    return issues;
  }

  /**
   * Validate all entities
   */
  validateAll() {
    console.log('🔍 Database Field Validator\n');
    console.log('Checking field alignment between Frontend → Backend → Database...\n');
    
    let allPassed = true;
    
    Object.keys(this.entities).forEach(entityName => {
      const passed = this.validateEntity(entityName);
      if (!passed) allPassed = false;
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    this.validationResults.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const status = result.passed ? 'PASSED' : `FAILED (${result.issues.length} issues)`;
      console.log(`${icon} ${result.entity}: ${status}`);
    });
    
    if (!allPassed) {
      console.log('\n⚠️  CRITICAL: Field mismatches detected!');
      console.log('Run the following to fix:');
      console.log('1. Check database schema: ./check_table_schema.bat [table]');
      console.log('2. Update frontend forms to use correct field names');
      console.log('3. Ensure backend controllers extract the right fields');
      console.log('\nRefer to DATABASE-SOURCE-OF-TRUTH.md for guidelines');
    } else {
      console.log('\n✅ All entities have properly aligned fields!');
    }
    
    return allPassed;
  }

  /**
   * Watch for changes and re-validate
   */
  watch() {
    console.log('👁️  Watching for field alignment changes...\n');
    
    const paths = [
      path.join(this.backendPath, 'src/controllers'),
      path.join(this.frontendPath, 'src/components')
    ];
    
    const watcher = chokidar.watch(paths, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });
    
    watcher.on('change', (filePath) => {
      console.log(`\n📝 File changed: ${path.basename(filePath)}`);
      this.validationResults = [];
      this.validateAll();
    });
    
    // Initial validation
    this.validateAll();
  }
}

// CLI handling
const validator = new DatabaseFieldValidator();
const args = process.argv.slice(2);

if (args.includes('--watch')) {
  validator.watch();
} else if (args.includes('--entity')) {
  const entityIndex = args.indexOf('--entity');
  const entityName = args[entityIndex + 1];
  validator.validateEntity(entityName);
} else {
  const allPassed = validator.validateAll();
  process.exit(allPassed ? 0 : 1);
}