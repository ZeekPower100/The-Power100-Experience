#!/usr/bin/env node
/**
 * Manual enrichment of the 4 remaining sample contributors (excluding Abby).
 * One-shot runner. Idempotent — re-fires upsert with the rich payload.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { query } = require('../../tpe-backend/src/config/database');
const enrich = require('../../tpe-backend/src/services/contributorEnrichmentService');

const data = [
  {
    id: 26, name: 'Adam Lindus',
    fields: {
      title_position: 'Owner, Lindus Construction & ContractorFlow',
      hero_quote: 'First Time Quality. Treat employees like family. Treat homeowners the same.',
      bio: "Adam Lindus is one of three brothers — alongside Andy and Alex — leading the second generation of Lindus Construction, the family business founded in 1979 by parents Kevin and Emily Lindus. Headquartered in Baldwin, Wisconsin, Lindus has grown from two employees to over 150 and completed home improvement projects for 100,000+ customers across the Twin Cities metro and Western Wisconsin. In 2017 Adam founded ContractorFlow, a SaaS platform built specifically for contractors to streamline operations, learning that every operational pain point Lindus faced was almost certainly being faced by every other contractor in the country. Today he splits his time between running Lindus alongside his brothers and scaling ContractorFlow to the broader home improvement industry.",
      credentials: 'Owner, Lindus Construction (2nd generation)\nFounder & Owner, ContractorFlow App\nSecond-generation home improvement leader\nBaldwin, WI based — Twin Cities metro + Western WI\n100,000+ customer projects completed\nGrew family business from 2 to 150+ employees',
      expertise_topics: 'Multi-Generational Family Business Leadership\nContractor Operations Software\nHome Improvement SaaS\nScaling Family-Owned Businesses\nWindows, Siding & Gutters Operations\nMidwest Regional Construction',
      recognition: '🏗️ | 2nd-generation owner of 45+ year family business\n💻 | Founded ContractorFlow SaaS for the contracting industry\n👥 | Helped grow Lindus from 2 to 150+ employees\n🏆 | Lindus Construction featured in major industry publications\n🌟 | Sibling co-leader alongside Andy & Alex Lindus\n📈 | 100,000+ customer projects completed',
      company_description: "Lindus Construction was founded in 1979 by Kevin and Emily Lindus and is now run by their three sons — Andy, Adam, and Alex. Headquartered in Baldwin, Wisconsin, the company has grown from two employees to over 150 and completed projects for more than 100,000 customers throughout the Twin Cities metro and Western Wisconsin. Services include residential construction, remodeling, windows, siding, and gutters. The Lindus brothers also run ContractorFlow, a SaaS platform built for contractors.",
      geographic_reach: 'MN/WI Metro',
      website_url: 'https://lindusconstruction.com',
      linkedin_url: 'https://www.linkedin.com/in/adam-lindus',
      ec_stat_custom_label: 'Customers Served', ec_stat_custom_value: '100,000+',
      stat_years: '1979', // company founding
      scores: ['Operations & Technology | 9.5','Multi-Generational Leadership | 9.4','SaaS Product Vision | 9.3','Construction Management | 9.2','Family Business Continuity | 9.6','Scaling Operations | 9.0'].join('\n'),
      testimonials: '[]',
    },
  },
  {
    id: 27, name: 'Alex Lindus',
    fields: {
      title_position: 'Owner Lindus Construction / Midwest LeafGuard® · CEO ContractorFlow',
      hero_quote: 'When you treat employees like family, you build a company customers can trust the first time and every time.',
      bio: "Alex Lindus is the second-generation owner of Lindus Construction and Midwest LeafGuard®, alongside brothers Andy and Adam. The Lindus family business was founded by parents Kevin and Emily in 1979 and has grown from two employees to over 150, completing home improvement projects for 100,000+ customers across the Twin Cities metro and Western Wisconsin. In 2020 Alex was named Wisconsin Builders Association's Builder of the Year. He also serves as CEO of ContractorFlow, the contractor operations SaaS platform launched out of Lindus's own operational learnings. Alex's leadership philosophy mirrors his parents': treat employees like family and make 'First Time Quality' the only acceptable standard.",
      credentials: '2020 Wisconsin Builders Association Builder of the Year\nOwner, Lindus Construction (2nd generation)\nOwner, Midwest LeafGuard®\nCEO, ContractorFlow App\nGrew family business from 2 to 150+ employees\nBaldwin, WI based — MN/WI service area',
      expertise_topics: 'Family Business Leadership\nLeafGuard Gutter Systems\nResidential Construction Excellence\nFirst Time Quality Methodology\nContractor Operations Software\nMidwest Construction Industry',
      recognition: '🏆 | 2020 Wisconsin Builders Association Builder of the Year\n🏗️ | 2nd-generation owner of 45+ year family business\n💻 | CEO of ContractorFlow SaaS\n🛡️ | Owner of Midwest LeafGuard® franchise\n👥 | Helped grow Lindus from 2 to 150+ employees\n📈 | 100,000+ customer projects completed',
      company_description: 'Lindus Construction (founded 1979 by Kevin & Emily Lindus) is now in its second generation, run by sons Andy, Adam, and Alex. Headquartered in Baldwin, WI, the company serves Twin Cities metro and Western Wisconsin with residential construction, remodeling, windows, siding, gutters, and Midwest LeafGuard® gutter systems. 150+ employees, 100,000+ customer projects.',
      geographic_reach: 'MN/WI Metro',
      website_url: 'https://lindusconstruction.com',
      linkedin_url: 'https://www.linkedin.com/in/alex-lindus-7a2394216',
      ec_stat_custom_label: 'Builder of the Year', ec_stat_custom_value: '2020 WI',
      stat_years: '1979',
      scores: ['Construction Leadership | 9.5','Family Business Stewardship | 9.5','Operational Excellence | 9.4','Industry Recognition | 9.3','Brand Building (LeafGuard) | 9.2','SaaS Strategy (ContractorFlow) | 9.0'].join('\n'),
      testimonials: '[]',
    },
  },
  {
    id: 28, name: 'Alex Marck',
    fields: {
      title_position: 'CEO, First Call Closer · Co-Founder, Modern Kitchens USA',
      hero_quote: 'Every sales call is a first call. Make it count.',
      bio: "Alex Marck is CEO of First Call Closer, a sales training company helping home improvement contractors close more deals on the first call without high-pressure tactics. Based in Chicago, Alex's team of experienced home improvement marketers builds custom sales presentations and methodologies for clients across the country. He launched the 1st Call Closer Podcast in 2024, where he and guests dissect real recordings of in-home sales appointments to teach what works (and what doesn't). In 2024 Alex co-founded Modern Kitchens USA | Plank'd, expanding his reach from sales training into operating his own home improvement brand. His philosophy: respect the homeowner's time, lead with value, and turn every appointment into a closeable conversation.",
      credentials: 'CEO, First Call Closer (sales training for home improvement)\nCo-Founder, Modern Kitchens USA | Plankd (2024)\nHost, 1st Call Closer Podcast (launched 2024)\nChicago, IL based\nMultiple home improvement industry roles spanning 6+ companies\nSpecialist in one-call-close sales methodology',
      expertise_topics: 'In-Home Sales Methodology\nFirst-Call Close Technique\nHome Improvement Sales Training\nNo-Pressure Sales Frameworks\nSales Team Development\nSales Coaching & Podcasting',
      recognition: '🎙️ | Host of 1st Call Closer Podcast (launched 2024)\n🎤 | Featured speaker on home improvement sales\n💼 | CEO of nationally-recognized sales training company\n🏠 | Co-Founder of Modern Kitchens USA | Plankd (2024)\n📈 | Custom sales presentations built for clients nationwide\n🌟 | Industry voice on no-pressure first-call closing',
      company_description: 'First Call Closer is a sales training and consulting company focused on helping home improvement contractors close more deals on the first in-home appointment. Custom presentations, sales coaching, and the 1st Call Closer Podcast — all dedicated to making the first call the only call needed.',
      geographic_reach: 'National (Chicago HQ)',
      website_url: 'https://firstcallcloser.com',
      linkedin_url: 'https://www.linkedin.com/in/alex-marck',
      ec_stat_custom_label: 'Companies Founded', ec_stat_custom_value: '3+',
      stat_years: '15+',
      scores: ['Sales Training & Methodology | 9.6','First-Call Close Mastery | 9.7','Podcasting & Thought Leadership | 9.4','Home Improvement Industry Expertise | 9.3','Sales Team Development | 9.2','Entrepreneurship & Brand Building | 9.0'].join('\n'),
      testimonials: '[]',
    },
  },
  {
    id: 29, name: 'Alexander Keyles',
    fields: {
      title_position: 'Managing Partner NYC Office, PJ Fitzpatrick',
      hero_quote: 'Dedication, trust, and customer-first service — that is the only way home improvement gets done right.',
      bio: "Alexander Keyles is Managing Partner of the NYC office of PJ Fitzpatrick, one of the nation's leading home improvement companies. He joined PJ Fitzpatrick in November 2024 following the acquisition of Bathroom Buddy Remodeling — a Long Island stalwart known for premium bathroom renovations — which Alexander co-led alongside John Huxtable. The acquisition, completed in May 2025, was described as an industry-defining move that set PJ Fitzpatrick to transform the regional New York market and elevate service standards across Long Island. Alexander now leads PJ Fitzpatrick's NYC operations, bringing a customer-first service philosophy and operational discipline that earned Bathroom Buddy its reputation as a premium remodeling brand.",
      credentials: 'Managing Partner NYC Office, PJ Fitzpatrick\nFormer Co-Leader, Bathroom Buddy Remodeling (acquired 2025)\nNew York / Long Island home improvement market\nAcquisition completed May 2025\nPremium bathroom renovation specialist\n6+ leadership roles across home improvement industry',
      expertise_topics: 'Premium Bathroom Renovations\nLong Island & NYC Home Improvement Market\nBusiness Acquisitions & Integration\nCustomer-First Service Operations\nRegional Market Expansion\nBathroom Remodeling Excellence',
      recognition: '🤝 | 2025 acquisition of Bathroom Buddy by PJ Fitzpatrick\n🏆 | Built Bathroom Buddy into Long Island premium brand\n🌆 | Managing Partner of PJ Fitzpatrick NYC office\n🏠 | Premium bathroom renovation specialist\n📍 | Leading PJ PJ Fitzpatricks expansion into NYC market\n⭐ | Industry-defining acquisition partner',
      company_description: 'PJ Fitzpatrick is one of the nation is leading home improvement companies, recently expanding its Northeast footprint into the NYC and Long Island markets via the May 2025 acquisition of Bathroom Buddy Remodeling. Known for premium bathroom renovations, the NYC office now operates under Alexander Keyles leadership.',
      geographic_reach: 'NYC + Long Island',
      website_url: 'https://www.pjfitz.com',
      linkedin_url: 'https://www.linkedin.com/in/alexander-keyles-076962135',
      ec_stat_custom_label: 'Acquisition', ec_stat_custom_value: 'May 2025',
      stat_years: '10+',
      scores: ['Bathroom Remodeling Operations | 9.5','M&A and Business Integration | 9.4','Premium Brand Development | 9.5','NYC/Long Island Market Knowledge | 9.6','Customer Experience Leadership | 9.3','Multi-Site Operations | 9.0'].join('\n'),
      testimonials: '[]',
    },
  },
];

(async () => {
  for (const c of data) {
    const f = c.fields;
    await query(
      `UPDATE expert_contributors SET
         title_position=$1, hero_quote=$2, bio=$3, credentials=$4, expertise_topics=$5,
         recognition=$6, company_description=$7, geographic_reach=$8, website_url=$9, linkedin_url=$10,
         years_in_industry=$11, testimonials=$12::jsonb, updated_at=NOW()
       WHERE id=$13`,
      [
        f.title_position, f.hero_quote, f.bio, f.credentials, f.expertise_topics,
        f.recognition, f.company_description, f.geographic_reach, f.website_url, f.linkedin_url,
        f.stat_years, f.testimonials, c.id,
      ]
    );
    const fresh = await query('SELECT * FROM expert_contributors WHERE id=$1', [c.id]);
    const row = fresh.rows[0];
    row.ec_stat_custom_label = f.ec_stat_custom_label;
    row.ec_stat_custom_value = f.ec_stat_custom_value;
    row.scores = f.scores;
    const r = await enrich.upsertContributorLander(row, { source: 'manual_enrichment_sample' });
    console.log(`✓ ${c.name}: ${r.action} → ${r.wp_page_url}`);
  }
  process.exit(0);
})().catch(e => { console.error('ERR:', e.message); process.exit(1); });
