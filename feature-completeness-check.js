#!/usr/bin/env node
/**
 * Feature Completeness Check
 * Ensures all related files for a feature are staged together
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define feature patterns - files that should be committed together
const FEATURE_PATTERNS = {
  entityManagement: {
    name: 'Entity Management (Books/Events/Podcasts)',
    required: [
      {
        pattern: /src\/components\/admin\/(Book|Event|Podcast)Form\.tsx$/,
        description: 'Entity form components'
      },
      {
        pattern: /src\/app\/admindashboard\/(books|events|podcasts)\/page\.tsx$/,
        description: 'Entity management pages'
      },
      {
        pattern: /src\/controllers\/(book|event|podcast)Controller\.js$/,
        description: 'Backend controllers'
      },
      {
        pattern: /src\/routes\/(book|event|podcast)Routes\.js$/,
        description: 'Backend routes'
      },
      {
        pattern: /src\/server\.js$/,
        description: 'Server route registration',
        checkContent: (content) => {
          return content.includes('bookRoutes') || 
                 content.includes('eventRoutes') || 
                 content.includes('podcastRoutes');
        }
      },
      {
        pattern: /src\/app\/admindashboard\/page\.tsx$/,
        description: 'Admin dashboard navigation cards',
        checkContent: (content) => {
          return content.includes('Manage Books') || 
                 content.includes('Manage Events') || 
                 content.includes('Manage Podcasts');
        }
      }
    ]
  },
  partnerManagement: {
    name: 'Partner Management',
    required: [
      {
        pattern: /PartnerForm\.tsx$/,
        description: 'Partner form component'
      },
      {
        pattern: /partnerController\.js$/,
        description: 'Partner controller'
      },
      {
        pattern: /partnerRoutes\.js$/,
        description: 'Partner routes'
      }
    ]
  }
};

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.split('\n').filter(f => f.trim());
  } catch (e) {
    return [];
  }
}

function getModifiedFiles() {
  try {
    const output = execSync('git status --porcelain', { encoding: 'utf8' });
    return output.split('\n')
      .filter(line => line.startsWith(' M'))
      .map(line => line.substring(3).trim());
  } catch (e) {
    return [];
  }
}

function detectActiveFeatures(stagedFiles) {
  const activeFeatures = [];
  
  for (const [key, feature] of Object.entries(FEATURE_PATTERNS)) {
    const matchedFiles = stagedFiles.filter(file => 
      feature.required.some(req => req.pattern.test(file))
    );
    
    if (matchedFiles.length > 0) {
      activeFeatures.push({ key, feature, matchedFiles });
    }
  }
  
  return activeFeatures;
}

function checkFeatureCompleteness(feature, stagedFiles, modifiedFiles) {
  const issues = [];
  const warnings = [];
  
  for (const requirement of feature.required) {
    const stagedMatch = stagedFiles.find(f => requirement.pattern.test(f));
    const modifiedMatch = modifiedFiles.find(f => requirement.pattern.test(f));
    
    if (!stagedMatch && modifiedMatch) {
      issues.push({
        type: 'unstaged',
        description: requirement.description,
        file: modifiedMatch
      });
    } else if (!stagedMatch && !modifiedMatch) {
      // Check if this is a critical requirement
      if (requirement.description.includes('route registration') || 
          requirement.description.includes('navigation')) {
        warnings.push({
          type: 'missing',
          description: requirement.description
        });
      }
    } else if (stagedMatch && requirement.checkContent) {
      // Check content requirements
      try {
        const content = fs.readFileSync(stagedMatch, 'utf8');
        if (!requirement.checkContent(content)) {
          warnings.push({
            type: 'content',
            description: `${requirement.description} may be incomplete`,
            file: stagedMatch
          });
        }
      } catch (e) {
        // File doesn't exist yet or can't be read
      }
    }
  }
  
  return { issues, warnings };
}

function main() {
  console.log('\n🔍 Feature Completeness Check');
  console.log('================================\n');
  
  const stagedFiles = getStagedFiles();
  const modifiedFiles = getModifiedFiles();
  
  if (stagedFiles.length === 0) {
    console.log('ℹ️  No files staged for commit');
    return 0;
  }
  
  const activeFeatures = detectActiveFeatures(stagedFiles);
  
  if (activeFeatures.length === 0) {
    console.log('✅ No feature patterns detected - proceeding');
    return 0;
  }
  
  let hasErrors = false;
  
  for (const { key, feature, matchedFiles } of activeFeatures) {
    console.log(`📦 Detected Feature: ${feature.name}`);
    console.log(`   Staged files: ${matchedFiles.length}`);
    
    const { issues, warnings } = checkFeatureCompleteness(
      feature, 
      stagedFiles, 
      modifiedFiles
    );
    
    if (issues.length > 0) {
      hasErrors = true;
      console.log('\n   🚨 CRITICAL ISSUES:');
      for (const issue of issues) {
        if (issue.type === 'unstaged') {
          console.log(`      ❌ ${issue.description} is modified but not staged`);
          console.log(`         File: ${issue.file}`);
          console.log(`         Fix: git add ${issue.file}`);
        }
      }
    }
    
    if (warnings.length > 0) {
      console.log('\n   ⚠️  WARNINGS:');
      for (const warning of warnings) {
        if (warning.type === 'missing') {
          console.log(`      ⚠️  ${warning.description} might be missing`);
        } else if (warning.type === 'content') {
          console.log(`      ⚠️  ${warning.description}`);
          console.log(`         File: ${warning.file}`);
        }
      }
    }
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('   ✅ Feature appears complete');
    }
    
    console.log('');
  }
  
  if (hasErrors) {
    console.log('❌ Feature completeness check failed!');
    console.log('   Some related files are modified but not staged.');
    console.log('   This often causes features to break in production.\n');
    console.log('To override: SKIP_FEATURE_CHECK=true git push\n');
    return 1;
  }
  
  console.log('✅ Feature completeness check passed\n');
  return 0;
}

// Run if called directly
if (require.main === module) {
  process.exit(main());
}

module.exports = { detectActiveFeatures, checkFeatureCompleteness };