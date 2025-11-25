#!/usr/bin/env node

/**
 * Apostrophe Code Generator MCP Server
 *
 * This MCP server provides tools for generating Apostrophe CMS modules
 * No API keys needed - it's a local tool that Claude Code can call
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { generateModule, saveModuleFiles, parseNaturalLanguageRequest } from './generator.js';
import { extractDesignTokens } from './design-token-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create MCP server
const server = new Server(
  {
    name: 'apostrophe-code-generator',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Discover Apostrophe projects
 */
function discoverProjects() {
  const toolRoot = dirname(__dirname);
  const parentDir = dirname(toolRoot);
  const discovered = [];

  try {
    const entries = readdirSync(parentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules') continue;
      if (entry.name.startsWith('.')) continue;

      const projectPath = join(parentDir, entry.name);
      const appJsPath = join(projectPath, 'app.js');

      // Check if it's an Apostrophe project
      if (existsSync(appJsPath)) {
        try {
          const appJsContent = readFileSync(appJsPath, 'utf-8');
          const shortNameMatch = appJsContent.match(/shortName:\s*['"](.+?)['"]/);

          if (shortNameMatch) {
            discovered.push({
              id: entry.name,
              name: entry.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              path: projectPath,
              database: shortNameMatch[1],
            });
          }
        } catch (error) {
          // Skip projects we can't read
        }
      }
    }
  } catch (error) {
    console.error('Error discovering projects:', error.message);
  }

  return discovered;
}

// Note: SCSS generation moved to generator.js
// It now generates SCSS AFTER analyzing HTML structure for perfect matching

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_apostrophe_projects',
        description: 'List all discovered Apostrophe CMS projects',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'analyze_project_structure',
        description: 'Analyze an Apostrophe project to understand its structure and existing modules',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The project ID (directory name)',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'validate_module_name',
        description: 'Validate a module name and check if it already exists',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The project ID',
            },
            moduleName: {
              type: 'string',
              description: 'The proposed module name (kebab-case)',
            },
            moduleType: {
              type: 'string',
              enum: ['widget', 'page', 'piece'],
              description: 'The type of module',
            },
          },
          required: ['projectId', 'moduleName', 'moduleType'],
        },
      },
      {
        name: 'get_bem_structure',
        description: 'Get the BEM class structure for a module type',
        inputSchema: {
          type: 'object',
          properties: {
            moduleName: {
              type: 'string',
              description: 'The module name (kebab-case)',
            },
            moduleType: {
              type: 'string',
              enum: ['widget', 'page', 'piece'],
              description: 'The type of module',
            },
          },
          required: ['moduleName', 'moduleType'],
        },
      },
      {
        name: 'generate_apostrophe_module',
        description: 'Generate a complete Apostrophe module using Claude AI with all documentation and BEM patterns',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The project ID',
            },
            moduleType: {
              type: 'string',
              enum: ['widget', 'page', 'piece'],
              description: 'The type of module to generate',
            },
            moduleName: {
              type: 'string',
              description: 'The module name (kebab-case, e.g., shopping-cart)',
            },
            label: {
              type: 'string',
              description: 'Human-readable label (e.g., Shopping Cart)',
            },
            description: {
              type: 'string',
              description: 'Optional description of what the module does',
            },
            includeBemStyles: {
              type: 'boolean',
              description: '🎨 Generate SCSS with BEM notation structure (Block__Element--Modifier) with useful starter elements',
              default: true,
            },
            fullDesign: {
              type: 'boolean',
              description: '💎 HIRE A DESIGNER: Generate production-ready SCSS with complete professional styling - hover effects, transitions, gradients, container queries, accessibility, dark mode, and modern CSS patterns. Requires includeBemStyles to be true.',
              default: false,
            },
            bundleContext: {
              type: 'object',
              description: 'Bundle context when generating as part of a bundle',
              properties: {
                isPartOfBundle: { type: 'boolean' },
                basePieceName: { type: 'string' },
              },
            },
            parkPage: {
              type: 'boolean',
              description: 'Whether to create this page as a parked page (auto-created at a specific URL)',
              default: false,
            },
            parkUrl: {
              type: 'string',
              description: 'The URL where the parked page should be available (e.g., /about-us)',
            },
          },
          required: ['projectId', 'moduleType', 'moduleName', 'label'],
        },
      },
      {
        name: 'save_generated_module',
        description: 'Save generated module files to the project and auto-register',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The project ID',
            },
            files: {
              type: 'array',
              description: 'Array of files to save',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  content: { type: 'string' },
                },
                required: ['path', 'content'],
              },
            },
            moduleName: {
              type: 'string',
              description: 'The module name',
            },
            moduleType: {
              type: 'string',
              description: 'The module type',
            },
            includeBemStyles: {
              type: 'boolean',
              description: 'Whether BEM styles were included',
            },
          },
          required: ['projectId', 'files', 'moduleName', 'moduleType'],
        },
      },
      {
        name: 'generate_from_natural_language',
        description: 'Generate an Apostrophe module from a natural language description. Uses Claude AI to parse the request and extract module type, name, and field requirements.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The project ID',
            },
            userRequest: {
              type: 'string',
              description: 'Natural language description of what to create. Examples: "Create a blog widget with title and content", "I need a product piece with price and description", "Make a landing page with hero section"',
            },
          },
          required: ['projectId', 'userRequest'],
        },
      },
      {
        name: 'list_available_asset_functions',
        description: 'List all exported functions available in a project\'s global asset module (modules/asset/ui/src/index.js). Use this to determine which shared utility functions can be imported when generating frontend JavaScript for widgets.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The project ID',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'analyze_design_tokens',
        description: 'Extract and analyze design tokens (SCSS variables, CSS custom properties, and mixins) from a project\'s index.scss and all imported files. Returns categorized tokens (colors, typography, spacing, etc.) and smart recommendations for generating styled components.',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'The project ID',
            },
          },
          required: ['projectId'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_apostrophe_projects': {
        const projects = discoverProjects();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2),
            },
          ],
        };
      }

      case 'analyze_project_structure': {
        const { projectId } = args;
        const projects = discoverProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Project not found' }),
              },
            ],
            isError: true,
          };
        }

        // Analyze project structure
        const structure = {
          project: project.name,
          path: project.path,
          modules: {
            widgets: [],
            pages: [],
            pieces: [],
          },
        };

        // Check for existing modules
        const modulesPath = join(project.path, 'modules');
        if (existsSync(modulesPath)) {
          ['widgets', 'pages', 'pieces'].forEach(type => {
            const typePath = join(modulesPath, type);
            if (existsSync(typePath)) {
              const entries = readdirSync(typePath, { withFileTypes: true });
              structure.modules[type] = entries
                .filter(e => e.isDirectory() && !e.name.startsWith('.'))
                .map(e => e.name);
            }
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(structure, null, 2),
            },
          ],
        };
      }

      case 'validate_module_name': {
        const { projectId, moduleName, moduleType } = args;
        const projects = discoverProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Project not found' }),
              },
            ],
            isError: true,
          };
        }

        // Validate naming convention
        const isValid = /^[a-z][a-z0-9-]*$/.test(moduleName);

        // Check if module already exists
        const typeDir = moduleType === 'widget' ? 'widgets' : (moduleType === 'piece' ? 'pieces' : 'pages');
        const modulePath = join(project.path, 'modules', typeDir, moduleName);
        const exists = existsSync(modulePath);

        const result = {
          valid: isValid,
          exists: exists,
          moduleName: moduleName,
          moduleType: moduleType,
          path: modulePath,
          message: !isValid
            ? 'Invalid name: use lowercase letters, numbers, and hyphens only (kebab-case)'
            : exists
              ? `Module already exists at ${modulePath}`
              : 'Module name is valid and available',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'get_bem_structure': {
        const { moduleName, moduleType } = args;

        const bemStructure = {
          moduleName,
          moduleType,
          classes: {},
        };

        if (moduleType === 'widget') {
          bemStructure.classes = {
            block: `.${moduleName}`,
            elements: [
              `.${moduleName}__container`,
              `.${moduleName}__header`,
              `.${moduleName}__title`,
              `.${moduleName}__content`,
              `.${moduleName}__image`,
              `.${moduleName}__button`,
            ],
            modifiers: [
              `.${moduleName}--large`,
              `.${moduleName}--dark`,
            ],
            example: `<div class="${moduleName}">
  <div class="${moduleName}__container">
    <div class="${moduleName}__header">
      <h3 class="${moduleName}__title">Title</h3>
    </div>
    <div class="${moduleName}__content">
      Content here
    </div>
  </div>
</div>`,
          };
        } else if (moduleType === 'page') {
          bemStructure.classes = {
            block: `.${moduleName}`,
            elements: [
              `.${moduleName}__header`,
              `.${moduleName}__title`,
              `.${moduleName}__intro`,
              `.${moduleName}__content`,
              `.${moduleName}__section`,
              `.${moduleName}__aside`,
              `.${moduleName}__piece`,
            ],
            modifiers: [
              `.${moduleName}--full-width`,
              `.${moduleName}--centered`,
            ],
            example: `<div class="${moduleName} ${moduleName}--centered">
  <div class="${moduleName}__header">
    <h1 class="${moduleName}__title">{{ data.page.title }}</h1>
  </div>
  <div class="${moduleName}__content">
    {% for piece in data.page._pieces %}
      <div class="${moduleName}__piece">
        <!-- piece content -->
      </div>
    {% endfor %}
  </div>
</div>`,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(bemStructure, null, 2),
            },
          ],
        };
      }

      case 'generate_apostrophe_module': {
        const { projectId, moduleType, moduleName, label, description, includeBemStyles = true, fullDesign = false, bundleContext, parkPage = false, parkUrl = null } = args;

        const projects = discoverProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Project not found' }),
              },
            ],
            isError: true,
          };
        }

        try {
          const result = await generateModule({
            project,
            type: moduleType,
            name: moduleName,
            label,
            description,
            includeBemStyles,
            fullDesign,
            bundleContext,
            parkPage,
            parkUrl,
          });

          // Note: SCSS is now generated inside generateModule() after analyzing HTML
          // No need to add SCSS here - it's already in result.files

          // Build message with registration note if present
          let message = `Generated ${result.files.length} file(s) for ${moduleName}`;
          if (result.registrationNote) {
            message += `\n\n${result.registrationNote}`;
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  ...result,
                  message,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message }),
              },
            ],
            isError: true,
          };
        }
      }

      case 'save_generated_module': {
        const { projectId, files, moduleName, moduleType, moduleLabel, includeBemStyles = false, parkPage = false, parkUrl = null } = args;

        const projects = discoverProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Project not found' }),
              },
            ],
            isError: true,
          };
        }

        try {
          const result = saveModuleFiles({
            project,
            files,
            moduleName,
            moduleType,
            moduleLabel,
            includeBemStyles,
            parkPage,
            parkUrl,
          });

          let messageParts = [`Saved ${result.savedCount} file(s)`];
          if (result.updatedModulesJs) messageParts.push('registered in modules.js');
          if (result.createdScss) messageParts.push('created SCSS');
          if (result.registeredPage) {
            if (parkPage && parkUrl) {
              messageParts.push(`registered page (parked at ${parkUrl})`);
            } else {
              messageParts.push('registered page');
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  ...result,
                  message: messageParts.join(', '),
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message }),
              },
            ],
            isError: true,
          };
        }
      }

      case 'generate_from_natural_language': {
        const { projectId, userRequest } = args;

        const projects = discoverProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Project not found' }),
              },
            ],
            isError: true,
          };
        }

        try {
          // Step 1: Parse natural language request
          console.error('Step 1: Parsing natural language request...');
          const parsed = await parseNaturalLanguageRequest(userRequest);

          console.error(`Parsed: ${parsed.moduleType} "${parsed.moduleName}" (confidence: ${parsed.confidence})`);

          // Step 2: Check if it's a bundle
          if (parsed.moduleType === 'bundle' && parsed.bundleConfig) {
            console.error('Step 2: Generating bundle...');
            const { includePiece, includePage, includeWidget, parkPage = false } = parsed.bundleConfig;
            const moduleCount = (includePiece ? 1 : 0) + (includePage ? 1 : 0) + (includeWidget ? 1 : 0);
            const hasPiece = includePiece;
            const isRealBundle = hasPiece && moduleCount > 1;

            const allFiles = [];
            const modules = [];

            // Generate piece if requested
            if (includePiece) {
              const pieceResult = await generateModule({
                project,
                type: 'piece',
                name: parsed.moduleName,
                label: parsed.label,
                description: parsed.description,
                includeBemStyles: false,
                bundleContext: {
                  isPartOfBundle: true,
                  basePieceName: parsed.moduleName
                }
              });
              allFiles.push(...pieceResult.files);
              modules.push({ type: 'piece', name: parsed.moduleName });
            }

            // Generate page if requested
            if (includePage) {
              const pageResult = await generateModule({
                project,
                type: 'page',
                name: `${parsed.moduleName}-page`,
                label: `${parsed.label} Page`,
                description: parsed.description,
                includeBemStyles: parsed.includeBemStyles,
                bundleContext: {
                  isPartOfBundle: true,
                  basePieceName: parsed.moduleName
                }
              });
              allFiles.push(...pageResult.files);
              modules.push({ type: 'page', name: `${parsed.moduleName}-page` });
            }

            // Generate widget if requested
            if (includeWidget) {
              const widgetResult = await generateModule({
                project,
                type: 'widget',
                name: `${parsed.moduleName}-widget`,
                label: `${parsed.label} Widget`,
                description: parsed.description,
                includeBemStyles: parsed.includeBemStyles,
                bundleContext: {
                  isPartOfBundle: true,
                  basePieceName: parsed.moduleName
                }
              });
              allFiles.push(...widgetResult.files);
              modules.push({ type: 'widget', name: `${parsed.moduleName}-widget` });
            }

            // If it's a real bundle (piece + widget/page), adjust paths and create wrapper
            if (isRealBundle) {
              const adjustedFiles = allFiles.map(file => {
                // Don't adjust SCSS paths - they stay in modules/asset/
                if (file.path.includes('modules/asset/')) {
                  return file;
                }

                // Adjust module file paths to be inside bundle
                const newPath = file.path.replace(/^modules\/[^/]+\/([^/]+)\//, `modules/pieces/${parsed.moduleName}-module/$1/`);
                return { ...file, path: newPath };
              });

              // Create parent module index.js
              const parentIndexContent = `export default {\n  options: {\n    label: '${parsed.label}'\n  }\n};\n`;
              adjustedFiles.unshift({
                path: `modules/pieces/${parsed.moduleName}-module/index.js`,
                content: parentIndexContent
              });

              // Create internal modules.js
              const internalModulesContent = `export default {\n${modules.map(m => `  '${m.name}': {}`).join(',\n')}\n};\n`;
              adjustedFiles.push({
                path: `modules/pieces/${parsed.moduleName}-module/modules.js`,
                content: internalModulesContent
              });

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    parsed: {
                      moduleType: 'bundle',
                      moduleName: parsed.moduleName,
                      label: parsed.label,
                      confidence: parsed.confidence,
                      includeBemStyles: parsed.includeBemStyles
                    },
                    files: adjustedFiles,
                    moduleName: parsed.moduleName,
                    moduleType: 'bundle',
                    isBundle: true,
                    isRealBundle: true,
                    bundleModules: modules,
                    bundleConfig: {
                      includePiece,
                      includePage,
                      includeWidget,
                      parkPage
                    },
                    message: `Generated bundle with ${modules.length} internal modules`
                  }, null, 2)
                }]
              };
            } else {
              // Just separate modules
              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    parsed: {
                      moduleType: 'bundle',
                      moduleName: parsed.moduleName,
                      label: parsed.label,
                      confidence: parsed.confidence,
                      includeBemStyles: parsed.includeBemStyles
                    },
                    files: allFiles,
                    moduleName: parsed.moduleName,
                    moduleType: 'bundle',
                    isBundle: true,
                    isRealBundle: false,
                    bundleModules: modules,
                    bundleConfig: {
                      includePiece,
                      includePage,
                      includeWidget,
                      parkPage
                    },
                    message: `Generated ${modules.length} separate modules`
                  }, null, 2)
                }]
              };
            }
          }

          // Step 2: Generate single module using parsed parameters
          console.error('Step 2: Generating single module...');
          const result = await generateModule({
            project,
            type: parsed.moduleType,
            name: parsed.moduleName,
            label: parsed.label,
            description: parsed.description,
            includeBemStyles: parsed.includeBemStyles,
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  parsed: {
                    moduleType: parsed.moduleType,
                    moduleName: parsed.moduleName,
                    label: parsed.label,
                    confidence: parsed.confidence,
                  },
                  ...result,
                  message: `Generated ${result.files.length} file(s) for ${parsed.moduleName} (parsed from natural language with ${parsed.confidence} confidence)`,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message }),
              },
            ],
            isError: true,
          };
        }
      }

      case 'list_available_asset_functions': {
        const { projectId } = args;

        const projects = discoverProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Project not found' }),
              },
            ],
            isError: true,
          };
        }

        try {
          // Check if modules/asset/ui/src/index.js exists
          const assetIndexPath = join(project.path, 'modules', 'asset', 'ui', 'src', 'index.js');

          if (!existsSync(assetIndexPath)) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: true,
                    available: false,
                    functions: [],
                    message: 'No asset index.js file found in this project',
                  }, null, 2),
                },
              ],
            };
          }

          // Read the file and extract export statements
          const assetCode = readFileSync(assetIndexPath, 'utf-8');

          // Match all exported function names
          const exportMatches = assetCode.matchAll(/export\s+function\s+(\w+)/g);
          const functions = Array.from(exportMatches, match => match[1]);

          // Also check for export { } statements
          const namedExportMatches = assetCode.matchAll(/export\s*\{\s*([^}]+)\s*\}/g);
          for (const match of namedExportMatches) {
            const names = match[1].split(',').map(name => name.trim().split(/\s+as\s+/)[0]);
            functions.push(...names);
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  available: true,
                  projectId,
                  projectName: project.name,
                  assetPath: 'modules/asset/ui/src/index.js',
                  functions: [...new Set(functions)].sort(), // Remove duplicates and sort
                  count: functions.length,
                  importPath: 'Modules/asset/index.js',
                  message: `Found ${functions.length} exported function(s) in ${project.name}`,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message }),
              },
            ],
            isError: true,
          };
        }
      }

      case 'analyze_design_tokens': {
        const { projectId } = args;

        const projects = discoverProjects();
        const project = projects.find(p => p.id === projectId);

        if (!project) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'Project not found' }),
              },
            ],
            isError: true,
          };
        }

        try {
          const analysis = extractDesignTokens(project.path);

          if (!analysis.success) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ error: analysis.error }),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  projectId,
                  projectName: project.name,
                  ...analysis,
                  message: `Analyzed ${analysis.filesAnalyzed} SCSS files and found ${analysis.tokens.total} design tokens`,
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message }),
              },
            ],
            isError: true,
          };
        }
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown tool: ${name}` }),
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: error.message }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Check if Claude CLI is available
 */
async function checkClaudeCLI() {
  return new Promise((resolve) => {
    const child = spawn('claude', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let found = false;

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });

    // Timeout after 2 seconds
    setTimeout(() => {
      child.kill();
      resolve(false);
    }, 2000);
  });
}

/**
 * Start the server
 */
async function main() {
  // Check Claude CLI availability
  const claudeAvailable = await checkClaudeCLI();

  if (!claudeAvailable) {
    console.error('⚠️  WARNING: Claude CLI not found!');
    console.error('   The generator will not work without it.');
    console.error('   Install with: npm install -g @anthropic-ai/cli');
    console.error('   Then configure: claude configure');
    console.error('');
  } else {
    console.error('✅ Claude CLI detected and ready');
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Apostrophe Code Generator MCP Server running');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
