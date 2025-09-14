#!/usr/bin/env node

/**
 * System Auto Manager - Intelligent Change Detection and Propagation
 * 
 * This tool automatically detects when you're adding new components to the system
 * and ensures all related files and configurations are properly created/updated.
 * 
 * Usage:
 * - Run in watch mode: node tools/system-auto-manager.js --watch
 * - Run once: node tools/system-auto-manager.js --check
 * - Add entity: node tools/system-auto-manager.js --add-entity webinar
 */

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { execSync } = require('child_process');
const readline = require('readline');

class SystemAutoManager {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.backendPath = path.join(this.projectRoot, 'tpe-backend');
    this.frontendPath = path.join(this.projectRoot, 'tpe-front-end');
    
    // Patterns that indicate a new entity is being added
    this.entityPatterns = {
      controller: /^(.+)Controller\.js$/,
      routes: /^(.+)Routes\.js$/,
      types: /^(.+)\.ts$/,
      form: /^(.+)Form\.tsx$/,
      table: /CREATE TABLE (\w+)s/i
    };
    
    // Track detected changes
    this.pendingChanges = new Map();
    this.processedEntities = new Set();
    
    // Configuration for what files are required for each entity type
    this.entityRequirements = {
      matching_entity: {
        required: [
          { path: 'tpe-backend/src/controllers/{entity}Controller.js', type: 'controller' },
          { path: 'tpe-backend/src/routes/{entity}Routes.js', type: 'routes' },
          { path: 'tpe-front-end/src/lib/types/{entity}.ts', type: 'types' },
          { path: 'tpe-front-end/src/components/admin/{Entity}Form.tsx', type: 'form' },
          { path: 'tpe-front-end/src/app/admindashboard/{entity}s/page.tsx', type: 'page' }
        ],
        updates: [
          { file: 'tpe-backend/src/server.js', check: 'route registration' },
          { file: 'tpe-backend/src/services/enhancedMatchingService.js', check: 'matching function' },
          { file: 'tpe-backend/src/controllers/matchingController.js', check: 'entity inclusion' },
          { file: 'tpe-front-end/src/lib/api.ts', check: 'api functions' }
        ]
      }
    };
  }

  /**
   * Start watching for changes
   */
  startWatching() {
    console.log('🔍 System Auto Manager - Watching for changes...\n');
    
    // Watch specific directories for new files
    const watcher = chokidar.watch([
      path.join(this.backendPath, 'src/controllers'),
      path.join(this.backendPath, 'src/routes'),
      path.join(this.frontendPath, 'src/lib/types'),
      path.join(this.frontendPath, 'src/components/admin'),
      path.join(this.projectRoot, 'tpe-database/migrations')
    ], {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });
    
    // Handle file additions
    watcher.on('add', (filePath) => this.handleFileAdded(filePath));
    
    // Handle file changes
    watcher.on('change', (filePath) => this.handleFileChanged(filePath));
    
    // Check pending changes every 3 seconds
    setInterval(() => this.processPendingChanges(), 3000);
  }

  /**
   * Handle when a new file is added
   */
  handleFileAdded(filePath) {
    const fileName = path.basename(filePath);
    const relativePath = path.relative(this.projectRoot, filePath);
    
    // Check if this looks like a new entity
    const entity = this.detectEntity(fileName, filePath);
    
    if (entity && !this.processedEntities.has(entity)) {
      console.log(`\n🆕 Detected new entity: "${entity}" from ${relativePath}`);
      
      // Track this change
      if (!this.pendingChanges.has(entity)) {
        this.pendingChanges.set(entity, {
          detectedFiles: [],
          missingFiles: [],
          timestamp: Date.now()
        });
      }
      
      this.pendingChanges.get(entity).detectedFiles.push({
        path: relativePath,
        type: this.getFileType(fileName)
      });
    }
  }

  /**
   * Handle when a file is changed
   */
  handleFileChanged(filePath) {
    const fileName = path.basename(filePath);
    
    // Check if server.js is being edited (might be registering routes)
    if (fileName === 'server.js') {
      this.checkServerRegistrations(filePath);
    }
    
    // Check if matching service is being edited
    if (fileName === 'enhancedMatchingService.js') {
      this.checkMatchingFunctions(filePath);
    }
  }

  /**
   * Detect entity name from filename
   */
  detectEntity(fileName, filePath) {
    // Check controller pattern
    if (fileName.match(/^(.+)Controller\.js$/)) {
      return fileName.replace('Controller.js', '').toLowerCase();
    }
    
    // Check routes pattern
    if (fileName.match(/^(.+)Routes\.js$/)) {
      return fileName.replace('Routes.js', '').toLowerCase();
    }
    
    // Check TypeScript types
    if (fileName.match(/^(.+)\.ts$/) && filePath.includes('lib/types')) {
      return fileName.replace('.ts', '').toLowerCase();
    }
    
    // Check form components
    if (fileName.match(/^(.+)Form\.tsx$/)) {
      return fileName.replace('Form.tsx', '').toLowerCase();
    }
    
    // Check SQL migrations
    const content = fs.readFileSync(filePath, 'utf-8');
    const tableMatch = content.match(/CREATE TABLE (\w+)s/i);
    if (tableMatch) {
      return tableMatch[1].toLowerCase();
    }
    
    return null;
  }

  /**
   * Get file type from filename
   */
  getFileType(fileName) {
    if (fileName.includes('Controller')) return 'controller';
    if (fileName.includes('Routes')) return 'routes';
    if (fileName.includes('Form')) return 'form';
    if (fileName.endsWith('.ts')) return 'types';
    if (fileName.endsWith('.sql')) return 'migration';
    return 'unknown';
  }

  /**
   * Process pending changes and check for missing files
   */
  async processPendingChanges() {
    for (const [entity, changes] of this.pendingChanges.entries()) {
      // Only process if changes are at least 2 seconds old (debounce)
      if (Date.now() - changes.timestamp < 2000) continue;
      
      // Check what files exist and what's missing
      const status = this.checkEntityCompleteness(entity, changes);
      
      if (status.incomplete) {
        console.log(`\n⚠️  Entity "${entity}" is incomplete!`);
        console.log('   Missing files:', status.missingFiles.join(', '));
        
        // Ask user if they want to auto-generate missing files
        const shouldGenerate = await this.promptUser(
          `Would you like to auto-generate the missing files for "${entity}"? (y/n): `
        );
        
        if (shouldGenerate) {
          await this.autoCompleteEntity(entity, status);
        }
        
        // Mark as processed either way
        this.processedEntities.add(entity);
        this.pendingChanges.delete(entity);
      } else if (status.needsUpdates) {
        console.log(`\n⚠️  Entity "${entity}" needs updates to existing files!`);
        console.log('   Files needing updates:', status.updatesNeeded.join(', '));
        
        const shouldUpdate = await this.promptUser(
          `Would you like to auto-update these files? (y/n): `
        );
        
        if (shouldUpdate) {
          await this.autoUpdateFiles(entity, status);
        }
        
        this.processedEntities.add(entity);
        this.pendingChanges.delete(entity);
      } else {
        // Entity is complete
        console.log(`✅ Entity "${entity}" appears complete!`);
        this.processedEntities.add(entity);
        this.pendingChanges.delete(entity);
      }
    }
  }

  /**
   * Check if an entity has all required files
   */
  checkEntityCompleteness(entity, changes) {
    const Entity = entity.charAt(0).toUpperCase() + entity.slice(1);
    const requirements = this.entityRequirements.matching_entity;
    
    const status = {
      incomplete: false,
      needsUpdates: false,
      missingFiles: [],
      existingFiles: [],
      updatesNeeded: []
    };
    
    // Check required files
    requirements.required.forEach(req => {
      const filePath = req.path
        .replace(/{entity}/g, entity)
        .replace(/{Entity}/g, Entity);
      
      if (fs.existsSync(path.join(this.projectRoot, filePath))) {
        status.existingFiles.push(filePath);
      } else {
        status.missingFiles.push(filePath);
        status.incomplete = true;
      }
    });
    
    // Check files that need updates
    requirements.updates.forEach(update => {
      const filePath = path.join(this.projectRoot, update.file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Check if entity is referenced
        if (!content.includes(entity) && !content.includes(Entity)) {
          status.updatesNeeded.push(update.file);
          status.needsUpdates = true;
        }
      }
    });
    
    return status;
  }

  /**
   * Auto-complete missing files for an entity
   */
  async autoCompleteEntity(entity, status) {
    console.log(`\n🔧 Auto-generating missing files for "${entity}"...`);
    
    const Entity = entity.charAt(0).toUpperCase() + entity.slice(1);
    
    for (const missingFile of status.missingFiles) {
      const filePath = path.join(this.projectRoot, missingFile);
      const fileType = this.getFileTypeFromPath(missingFile);
      
      console.log(`   Creating ${missingFile}...`);
      
      // Generate appropriate content based on file type
      const content = await this.generateFileContent(entity, Entity, fileType);
      
      // Ensure directory exists
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      
      // Write file
      fs.writeFileSync(filePath, content);
    }
    
    console.log(`✅ Generated ${status.missingFiles.length} missing files!`);
  }

  /**
   * Auto-update existing files with entity references
   */
  async autoUpdateFiles(entity, status) {
    console.log(`\n🔧 Auto-updating files for "${entity}"...`);
    
    const Entity = entity.charAt(0).toUpperCase() + entity.slice(1);
    
    for (const fileToUpdate of status.updatesNeeded) {
      const filePath = path.join(this.projectRoot, fileToUpdate);
      console.log(`   Updating ${fileToUpdate}...`);
      
      if (fileToUpdate.includes('server.js')) {
        await this.updateServerFile(filePath, entity, Entity);
      } else if (fileToUpdate.includes('enhancedMatchingService.js')) {
        await this.updateMatchingService(filePath, entity, Entity);
      } else if (fileToUpdate.includes('matchingController.js')) {
        await this.updateMatchingController(filePath, entity, Entity);
      } else if (fileToUpdate.includes('api.ts')) {
        await this.updateApiFile(filePath, entity, Entity);
      }
    }
    
    console.log(`✅ Updated ${status.updatesNeeded.length} files!`);
  }

  /**
   * Update server.js with new routes
   */
  async updateServerFile(filePath, entity, Entity) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Add require statement if not present
    const requireStatement = `const ${entity}Routes = require('./routes/${entity}Routes');`;
    if (!content.includes(requireStatement)) {
      // Find the last require statement
      const lastRequireIndex = content.lastIndexOf('const') + content.substring(content.lastIndexOf('const')).indexOf(';') + 1;
      content = content.slice(0, lastRequireIndex) + '\n' + requireStatement + content.slice(lastRequireIndex);
    }
    
    // Add route registration if not present
    const routeRegistration = `app.use('/api/${entity}s', ${entity}Routes);`;
    if (!content.includes(routeRegistration)) {
      // Find the last app.use statement
      const lastAppUseIndex = content.lastIndexOf('app.use') + content.substring(content.lastIndexOf('app.use')).indexOf(';') + 1;
      content = content.slice(0, lastAppUseIndex) + '\n' + routeRegistration + content.slice(lastAppUseIndex);
    }
    
    fs.writeFileSync(filePath, content);
  }

  /**
   * Update enhancedMatchingService.js with matching function
   */
  async updateMatchingService(filePath, entity, Entity) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if matching function exists
    if (!content.includes(`match${Entity}`)) {
      // Generate matching function
      const matchingFunction = this.generateMatchingFunction(entity, Entity);
      
      // Add before the main exports
      const exportsIndex = content.lastIndexOf('module.exports');
      content = content.slice(0, exportsIndex) + '\n' + matchingFunction + '\n' + content.slice(exportsIndex);
      
      // Add to main matching function
      const mainFunctionMatch = content.match(/async function getMatchedPartners\([^)]*\) {/);
      if (mainFunctionMatch) {
        // Find the return statement
        const returnIndex = content.indexOf('return {', mainFunctionMatch.index);
        const returnEndIndex = content.indexOf('};', returnIndex);
        
        // Add entity matches call
        const entityCall = `\n  const ${entity}Matches = await match${Entity}(modifiedContractor);`;
        content = content.slice(0, returnIndex) + entityCall + '\n' + content.slice(returnIndex);
        
        // Add to return object
        const returnAddition = `\n    ${entity}s: ${entity}Matches.slice(0, 1),`;
        content = content.slice(0, returnEndIndex) + returnAddition + content.slice(returnEndIndex);
      }
    }
    
    fs.writeFileSync(filePath, content);
  }

  /**
   * Update api.ts with new API functions
   */
  async updateApiFile(filePath, entity, Entity) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if API section exists
    if (!content.includes(`${entity}Api`)) {
      // Generate API section
      const apiSection = this.generateApiSection(entity, Entity);
      
      // Add before the final export or at the end
      const lastExportIndex = content.lastIndexOf('export');
      if (lastExportIndex > -1) {
        content = content.slice(0, lastExportIndex) + '\n' + apiSection + '\n' + content.slice(lastExportIndex);
      } else {
        content += '\n' + apiSection;
      }
    }
    
    fs.writeFileSync(filePath, content);
  }

  /**
   * Generate file content based on type
   */
  async generateFileContent(entity, Entity, fileType) {
    switch (fileType) {
      case 'controller':
        return this.generateController(entity, Entity);
      case 'routes':
        return this.generateRoutes(entity, Entity);
      case 'types':
        return this.generateTypes(entity, Entity);
      case 'form':
        return this.generateForm(entity, Entity);
      case 'page':
        return this.generateAdminPage(entity, Entity);
      default:
        return `// TODO: Implement ${entity} ${fileType}`;
    }
  }

  /**
   * Get file type from path
   */
  getFileTypeFromPath(filePath) {
    if (filePath.includes('Controller')) return 'controller';
    if (filePath.includes('Routes')) return 'routes';
    if (filePath.includes('Form')) return 'form';
    if (filePath.includes('types')) return 'types';
    if (filePath.includes('admindashboard')) return 'page';
    return 'unknown';
  }

  /**
   * Prompt user for input
   */
  async promptUser(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Generate controller content
   */
  generateController(entity, Entity) {
    return `const db = require('../config/database');

// Get all ${entity}s
exports.getAll${Entity}s = async (req, res) => {
  try {
    const query = 'SELECT * FROM ${entity}s WHERE is_active = true ORDER BY created_at DESC';
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
    const { name, description } = req.body;
    
    const query = \`
      INSERT INTO ${entity}s (name, description)
      VALUES ($1, $2)
      RETURNING *
    \`;
    
    const result = await db.query(query, [name, description]);
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
    const { name, description } = req.body;
    
    const query = \`
      UPDATE ${entity}s 
      SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    \`;
    
    const result = await db.query(query, [name, description, id]);
    
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
`;
  }

  /**
   * Generate routes content
   */
  generateRoutes(entity, Entity) {
    return `const express = require('express');
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
`;
  }

  /**
   * Generate TypeScript types
   */
  generateTypes(entity, Entity) {
    return `export interface ${Entity} {
  id: number;
  name: string;
  description: string;
  
  // Matching fields
  focusAreasCovered?: string[];
  revenueRangeFit?: string[];
  
  // AI fields
  aiSummary?: string;
  aiTags?: string[];
  aiQualityScore?: number;
  
  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ${Entity}FormData {
  name: string;
  description: string;
  focusAreasCovered?: string[];
  revenueRangeFit?: string[];
}
`;
  }

  /**
   * Generate form component
   */
  generateForm(entity, Entity) {
    return `import React, { useState } from 'react';
import { ${Entity}FormData } from '@/lib/types/${entity}';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ${Entity}FormProps {
  ${entity}?: ${Entity};
  onSubmit: (data: ${Entity}FormData) => Promise<void>;
  onCancel: () => void;
}

export function ${Entity}Form({ ${entity}, onSubmit, onCancel }: ${Entity}FormProps) {
  const [formData, setFormData] = useState<${Entity}FormData>({
    name: ${entity}?.name || '',
    description: ${entity}?.description || ''
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
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          rows={4}
          required
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
`;
  }

  /**
   * Generate admin page
   */
  generateAdminPage(entity, Entity) {
    return `'use client';

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
                  <h3 className="text-lg font-semibold">{${entity}.name}</h3>
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
`;
  }

  /**
   * Generate matching function for service
   */
  generateMatchingFunction(entity, Entity) {
    return `
// Match ${entity}s for contractor
async function match${Entity}(contractor) {
  try {
    let contractorFocusAreas = contractor.focus_areas || [];
    if (typeof contractorFocusAreas === 'string') {
      try {
        contractorFocusAreas = JSON.parse(contractorFocusAreas);
      } catch (e) {
        contractorFocusAreas = [];
      }
    }
    
    const query = \`
      SELECT * FROM ${entity}s
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 3
    \`;
    
    const result = await db.query(query);
    
    return result.rows.map(${entity} => ({
      ...${entity},
      type: '${entity}',
      matchScore: 50,
      matchReason: 'Recommended ${entity}'
    }));
  } catch (error) {
    console.error('Error matching ${entity}s:', error);
    return [];
  }
}`;
  }

  /**
   * Generate API section for frontend
   */
  generateApiSection(entity, Entity) {
    return `
// ${Entity} API
export const ${entity}Api = {
  getAll: () => apiRequest('/${entity}s'),
  
  getById: (id: string) => apiRequest(\`/${entity}s/\${id}\`),
  
  create: (data: ${Entity}FormData) => apiRequest('/${entity}s', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  update: (id: string, data: Partial<${Entity}FormData>) => 
    apiRequest(\`/${entity}s/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  delete: (id: string) => apiRequest(\`/${entity}s/\${id}\`, {
    method: 'DELETE'
  })
};`;
  }

  /**
   * Check for unregistered routes in server.js
   */
  checkServerRegistrations(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const routesDir = path.join(this.backendPath, 'src/routes');
    
    // Get all route files
    const routeFiles = fs.readdirSync(routesDir)
      .filter(f => f.endsWith('Routes.js'));
    
    // Check each route file is registered
    routeFiles.forEach(routeFile => {
      const routeName = routeFile.replace('.js', '');
      if (!content.includes(routeName)) {
        console.log(`\n⚠️  Route ${routeName} is not registered in server.js!`);
      }
    });
  }

  /**
   * Check for missing matching functions
   */
  checkMatchingFunctions(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Get all entity tables from database
    // This is a simplified check - in production you'd query the database
    const entities = ['book', 'podcast', 'event', 'partner'];
    
    entities.forEach(entity => {
      const Entity = entity.charAt(0).toUpperCase() + entity.slice(1);
      if (!content.includes(`match${Entity}`)) {
        console.log(`\n⚠️  Missing match${Entity} function in matching service!`);
      }
    });
  }

  /**
   * Run a one-time system check
   */
  async runSystemCheck() {
    console.log('🔍 Running system integrity check...\n');
    
    // Check all existing entities for completeness
    const entities = this.detectExistingEntities();
    
    for (const entity of entities) {
      const changes = { detectedFiles: [], timestamp: Date.now() };
      const status = this.checkEntityCompleteness(entity, changes);
      
      if (status.incomplete || status.needsUpdates) {
        console.log(`\n❌ Entity "${entity}" has issues:`);
        if (status.missingFiles.length > 0) {
          console.log('   Missing files:', status.missingFiles.join(', '));
        }
        if (status.updatesNeeded.length > 0) {
          console.log('   Files needing updates:', status.updatesNeeded.join(', '));
        }
      } else {
        console.log(`✅ Entity "${entity}" is complete`);
      }
    }
    
    console.log('\n✨ System check complete!');
  }

  /**
   * Detect existing entities in the system
   */
  detectExistingEntities() {
    const entities = new Set();
    
    // Check controllers
    const controllersDir = path.join(this.backendPath, 'src/controllers');
    if (fs.existsSync(controllersDir)) {
      fs.readdirSync(controllersDir).forEach(file => {
        const match = file.match(/^(.+)Controller\.js$/);
        if (match && match[1] !== 'matching' && match[1] !== 'admin' && match[1] !== 'auth') {
          entities.add(match[1].toLowerCase());
        }
      });
    }
    
    return Array.from(entities);
  }
}

// CLI handling
const args = process.argv.slice(2);
const manager = new SystemAutoManager();

if (args.includes('--watch')) {
  manager.startWatching();
} else if (args.includes('--check')) {
  manager.runSystemCheck();
} else if (args.includes('--add-entity')) {
  const entityIndex = args.indexOf('--add-entity');
  const entityName = args[entityIndex + 1];
  
  if (entityName) {
    console.log(`Creating entity: ${entityName}`);
    // Trigger the auto-complete for a new entity
    manager.autoCompleteEntity(entityName, {
      missingFiles: manager.entityRequirements.matching_entity.required.map(r => 
        r.path.replace(/{entity}/g, entityName).replace(/{Entity}/g, 
          entityName.charAt(0).toUpperCase() + entityName.slice(1))
      )
    });
  } else {
    console.log('Please provide an entity name');
  }
} else {
  console.log(`
System Auto Manager - Intelligent Change Detection and Propagation

Usage:
  --watch         Start watching for changes and auto-complete entities
  --check         Run a one-time system integrity check
  --add-entity    Add a new entity with all required files
  
Examples:
  node tools/system-auto-manager.js --watch
  node tools/system-auto-manager.js --check
  node tools/system-auto-manager.js --add-entity webinar
`);
}

module.exports = SystemAutoManager;