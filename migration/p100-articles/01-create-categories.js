#!/usr/bin/env node
/**
 * Phase A: Create the category hierarchy on the new P100 site.
 *
 * Idempotent — running multiple times is safe (skips existing terms by slug).
 *
 * Creates:
 *   1. Top-level industry pillars (Home Improvement, Home Services, Outdoor Living,
 *      Partners, Manufacturers) as `category` taxonomy parents
 *   2. Service subcategories under HI/HS/OL (pulled from rankings DB via prod queries)
 *   3. Theme tags (Leadership, Identity, Legacy)
 *   4. Function tags (8 IC pillars)
 *   5. Content type tags (existing 6)
 *
 * Partners and Manufacturers subcategories are DEFERRED — see project_pillar_restructure_2026_04_10.md
 *
 * Usage:
 *   node 01-create-categories.js --dry-run    # Show what would be created
 *   node 01-create-categories.js              # Actually create
 */
const config = require('./config');
const { WpCli } = require('./lib/wp-cli');
const log = require('./lib/logger');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

// ── Hardcoded service categories per pillar (mirrors power_rankings_db.categories) ──
// Source: power_rankings_db.categories joined with pillars (see project_p100_article_migration.md)
// Updated 2026-04-10. If the rankings DB changes, update here too.
const SERVICES = {
  'home-improvement': [
    { name: 'Roofing', slug: 'roofing' },
    { name: 'Windows', slug: 'windows' },
    { name: 'Doors', slug: 'doors' },
    { name: 'Siding', slug: 'siding' },
    { name: 'Gutters', slug: 'gutters' },
    { name: 'Bathroom Remodel', slug: 'bathroom-remodel' },
    { name: 'Kitchen Remodel', slug: 'kitchen-remodel' },
    { name: 'Flooring', slug: 'flooring' },
    { name: 'Attic Insulation', slug: 'attic-insulation' },
    { name: 'Painting', slug: 'painting' },
    { name: 'Drywall', slug: 'drywall' },
    { name: 'Cabinet Installation', slug: 'cabinet-installation' },
    { name: 'Countertops', slug: 'countertops' },
    { name: 'Garage Doors', slug: 'garage-doors' },
  ],
  'home-services': [
    { name: 'HVAC', slug: 'hvac' },
    { name: 'Plumbing', slug: 'plumbing' },
    { name: 'Electrical', slug: 'electrical' },
    { name: 'Water Treatment', slug: 'water-treatment' },
    { name: 'Security', slug: 'security' },
    { name: 'Smart Home', slug: 'smart-home' },
  ],
  'outdoor-living': [
    { name: 'Decks', slug: 'decks' },
    { name: 'Pools', slug: 'pools' },
    { name: 'Fence', slug: 'fence' },
    { name: 'Hardscapes', slug: 'hardscapes' },
    { name: 'Landscaping', slug: 'landscaping' },
    { name: 'Patios', slug: 'patios' },
    { name: 'Pergolas', slug: 'pergolas' },
    { name: 'Outdoor Kitchens', slug: 'outdoor-kitchens' },
    { name: 'Driveways', slug: 'driveways' },
    { name: 'Pavers', slug: 'pavers' },
    { name: 'Concrete Coatings', slug: 'concrete-coatings' },
    { name: 'Retaining Walls', slug: 'retaining-walls' },
    { name: 'Docks', slug: 'docks' },
  ],
  // Partners & Manufacturers subcategories deferred until user/Greg lock the structure
};

async function main() {
  log.header(`Phase A: Create Category Hierarchy${DRY_RUN ? ' (DRY RUN)' : ''}`);

  const wp = new WpCli();
  const categoryMap = {};  // slug → term ID, persisted to state

  // ── 1. Top-level pillars ──
  log.section('1. Industry pillar parents (category taxonomy)');
  for (const pillar of config.CATEGORIES.PILLARS) {
    const existing = wp.getTermId('category', pillar.slug);
    if (existing) {
      log.ok(`Pillar exists: ${pillar.name} (#${existing})`);
      categoryMap[pillar.slug] = existing;
      continue;
    }
    if (DRY_RUN) {
      log.info(`Would create pillar: ${pillar.name} → /category/${pillar.slug}/`);
      categoryMap[pillar.slug] = '(dry-run)';
      continue;
    }
    const id = wp.ensureTerm('category', pillar);
    log.ok(`Created pillar: ${pillar.name} (#${id})`);
    categoryMap[pillar.slug] = id;
  }

  // ── 2. Service subcategories under HI/HS/OL ──
  log.section('2. Service subcategories under industry pillars');
  for (const [pillarSlug, services] of Object.entries(SERVICES)) {
    const parentId = categoryMap[pillarSlug];
    if (!parentId || parentId === '(dry-run)') {
      if (!DRY_RUN) {
        log.warn(`No parent ID for ${pillarSlug} — skipping its services`);
        continue;
      }
    }
    for (const service of services) {
      const existing = wp.getTermId('category', service.slug);
      if (existing) {
        log.ok(`  Service exists: ${pillarSlug}/${service.slug} (#${existing})`);
        categoryMap[service.slug] = existing;
        continue;
      }
      if (DRY_RUN) {
        log.info(`  Would create: ${pillarSlug}/${service.name} → /category/${pillarSlug}/${service.slug}/`);
        categoryMap[service.slug] = '(dry-run)';
        continue;
      }
      const id = wp.ensureTerm('category', {
        name: service.name,
        slug: service.slug,
        parent: parentId,
      });
      log.ok(`  Created: ${pillarSlug}/${service.name} (#${id})`);
      categoryMap[service.slug] = id;
    }
  }

  // ── 3. Theme tags (post_tag taxonomy) ──
  log.section('3. Theme tags');
  for (const theme of config.CATEGORIES.THEMES) {
    const slug = `theme-${slugify(theme)}`;
    const existing = wp.getTermId('post_tag', slug);
    if (existing) {
      log.ok(`Theme exists: ${theme} (#${existing})`);
      continue;
    }
    if (DRY_RUN) {
      log.info(`Would create theme tag: ${theme} → /tag/${slug}/`);
      continue;
    }
    const id = wp.ensureTerm('post_tag', { name: theme, slug });
    log.ok(`Created theme: ${theme} (#${id})`);
  }

  // ── 4. Function tags (post_tag taxonomy, prefixed to disambiguate) ──
  log.section('4. Function tags (mirrors IC pillars)');
  for (const fn of config.CATEGORIES.FUNCTIONS) {
    const slug = `function-${slugify(fn)}`;
    const existing = wp.getTermId('post_tag', slug);
    if (existing) {
      log.ok(`Function exists: ${fn} (#${existing})`);
      continue;
    }
    if (DRY_RUN) {
      log.info(`Would create function tag: ${fn} → /tag/${slug}/`);
      continue;
    }
    const id = wp.ensureTerm('post_tag', { name: fn, slug });
    log.ok(`Created function: ${fn} (#${id})`);
  }

  // ── 5. Content type tags ──
  log.section('5. Content type tags');
  for (const type of config.CATEGORIES.CONTENT_TYPES) {
    const slug = `type-${slugify(type)}`;
    const existing = wp.getTermId('post_tag', slug);
    if (existing) {
      log.ok(`Type exists: ${type} (#${existing})`);
      continue;
    }
    if (DRY_RUN) {
      log.info(`Would create type tag: ${type} → /tag/${slug}/`);
      continue;
    }
    const id = wp.ensureTerm('post_tag', { name: type, slug });
    log.ok(`Created type: ${type} (#${id})`);
  }

  // ── Persist category map for later phases ──
  if (!DRY_RUN) {
    fs.mkdirSync(config.STATE.DIR, { recursive: true });
    fs.writeFileSync(config.STATE.CATEGORY_MAP, JSON.stringify(categoryMap, null, 2));
    log.ok(`Category map saved → ${config.STATE.CATEGORY_MAP}`);
  }

  log.header('Phase A complete');
  if (DRY_RUN) log.info('DRY RUN — re-run without --dry-run to apply changes');
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

main().catch(err => {
  log.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
