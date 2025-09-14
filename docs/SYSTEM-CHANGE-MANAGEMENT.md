# 🔄 System Change Management Protocol
*Ensuring Complete Alignment When Adding, Modifying, or Removing System Components*

---

## 📋 Overview

This document provides structured protocols and automated tools to ensure that changes to core system components are properly propagated across the entire codebase, preventing broken functionality and maintaining system integrity.

---

## 🎯 Core Principles

1. **No Orphaned Code** - Every change must update all dependent components
2. **Automated Validation** - Scripts verify completeness of changes
3. **Change Templates** - Standardized patterns for common modifications
4. **Impact Analysis** - Understand ripple effects before making changes
5. **Rollback Ready** - Every change must be reversible

---

## 📊 Component Dependency Map - ACTUAL PROJECT STRUCTURE

### Matching Entity Addition Checklist (e.g., adding "webinars")
Based on our ACTUAL file structure:

```
MATCHING ENTITY ADDITION CHECKLIST
├── DATABASE
│   ├── Create new entity table (webinars)
│   ├── Add to entity_ai_tags for tagging support
│   ├── Add to matching results tables
│   └── Update indexes
│
├── BACKEND (tpe-backend/)
│   ├── Controllers (src/controllers/)
│   │   ├── webinarController.js (NEW)
│   │   └── matchingController.js (UPDATE - add webinar matching)
│   ├── Routes (src/routes/)
│   │   ├── webinarRoutes.js (NEW)
│   │   └── matchingRoutes.js (UPDATE - add webinar endpoint)
│   ├── Services (src/services/)
│   │   └── enhancedMatchingService.js (UPDATE - add matchWebinar function)
│   ├── Server Registration
│   │   └── src/server.js (UPDATE - register webinar routes)
│   └── Database Config (src/config/)
│       └── May need to update if using models
│
├── FRONTEND (tpe-front-end/)
│   ├── Types (src/lib/types/)
│   │   └── webinar.ts (NEW)
│   ├── API Client (src/lib/)
│   │   └── api.ts (UPDATE - add webinarApi section)
│   ├── Components (src/components/)
│   │   └── admin/
│   │       └── WebinarForm.tsx (NEW)
│   ├── Admin Pages (src/app/admindashboard/)
│   │   └── webinars/
│   │       └── page.tsx (NEW)
│   └── Utils (src/utils/)
│       └── May need updates for validation/formatting
│
├── AI PROCESSING
│   ├── Auto-tagging prompts for webinars
│   ├── Analysis pipeline configuration
│   └── Relevance scoring adjustments
│
└── DOCUMENTATION
    ├── Update API documentation
    ├── Update database schema docs
    └── Update CLAUDE.md if needed
```

---

## 🤖 Automated Change Management Tools

### 1. Change Impact Analyzer (Corrected Paths)
```javascript
// tools/analyze-change-impact.js

const fs = require('fs');
const path = require('path');

class ChangeImpactAnalyzer {
  constructor() {
    this.dependencies = {
      'matching_entity': {
        database: [
          'tpe-database/migrations/create_{entity}_table.sql'
        ],
        backend: [
          'tpe-backend/src/controllers/{entity}Controller.js',
          'tpe-backend/src/controllers/matchingController.js',
          'tpe-backend/src/routes/{entity}Routes.js',
          'tpe-backend/src/routes/matchingRoutes.js',
          'tpe-backend/src/services/enhancedMatchingService.js',
          'tpe-backend/src/server.js'
        ],
        frontend: [
          'tpe-front-end/src/lib/types/{entity}.ts',
          'tpe-front-end/src/lib/api.ts',
          'tpe-front-end/src/components/admin/{Entity}Form.tsx',
          'tpe-front-end/src/app/admindashboard/{entity}s/page.tsx'
        ],
        tests: [
          'tests/api/{entity}.test.js',
          'tests/matching/{entity}Matching.test.js'
        ]
      },
      'focus_area': {
        backend: [
          'tpe-backend/src/services/enhancedMatchingService.js'
        ],
        frontend: [
          'tpe-front-end/src/app/contractorflow/page.tsx'
        ]
      },
      'api_endpoint': {
        backend: [
          'tpe-backend/src/routes/{route}.js',
          'tpe-backend/src/controllers/{controller}.js',
          'tpe-backend/src/server.js'
        ],
        frontend: [
          'tpe-front-end/src/lib/api.ts'
        ],
        documentation: [
          'docs/API.md'
        ]
      }
    };
  }

  analyzeChange(changeType, entityName) {
    const impactedFiles = this.dependencies[changeType];
    const report = {
      changeType,
      entity: entityName,
      requiredFiles: [],
      existingFiles: [],
      missingFiles: [],
      suggestedActions: []
    };

    // Check each required file pattern
    Object.entries(impactedFiles).forEach(([category, files]) => {
      files.forEach(filePattern => {
        const actualPath = filePattern.replace(/{entity}/g, entityName.toLowerCase())
                                     .replace(/{Entity}/g, this.capitalize(entityName));
        
        report.requiredFiles.push({
          category,
          path: actualPath,
          exists: fs.existsSync(path.join(process.cwd(), actualPath))
        });

        if (!fs.existsSync(path.join(process.cwd(), actualPath))) {
          report.missingFiles.push(actualPath);
          report.suggestedActions.push(`Create file: ${actualPath}`);
        } else {
          report.existingFiles.push(actualPath);
        }
      });
    });

    // Check for references in existing files
    this.checkExistingReferences(entityName, report);
    
    return report;
  }

  checkExistingReferences(entityName, report) {
    // Check if entity is referenced in key files
    const keyFiles = [
      'tpe-backend/src/services/enhancedMatchingService.js',
      'tpe-backend/src/controllers/matchingController.js',
      'tpe-backend/src/server.js',
      'tpe-front-end/src/lib/api.ts'
    ];

    keyFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content.includes(entityName)) {
          report.suggestedActions.push(`Add ${entityName} to ${file}`);
        }
      }
    });
  }

  generateChangeScript(changeType, entityName) {
    const report = this.analyzeChange(changeType, entityName);
    
    // Generate shell script to create missing files
    let script = `#!/bin/bash\n\n`;
    script += `# Auto-generated change script for adding ${entityName}\n\n`;
    
    report.missingFiles.forEach(file => {
      const dir = path.dirname(file);
      script += `mkdir -p ${dir}\n`;
      script += `touch ${file}\n`;
      script += `echo "// TODO: Implement ${entityName} logic" > ${file}\n\n`;
    });
    
    return script;
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Usage
const analyzer = new ChangeImpactAnalyzer();
const report = analyzer.analyzeChange('matching_entity', 'webinar');
console.log(JSON.stringify(report, null, 2));
```

### 2. Component Generator (Corrected for Our Structure)
```javascript
// tools/generate-component.js

const fs = require('fs');
const path = require('path');

class ComponentGenerator {
  generateMatchingEntity(entityName, options = {}) {
    const entity = entityName.toLowerCase();
    const Entity = this.capitalize(entityName);
    
    const templates = {
      // Database Migration
      migration: `
-- Create ${entity}s table
CREATE TABLE ${entity}s (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  host VARCHAR(255),
  date DATE,
  time TIME,
  duration_minutes INTEGER,
  registration_url TEXT,
  recording_url TEXT,
  
  -- Matching Fields
  topics TEXT[],
  focus_areas_covered TEXT[],
  revenue_range_fit TEXT[],
  target_audience TEXT,
  
  -- AI Fields
  ai_summary TEXT,
  ai_tags TEXT[],
  ai_insights JSONB,
  ai_quality_score DECIMAL(3,2),
  
  -- Standard Fields
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX idx_${entity}s_active ON ${entity}s(is_active);
CREATE INDEX idx_${entity}s_date ON ${entity}s(date);
CREATE INDEX idx_${entity}s_focus_areas ON ${entity}s USING GIN(focus_areas_covered);
`,

      // Backend Controller (matching our style)
      controller: `
const db = require('../config/database');

// Get all ${entity}s
exports.getAll${Entity}s = async (req, res) => {
  try {
    const query = 'SELECT * FROM ${entity}s WHERE is_active = true ORDER BY date DESC';
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching ${entity}s:', error);
    res.status(500).json({ error: 'Failed to fetch ${entity}s' });
  }
};

// Get single ${entity}
exports.get${Entity} = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM ${entity}s WHERE id = $1';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '${Entity} not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching ${entity}:', error);
    res.status(500).json({ error: 'Failed to fetch ${entity}' });
  }
};

// Create ${entity}
exports.create${Entity} = async (req, res) => {
  try {
    const {
      name, title, description, host, date, time, duration_minutes,
      registration_url, topics, focus_areas_covered, revenue_range_fit
    } = req.body;
    
    const query = \`
      INSERT INTO ${entity}s (
        name, title, description, host, date, time, duration_minutes,
        registration_url, topics, focus_areas_covered, revenue_range_fit
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    \`;
    
    const values = [
      name, title, description, host, date, time, duration_minutes,
      registration_url, topics, focus_areas_covered, revenue_range_fit
    ];
    
    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ${entity}:', error);
    res.status(500).json({ error: 'Failed to create ${entity}' });
  }
};

// Update ${entity}
exports.update${Entity} = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      updateFields.push(\`\${key} = $\${paramCount}\`);
      values.push(value);
      paramCount++;
    });
    
    values.push(id);
    
    const query = \`
      UPDATE ${entity}s 
      SET \${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $\${paramCount}
      RETURNING *
    \`;
    
    const result = await db.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '${Entity} not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ${entity}:', error);
    res.status(500).json({ error: 'Failed to update ${entity}' });
  }
};

// Delete ${entity}
exports.delete${Entity} = async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM ${entity}s WHERE id = $1 RETURNING id';
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '${Entity} not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ${entity}:', error);
    res.status(500).json({ error: 'Failed to delete ${entity}' });
  }
};
`,

      // Backend Routes (matching our style)
      routes: `
const express = require('express');
const router = express.Router();
const ${entity}Controller = require('../controllers/${entity}Controller');
const { protect } = require('../middleware/auth');

// All ${entity} routes require authentication
router.use(protect);

// Get all ${entity}s
router.get('/', ${entity}Controller.getAll${Entity}s);

// Get single ${entity}
router.get('/:id', ${entity}Controller.get${Entity});

// Create new ${entity}
router.post('/', ${entity}Controller.create${Entity});

// Update ${entity}
router.put('/:id', ${entity}Controller.update${Entity});

// Delete ${entity}
router.delete('/:id', ${entity}Controller.delete${Entity});

module.exports = router;
`,

      // Matching Service Addition
      matchingAddition: `
// Add this function to enhancedMatchingService.js

async function match${Entity}(contractor) {
  try {
    // Parse contractor focus areas
    let contractorFocusAreas = contractor.focus_areas || [];
    if (typeof contractorFocusAreas === 'string') {
      try {
        contractorFocusAreas = JSON.parse(contractorFocusAreas);
      } catch (e) {
        contractorFocusAreas = [];
      }
    }
    
    // Get ${entity}s that match contractor's focus areas and revenue range
    const query = \`
      SELECT 
        id, name, title, description, host, date, time,
        registration_url, topics, focus_areas_covered,
        revenue_range_fit, ai_summary
      FROM ${entity}s
      WHERE is_active = true
      AND date >= CURRENT_DATE
      AND (
        focus_areas_covered && $1
        OR revenue_range_fit @> ARRAY[$2]
      )
      ORDER BY date ASC
      LIMIT 3
    \`;
    
    const result = await db.query(query, [
      contractorFocusAreas,
      contractor.revenue_range || 'unknown'
    ]);
    
    // Calculate match scores
    const ${entity}s = result.rows.map(${entity} => {
      let score = 0;
      
      // Parse ${entity} focus areas
      let ${entity}FocusAreas = ${entity}.focus_areas_covered || [];
      if (typeof ${entity}FocusAreas === 'string') {
        try {
          ${entity}FocusAreas = JSON.parse(${entity}FocusAreas);
        } catch (e) {
          ${entity}FocusAreas = [];
        }
      }
      
      // Calculate overlap score
      contractorFocusAreas.forEach(area => {
        if (${entity}FocusAreas.includes(area)) {
          score += 30;
        }
      });
      
      // Revenue range match
      const revenueRangeFit = ${entity}.revenue_range_fit || [];
      if (revenueRangeFit.includes(contractor.revenue_range)) {
        score += 20;
      }
      
      return {
        ...${entity},
        type: '${entity}',
        matchScore: score,
        matchReason: \`Relevant ${entity} for your focus areas\`
      };
    });
    
    return ${entity}s.filter(w => w.matchScore > 0)
                     .sort((a, b) => b.matchScore - a.matchScore);
                     
  } catch (error) {
    console.error('Error matching ${entity}s:', error);
    return [];
  }
}

// Add to the main getMatchedPartners function:
const ${entity}Matches = await match${Entity}(modifiedContractor);

// Add to the return object:
${entity}s: ${entity}Matches.slice(0, 1), // Top ${entity}
`,

      // Update to matchingController.js
      matchingControllerUpdate: `
// Add this to matchingController.js in the getMatchedContent function

// Get matched ${entity}s
const ${entity}sQuery = \`
  SELECT id, name, title, description, host, date, time,
         registration_url, topics, focus_areas_covered,
         revenue_range_fit
  FROM ${entity}s 
  WHERE is_active = true
  AND date >= CURRENT_DATE
  ORDER BY date ASC
\`;
const ${entity}sResult = await db.query(${entity}sQuery);
const ${entity}s = ${entity}sResult.rows.map(${entity} => ({
  ...${entity},
  type: '${entity}',
  matchScore: calculateMatchScore(${entity}.focus_areas_covered)
})).filter(${entity} => ${entity}.matchScore > 0)
  .sort((a, b) => b.matchScore - a.matchScore)
  .slice(0, 1); // Get top ${entity}

// Add to the matches object:
${entity}: ${entity}s[0] || null,
`,

      // Frontend Types
      types: `
// ${entity}.ts

export interface ${Entity} {
  id: number;
  name: string;
  title: string;
  description: string;
  host: string;
  date: string;
  time: string;
  durationMinutes: number;
  registrationUrl?: string;
  recordingUrl?: string;
  
  // Matching fields
  topics: string[];
  focusAreasCovered: string[];
  revenueRangeFit: string[];
  targetAudience?: string;
  
  // AI fields
  aiSummary?: string;
  aiTags?: string[];
  aiInsights?: any;
  aiQualityScore?: number;
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ${Entity}FormData {
  name: string;
  title: string;
  description: string;
  host: string;
  date: string;
  time: string;
  durationMinutes: number;
  registrationUrl?: string;
  topics: string[];
  focusAreasCovered: string[];
  revenueRangeFit: string[];
}
`,

      // Frontend API Addition
      apiAddition: `
// Add to api.ts

// ${Entity} API
export const ${entity}Api = {
  // Get all ${entity}s
  getAll: () => apiRequest('/${entity}s'),
  
  // Get single ${entity}
  getById: (id: string) => apiRequest(\`/${entity}s/\${id}\`),
  
  // Create ${entity} (admin)
  create: (data: ${Entity}FormData) => apiRequest('/${entity}s', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Update ${entity} (admin)
  update: (id: string, data: Partial<${Entity}FormData>) => 
    apiRequest(\`/${entity}s/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  // Delete ${entity} (admin)
  delete: (id: string) => apiRequest(\`/${entity}s/\${id}\`, {
    method: 'DELETE'
  })
};
`,

      // Frontend Form Component
      form: `
// ${Entity}Form.tsx

import React, { useState } from 'react';
import { ${Entity}FormData } from '@/lib/types/${entity}';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { FOCUS_AREAS, REVENUE_RANGES } from '@/lib/constants';

interface ${Entity}FormProps {
  ${entity}?: ${Entity};
  onSubmit: (data: ${Entity}FormData) => Promise<void>;
  onCancel: () => void;
}

export function ${Entity}Form({ ${entity}, onSubmit, onCancel }: ${Entity}FormProps) {
  const [formData, setFormData] = useState<${Entity}FormData>({
    name: ${entity}?.name || '',
    title: ${entity}?.title || '',
    description: ${entity}?.description || '',
    host: ${entity}?.host || '',
    date: ${entity}?.date || '',
    time: ${entity}?.time || '',
    durationMinutes: ${entity}?.durationMinutes || 60,
    registrationUrl: ${entity}?.registrationUrl || '',
    topics: ${entity}?.topics || [],
    focusAreasCovered: ${entity}?.focusAreasCovered || [],
    revenueRangeFit: ${entity}?.revenueRangeFit || []
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={4}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="host">Host</Label>
          <Input
            id="host"
            value={formData.host}
            onChange={(e) => setFormData({...formData, host: e.target.value})}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({...formData, date: e.target.value})}
            required
          />
        </div>
      </div>

      <div>
        <Label>Focus Areas Covered</Label>
        <MultiSelect
          options={FOCUS_AREAS}
          selected={formData.focusAreasCovered}
          onChange={(selected) => setFormData({...formData, focusAreasCovered: selected})}
        />
      </div>

      <div>
        <Label>Revenue Range Fit</Label>
        <MultiSelect
          options={REVENUE_RANGES}
          selected={formData.revenueRangeFit}
          onChange={(selected) => setFormData({...formData, revenueRangeFit: selected})}
        />
      </div>

      <div className="flex gap-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-power100-green hover:bg-green-600"
        >
          {isSubmitting ? 'Saving...' : ${entity} ? 'Update' : 'Create'} ${Entity}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
`,

      // Admin Page
      adminPage: `
// app/admindashboard/${entity}s/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { ${Entity}Form } from '@/components/admin/${Entity}Form';
import { ${entity}Api } from '@/lib/api';
import { ${Entity} } from '@/lib/types/${entity}';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash } from 'lucide-react';

export default function ${Entity}sManagement() {
  const [${entity}s, set${Entity}s] = useState<${Entity}[]>([]);
  const [selected${Entity}, setSelected${Entity}] = useState<${Entity} | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load${Entity}s();
  }, []);

  const load${Entity}s = async () => {
    try {
      setLoading(true);
      const data = await ${entity}Api.getAll();
      set${Entity}s(data);
    } catch (error) {
      console.error('Failed to load ${entity}s:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelected${Entity}(null);
    setShowForm(true);
  };

  const handleEdit = (${entity}: ${Entity}) => {
    setSelected${Entity}(${entity});
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this ${entity}?')) return;
    
    try {
      await ${entity}Api.delete(id.toString());
      await load${Entity}s();
    } catch (error) {
      console.error('Failed to delete ${entity}:', error);
    }
  };

  const handleSubmit = async (data: ${Entity}FormData) => {
    try {
      if (selected${Entity}) {
        await ${entity}Api.update(selected${Entity}.id.toString(), data);
      } else {
        await ${entity}Api.create(data);
      }
      setShowForm(false);
      await load${Entity}s();
    } catch (error) {
      console.error('Failed to save ${entity}:', error);
    }
  };

  if (showForm) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">
          {selected${Entity} ? 'Edit' : 'Create'} ${Entity}
        </h1>
        <${Entity}Form
          ${entity}={selected${Entity}}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">${Entity}s Management</h1>
        <Button
          onClick={handleCreate}
          className="bg-power100-green hover:bg-green-600"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add ${Entity}
        </Button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid gap-4">
          {${entity}s.map(${entity} => (
            <div key={${entity}.id} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{${entity}.title}</h3>
                  <p className="text-gray-600">{${entity}.host} • {${entity}.date}</p>
                  <p className="mt-2">{${entity}.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(${entity})}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(${entity}.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`
    };

    return templates;
  }

  generateFiles(entityName, outputDir = './generated') {
    const templates = this.generateMatchingEntity(entityName);
    const entity = entityName.toLowerCase();
    const Entity = this.capitalize(entityName);
    
    // Create directory structure matching our project
    const dirs = [
      `${outputDir}/database`,
      `${outputDir}/backend/controllers`,
      `${outputDir}/backend/routes`,
      `${outputDir}/backend/services`,
      `${outputDir}/frontend/types`,
      `${outputDir}/frontend/components/admin`,
      `${outputDir}/frontend/app/admindashboard/${entity}s`
    ];
    
    dirs.forEach(dir => {
      fs.mkdirSync(dir, { recursive: true });
    });
    
    // Write files
    const files = [
      { path: `${outputDir}/database/create_${entity}s_table.sql`, content: templates.migration },
      { path: `${outputDir}/backend/controllers/${entity}Controller.js`, content: templates.controller },
      { path: `${outputDir}/backend/routes/${entity}Routes.js`, content: templates.routes },
      { path: `${outputDir}/backend/services/${entity}Matching_ADD_TO_enhancedMatchingService.js`, content: templates.matchingAddition },
      { path: `${outputDir}/backend/controllers/${entity}_ADD_TO_matchingController.js`, content: templates.matchingControllerUpdate },
      { path: `${outputDir}/frontend/types/${entity}.ts`, content: templates.types },
      { path: `${outputDir}/frontend/components/admin/${Entity}Form.tsx`, content: templates.form },
      { path: `${outputDir}/frontend/app/admindashboard/${entity}s/page.tsx`, content: templates.adminPage },
      { path: `${outputDir}/frontend/lib/${entity}_ADD_TO_api.ts`, content: templates.apiAddition }
    ];
    
    files.forEach(({ path, content }) => {
      fs.writeFileSync(path, content.trim());
      console.log(`Generated: ${path}`);
    });
    
    // Generate integration checklist
    this.generateChecklist(entityName, outputDir);
  }

  generateChecklist(entityName, outputDir) {
    const entity = entityName.toLowerCase();
    const Entity = this.capitalize(entityName);
    
    const checklist = `
# Integration Checklist for ${Entity}

## ✅ Database Setup
- [ ] Run migration: \`psql -U postgres -d tpedb -f database/create_${entity}s_table.sql\`
- [ ] Verify table created: \`SELECT * FROM ${entity}s LIMIT 1;\`
- [ ] Add test data if needed

## ✅ Backend Integration
### Files to Copy
- [ ] Copy \`backend/controllers/${entity}Controller.js\` to \`tpe-backend/src/controllers/\`
- [ ] Copy \`backend/routes/${entity}Routes.js\` to \`tpe-backend/src/routes/\`

### Files to Update
- [ ] **tpe-backend/src/server.js**
  - Add at top: \`const ${entity}Routes = require('./routes/${entity}Routes');\`
  - Add route: \`app.use('/api/${entity}s', ${entity}Routes);\`

- [ ] **tpe-backend/src/services/enhancedMatchingService.js**
  - Add the match${Entity} function from \`${entity}Matching_ADD_TO_enhancedMatchingService.js\`
  - Call match${Entity} in getMatchedPartners function
  - Add ${entity}s to return object

- [ ] **tpe-backend/src/controllers/matchingController.js**
  - Add ${entity} matching logic from \`${entity}_ADD_TO_matchingController.js\`
  - Add ${entity} to matches object

## ✅ Frontend Integration
### Files to Copy
- [ ] Copy \`frontend/types/${entity}.ts\` to \`tpe-front-end/src/lib/types/\`
- [ ] Copy \`frontend/components/admin/${Entity}Form.tsx\` to \`tpe-front-end/src/components/admin/\`
- [ ] Copy \`frontend/app/admindashboard/${entity}s/\` folder to \`tpe-front-end/src/app/admindashboard/\`

### Files to Update
- [ ] **tpe-front-end/src/lib/api.ts**
  - Add ${entity}Api object from \`${entity}_ADD_TO_api.ts\`

- [ ] **tpe-front-end/src/app/admindashboard/page.tsx**
  - Add ${Entity}s card to admin dashboard
  - Add navigation link

- [ ] **Contractor Flow Display** (if showing in matches)
  - Update the matching results display to show ${entity}s

## ✅ Testing
- [ ] Test backend endpoints:
  - GET /api/${entity}s
  - GET /api/${entity}s/:id
  - POST /api/${entity}s
  - PUT /api/${entity}s/:id
  - DELETE /api/${entity}s/:id

- [ ] Test frontend:
  - Admin dashboard shows ${Entity}s card
  - Can navigate to ${Entity}s management page
  - Can create new ${entity}
  - Can edit existing ${entity}
  - Can delete ${entity}

- [ ] Test matching:
  - ${Entity}s appear in contractor matching results
  - Match scores are calculated correctly

## ✅ Documentation
- [ ] Update API documentation
- [ ] Update CLAUDE.md if significant feature
- [ ] Add to system change log

## 📝 Notes
- Files with "_ADD_TO_" in the name contain code snippets to add to existing files
- Ensure authentication middleware is working on all routes
- Test with different contractor profiles to verify matching logic
`;
    
    fs.writeFileSync(`${outputDir}/INTEGRATION_CHECKLIST.md`, checklist);
    console.log(`Generated integration checklist: ${outputDir}/INTEGRATION_CHECKLIST.md`);
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Usage
const generator = new ComponentGenerator();
generator.generateFiles('webinar');
```

---

## 📝 Quick Reference Commands

Add these to package.json scripts:

```json
{
  "scripts": {
    "add:entity": "node tools/generate-component.js",
    "check:impact": "node tools/analyze-change-impact.js",
    "validate:system": "node tools/validate-system-integrity.js"
  }
}
```

---

## 🚀 Usage Example

To add a new "webinar" entity:

```bash
# 1. Generate all files
npm run add:entity webinar

# 2. Review generated files in ./generated folder

# 3. Follow INTEGRATION_CHECKLIST.md

# 4. Validate system after changes
npm run validate:system
```

---

**Document Status**: Accurate representation of our actual project structure