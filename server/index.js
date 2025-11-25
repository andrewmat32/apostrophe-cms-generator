/**
 * Apostrophe Code Generator Server
 * Standalone server for generating Apostrophe CMS modules
 */

import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync, existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync, rmdirSync } from 'fs';
import { callMcpTool } from './mcp-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const toolRoot = dirname(__dirname);
const historyRoot = join(toolRoot, 'history');

const app = express();
const PORT = process.env.PORT || 3031;

/**
 * Save files to history folder
 * Creates folder: history/2025-11-18_11-09-31_accordion-widget/
 */
function saveToHistory(moduleName, moduleType, projectName, files, fullDesign, description = null) {
    try {
        // Ensure history root exists
        if (!existsSync(historyRoot)) {
            mkdirSync(historyRoot, { recursive: true });
        }

        // Create timestamp folder name: YYYY-MM-DD_HH-MM-SS_module-name
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/T/, '_')
            .replace(/:/g, '-')
            .replace(/\..+/, '')
            .substring(0, 19); // YYYY-MM-DD_HH-MM-SS

        const folderName = `${timestamp}_${moduleName}`;
        const historyFolder = join(historyRoot, folderName);

        // Create history folder
        mkdirSync(historyFolder, { recursive: true });

        // Save metadata
        const metadata = {
            moduleName,
            moduleType,
            projectName,
            fileCount: files.length,
            fullDesign: fullDesign || false,
            description: description || null,  // Save the prompt/description
            timestamp: now.toISOString()
        };
        writeFileSync(
            join(historyFolder, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );

        // Save each file
        files.forEach(file => {
            const filePath = join(historyFolder, file.path);
            const fileDir = dirname(filePath);

            // Create directory structure
            if (!existsSync(fileDir)) {
                mkdirSync(fileDir, { recursive: true });
            }

            // Write file
            writeFileSync(filePath, file.content);
        });

        console.log(`   📜 Saved to history: ${folderName}`);
        return { success: true, historyId: folderName };
    } catch (error) {
        console.error(`   ⚠️  Failed to save history: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * List all history items
 */
function listHistory() {
    try {
        if (!existsSync(historyRoot)) {
            return [];
        }

        const folders = readdirSync(historyRoot, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => {
                const metadataPath = join(historyRoot, entry.name, 'metadata.json');
                if (!existsSync(metadataPath)) {
                    return null;
                }

                const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));
                return {
                    id: entry.name,
                    ...metadata
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first

        return folders;
    } catch (error) {
        console.error('Error listing history:', error);
        return [];
    }
}

/**
 * Load files from a history item
 */
function loadHistoryItem(historyId) {
    try {
        const historyFolder = join(historyRoot, historyId);

        if (!existsSync(historyFolder)) {
            throw new Error('History item not found');
        }

        // Load metadata
        const metadataPath = join(historyFolder, 'metadata.json');
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'));

        // Find all files (recursively)
        const files = [];

        function scanDirectory(dir, basePath = '') {
            const entries = readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.name === 'metadata.json') continue;

                const fullPath = join(dir, entry.name);
                const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

                if (entry.isDirectory()) {
                    scanDirectory(fullPath, relativePath);
                } else {
                    files.push({
                        path: relativePath,
                        content: readFileSync(fullPath, 'utf-8')
                    });
                }
            }
        }

        scanDirectory(historyFolder);

        return {
            ...metadata,
            files
        };
    } catch (error) {
        throw new Error(`Failed to load history item: ${error.message}`);
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(toolRoot, 'public')));

/**
 * Discover Apostrophe projects
 */
// Note: Project discovery and code generation logic has been moved to MCP server
// All generation functionality is now handled via MCP tools in mcp-server/index.js

// API Routes

// Get list of projects
app.get('/api/code-generator/projects', async (req, res) => {
    try {
        console.log('📡 Calling MCP tool: list_apostrophe_projects');
        const projects = await callMcpTool('list_apostrophe_projects');
        res.json(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate code using Claude AI via MCP (non-streaming - kept for compatibility)
app.post('/api/code-generator/generate', async (req, res) => {
    try {
        const { type, projectId, name, label, description, includeBemStyles = true, fullDesign = false } = req.body;

        if (!type || !projectId || !name || !label) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`\n📡 Calling MCP tool: generate_apostrophe_module`);
        console.log(`   Type: ${type}, Name: ${name}, Project: ${projectId}`);

        // Call MCP server to generate module
        const result = await callMcpTool('generate_apostrophe_module', {
            projectId,
            moduleType: type,
            moduleName: name,
            label,
            description,
            includeBemStyles,
            fullDesign
        });

        console.log(`   ✅ Generated ${result.files.length} file(s)`);

        res.json(result);

    } catch (error) {
        console.error('Error generating code:', error);
        res.status(500).json({ error: error.message });
    }
});

// Generate code with streaming progress updates (Server-Sent Events)
app.post('/api/code-generator/generate/stream', async (req, res) => {
    const { type, projectId, name, label, description, includeBemStyles = true, fullDesign = false, bundleConfig } = req.body;

    if (!type || !projectId || !name || !label) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Helper to send progress events
    const sendProgress = (stage, message, percentage) => {
        const data = { type: 'progress', stage, message, percentage };
        console.log(`📡 SSE SEND: ${stage} (${percentage}%) - ${message}`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const sendError = (error) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: error })}\n\n`);
        res.end();
    };

    const sendComplete = (result) => {
        res.write(`data: ${JSON.stringify({ type: 'complete', result })}\n\n`);
        res.end();
    };

    try {
        // Handle bundles (generate multiple modules)
        if (type === 'bundle') {
            // DEBUG: Log bundle configuration
            console.log(`\n=== BUNDLE GENERATION DEBUG ===`);
            console.log(`Name: ${name}`);
            console.log(`Bundle Config:`, bundleConfig);
            console.log(`  - Include Piece: ${bundleConfig?.includePiece || false}`);
            console.log(`  - Include Page: ${bundleConfig?.includePage || false}`);
            console.log(`  - Include Widget: ${bundleConfig?.includeWidget || false}`);
            console.log(`  - Park Page: ${bundleConfig?.parkPage || false}`);
            console.log(`  - Park URL: ${bundleConfig?.parkUrl || 'N/A'}`);
            console.log(`=== END DEBUG ===\n`);

            if (!bundleConfig || (!bundleConfig.includePiece && !bundleConfig.includePage && !bundleConfig.includeWidget)) {
                sendError('Bundle must include at least one module type');
                return;
            }

            const hasPiece = bundleConfig.includePiece;
            const hasPage = bundleConfig.includePage;
            const hasWidget = bundleConfig.includeWidget;
            const parkPage = bundleConfig.parkPage || false;
            const parkUrl = bundleConfig.parkUrl || null;
            const moduleCount = [hasPiece, hasPage, hasWidget].filter(Boolean).length;

            // If only piece is checked, generate as regular piece (not a bundle)
            if (hasPiece && moduleCount === 1) {
                sendProgress('init', `Generating single piece module: ${name}`, 0);
                sendProgress('validating', 'Validating project and module name', 10);
                sendProgress('prompt', 'Building generation prompt', 20);
                sendProgress('claude', 'Calling Claude AI', 30);

                const result = await callMcpTool('generate_apostrophe_module', {
                    projectId,
                    moduleType: 'piece',
                    moduleName: name,
                    label,
                    description,
                    includeBemStyles: false,
                    fullDesign: false
                });

                if (result.error) {
                    sendError(`Failed to generate piece: ${result.error}`);
                    return;
                }

                sendProgress('complete', `Generated piece module with ${result.files.length} files!`, 100);
                sendComplete(result);
                return;
            }

            // If piece + (widget/page) → Generate true bundle
            // If widget/page only → Generate separate modules
            const isRealBundle = hasPiece && moduleCount > 1;

            sendProgress('init', `Preparing to generate ${isRealBundle ? 'bundle' : 'modules'}: ${name}`, 0);

            const allFiles = [];
            const modules = [];
            let currentProgress = 10;

            // Generate piece if requested
            if (bundleConfig.includePiece) {
                sendProgress('claude', `Generating piece module`, currentProgress);
                const pieceResult = await callMcpTool('generate_apostrophe_module', {
                    projectId,
                    moduleType: 'piece',
                    moduleName: name,  // Always use bundle name for piece
                    label,
                    description,
                    includeBemStyles: false,
                    fullDesign: false,
                    bundleContext: {
                        isPartOfBundle: true,
                        basePieceName: name
                    }
                });
                if (pieceResult.error) {
                    sendError(`Failed to generate piece: ${pieceResult.error}`);
                    return;
                }
                allFiles.push(...pieceResult.files);
                modules.push({ type: 'piece', name: name });
                currentProgress += 25;
            }

            // Generate page if requested
            if (bundleConfig.includePage) {
                const pageMessage = fullDesign
                    ? `Generating page module (Full Design - may take 2-3 minutes)`
                    : `Generating page module (may take 1-2 minutes)`;
                sendProgress('claude', pageMessage, currentProgress);

                // CRITICAL: Bundle pages are ALWAYS parked pages
                // Generate default parkUrl if not provided (e.g., "product" -> "/products")
                const bundleParkUrl = parkUrl || `/${name}s`;

                console.log(`   📌 Bundle page will be parked at: ${bundleParkUrl}`);

                const pageResult = await callMcpTool('generate_apostrophe_module', {
                    projectId,
                    moduleType: 'page',
                    moduleName: `${name}-page`,  // Always {name}-page
                    label: `${label} Page`,
                    description,
                    includeBemStyles,
                    fullDesign,
                    parkPage: true,           // ALWAYS true for bundle pages
                    parkUrl: bundleParkUrl,   // Use provided or generate default
                    bundleContext: {
                        isPartOfBundle: true,
                        basePieceName: name
                    }
                });
                if (pageResult.error) {
                    sendError(`Failed to generate page: ${pageResult.error}`);
                    return;
                }
                allFiles.push(...pageResult.files);
                modules.push({ type: 'page', name: `${name}-page` });
                currentProgress += 25;
            }

            // Generate widget if requested
            if (bundleConfig.includeWidget) {
                sendProgress('claude', `Generating widget module`, currentProgress);
                const widgetResult = await callMcpTool('generate_apostrophe_module', {
                    projectId,
                    moduleType: 'widget',
                    moduleName: `${name}-widget`,  // Always {name}-widget
                    label: `${label} Widget`,
                    description,
                    includeBemStyles,
                    fullDesign,
                    bundleContext: {
                        isPartOfBundle: true,
                        basePieceName: name
                    }
                });
                if (widgetResult.error) {
                    sendError(`Failed to generate widget: ${widgetResult.error}`);
                    return;
                }
                allFiles.push(...widgetResult.files);
                modules.push({ type: 'widget', name: `${name}-widget` });
                currentProgress += 25;
            }

            // If it's a real bundle (piece + widget/page), create bundle wrapper files
            if (isRealBundle) {
                // Create parent module index.js (minimal - just a container)
                const parentIndexContent = `export default {
  options: {
    ignoreNoCodeWarning: true
  }
};
`;

                // Create internal modules.js
                const internalModulesContent = `export default {
${modules.map(m => `  '${m.name}': {}`).join(',\n')}
};
`;

                // Adjust file paths to be inside bundle (but keep SCSS in modules/asset/)
                const adjustedFiles = allFiles.map(file => {
                    // Don't move SCSS files - they stay in modules/asset/
                    if (file.path.includes('modules/asset/')) {
                        return file;
                    }

                    // Move module files into bundle
                    return {
                        ...file,
                        path: file.path.replace(`modules/pieces/${name}/`, `modules/pieces/${name}-module/${name}/`)
                                        .replace(`modules/pages/${name}-page/`, `modules/pieces/${name}-module/${name}-page/`)
                                        .replace(`modules/widgets/${name}-widget/`, `modules/pieces/${name}-module/${name}-widget/`)
                    };
                });

                // Add parent module files
                adjustedFiles.unshift(
                    {
                        path: `modules/pieces/${name}-module/index.js`,
                        content: parentIndexContent
                    },
                    {
                        path: `modules/pieces/${name}-module/modules.js`,
                        content: internalModulesContent
                    }
                );

                sendProgress('complete', `Generated bundle with ${modules.length} internal modules!`, 100);

                const bundleResult = {
                    success: true,
                    files: adjustedFiles,
                    moduleName: name,
                    moduleType: 'bundle',
                    isBundle: true,
                    isRealBundle: true,
                    bundleModules: modules,
                    bundleConfig: bundleConfig,  // CRITICAL: Include bundleConfig for page registration
                    message: `Generated bundle with ${modules.length} internal modules`
                };

                sendComplete(bundleResult);
            } else {
                // Just separate modules
                sendProgress('complete', `Generated ${modules.length} modules with ${allFiles.length} files!`, 100);

                const bundleResult = {
                    success: true,
                    files: allFiles,
                    moduleName: name,
                    moduleType: 'bundle',
                    isBundle: true,
                    isRealBundle: false,
                    bundleModules: modules,
                    bundleConfig: bundleConfig,  // CRITICAL: Include bundleConfig for page registration
                    message: `Generated ${modules.length} separate modules`
                };

                sendComplete(bundleResult);
            }
            return;
        }

        // Single module generation (widget, page, piece)
        sendProgress('init', `Preparing to generate ${type}: ${name}`, 0);

        sendProgress('validating', 'Validating project and module name', 10);
        await new Promise(resolve => setTimeout(resolve, 300));

        sendProgress('prompt', 'Building generation prompt with BEM patterns', 20);
        await new Promise(resolve => setTimeout(resolve, 400));

        // Set appropriate progress message based on complexity
        let claudeMessage = 'Calling Claude AI';
        if (type === 'page' && fullDesign) {
            claudeMessage = 'Generating page with Full Design (this may take 2-3 minutes)';
        } else if (type === 'page') {
            claudeMessage = 'Generating page module (this may take 1-2 minutes)';
        } else if (fullDesign) {
            claudeMessage = 'Calling Claude AI with Full Design (this may take 1-2 minutes)';
        } else {
            claudeMessage = 'Calling Claude AI (this may take 10-60 seconds)';
        }

        sendProgress('claude', claudeMessage, 30);

        // Extract park page settings from bundleConfig if provided (for V2 wizard compatibility)
        const parkPage = bundleConfig?.parkPage || false;
        const parkUrl = bundleConfig?.parkUrl || null;

        // DEBUG: Log park page settings for single page generation
        if (type === 'page') {
            console.log(`\n=== PAGE GENERATION DEBUG ===`);
            console.log(`Name: ${name}`);
            console.log(`Park Page: ${parkPage}`);
            console.log(`Park URL: ${parkUrl}`);
            console.log(`=== END DEBUG ===\n`);
        }

        // Call MCP server to generate module
        const result = await callMcpTool('generate_apostrophe_module', {
            projectId,
            moduleType: type,
            moduleName: name,
            label,
            description,
            includeBemStyles,
            fullDesign,
            parkPage: type === 'page' ? parkPage : undefined,  // Only pass for pages
            parkUrl: type === 'page' ? parkUrl : undefined
        });

        if (result.error) {
            sendError(`Failed to generate ${type}: ${result.error}`);
            return;
        }

        sendProgress('parsing', 'Parsing generated code', 70);
        await new Promise(resolve => setTimeout(resolve, 300));

        sendProgress('analyzing', 'Analyzing HTML structure', 80);
        await new Promise(resolve => setTimeout(resolve, 300));

        sendProgress('scss', 'Generating SCSS to match HTML classes', 90);
        await new Promise(resolve => setTimeout(resolve, 200));

        // Debug: Log result structure
        console.log('\n📦 Result from MCP tool:');
        console.log('   - success:', result.success);
        console.log('   - files:', result.files?.length, 'files');
        console.log('   - moduleName:', result.moduleName);
        console.log('   - moduleType:', result.moduleType);
        console.log('   - message:', result.message);

        if (result.files) {
            result.files.forEach((file, i) => {
                console.log(`   📄 File ${i+1}: ${file.path}`);
            });
        }

        sendProgress('complete', `Generated ${result.files?.length || 0} file(s) successfully!`, 100);

        // Send final result
        sendComplete(result);

    } catch (error) {
        console.error('Error generating code:', error);
        sendError(error.message);
    }
});

// Generate from natural language (Chat Mode)
app.post('/api/code-generator/generate/chat', async (req, res) => {
    try {
        const { projectId, userRequest } = req.body;

        if (!projectId || !userRequest) {
            return res.status(400).json({ error: 'Missing required fields (projectId, userRequest)' });
        }

        console.log(`\n💬 Chat Mode: "${userRequest.substring(0, 60)}..."`);
        console.log(`📡 Calling MCP tool: generate_from_natural_language`);

        // Call MCP server to parse and generate
        const result = await callMcpTool('generate_from_natural_language', {
            projectId,
            userRequest
        });

        // Check if result is valid
        if (!result) {
            throw new Error('No result returned from MCP server');
        }

        if (result.error) {
            throw new Error(result.error);
        }

        if (!result.files || !Array.isArray(result.files)) {
            console.error('Invalid result format:', JSON.stringify(result, null, 2));
            throw new Error('Invalid result format: missing files array');
        }

        console.log(`   ✅ Generated ${result.files.length} file(s) (confidence: ${result.parsed?.confidence || 'unknown'})`);
        console.log(`   📋 Parsed as: ${result.parsed?.moduleType || 'unknown'} "${result.parsed?.moduleName || 'unknown'}"`);

        res.json(result);

    } catch (error) {
        console.error('Error in chat mode:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save generated files via MCP
app.post('/api/code-generator/save', async (req, res) => {
    try {
        const { projectId, files, moduleName, moduleType, moduleLabel, includeBemStyles, fullDesign, projectName, parkPage, parkUrl, description } = req.body;

        if (!projectId || !files || !moduleName || !moduleType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        console.log(`\n📡 Calling MCP tool: save_generated_module`);
        console.log(`   Saving ${files.length} file(s) for ${moduleName}`);
        console.log(`   Module Type: ${moduleType}`);
        console.log(`   Module Name: ${moduleName}`);
        console.log(`   Module Label: ${moduleLabel}`);
        console.log(`   Include BEM: ${includeBemStyles}`);
        console.log(`   Park Page: ${parkPage}`);
        console.log(`   Park URL: ${parkUrl}`);

        if (moduleType === 'page' || moduleType === 'bundle') {
            console.log(`   🔍 Page registration params: parkPage=${parkPage}, parkUrl=${parkUrl}`);
        }

        // Call MCP server to save module
        const result = await callMcpTool('save_generated_module', {
            projectId,
            files,
            moduleName,
            moduleType,
            moduleLabel,
            includeBemStyles,
            parkPage,
            parkUrl
        });

        console.log(`   📦 Save result:`);
        console.log(`      - Saved count: ${result.savedCount}`);
        console.log(`      - Updated modules.js: ${result.updatedModulesJs}`);
        console.log(`      - Registered page: ${result.registeredPage}`);
        console.log(`      - Page registration type: ${result.pageRegistrationType}`);

        console.log(`   ✅ ${result.message}`);

        // Also save to history folder
        const historyResult = saveToHistory(
            moduleName,
            moduleType,
            projectName || 'Unknown Project',
            files,
            fullDesign,
            description  // Pass the description/prompt
        );

        // Build registration info for pages
        let registrationInfo = null;
        if (moduleType === 'page' && result.registeredPage && result.pageRegistrationType) {
            const pageIndexPath = 'modules/@apostrophecms/page/index.js';

            if (result.pageRegistrationType === 'park') {
                const registration = `{
  title: '${result.pageRegistrationDetails.title}',
  slug: '${result.pageRegistrationDetails.slug}',
  type: '${result.pageRegistrationDetails.type}',
  parkedId: '${result.pageRegistrationDetails.parkedId}'
}`;
                registrationInfo = {
                    message: `Page registered as parked page at ${result.pageRegistrationDetails.slug}`,
                    modulesJsPath: pageIndexPath,
                    registration,
                    registrationType: 'park',
                    scssInfo: result.createdScss ? 'SCSS files created and imported in modules/asset/ui/src/index.scss' : null
                };
            } else if (result.pageRegistrationType === 'types') {
                const registration = `{
  name: '${result.pageRegistrationDetails.name}',
  label: '${result.pageRegistrationDetails.label}'
}`;
                registrationInfo = {
                    message: `Page registered in types array`,
                    modulesJsPath: pageIndexPath,
                    registration,
                    registrationType: 'types',
                    scssInfo: result.createdScss ? 'SCSS files created and imported in modules/asset/ui/src/index.scss' : null
                };
            }
        }

        res.json({
            ...result,
            historyId: historyResult.historyId,
            registrationInfo
        });

    } catch (error) {
        console.error('Error saving files:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get history list
app.get('/api/code-generator/history', (req, res) => {
    try {
        const history = listHistory();
        res.json(history);
    } catch (error) {
        console.error('Error loading history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific history item with files
app.get('/api/code-generator/history/:id', (req, res) => {
    try {
        const { id } = req.params;
        const item = loadHistoryItem(id);
        res.json(item);
    } catch (error) {
        console.error('Error loading history item:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete single history item
app.delete('/api/code-generator/history/:id', (req, res) => {
    console.log(`   🗑️  DELETE request for history item: ${req.params.id}`);

    try {
        const { id } = req.params;
        const historyFolder = join(historyRoot, id);

        if (!existsSync(historyFolder)) {
            console.log(`   ❌  History item not found: ${id}`);
            res.setHeader('Content-Type', 'application/json');
            return res.status(404).json({ error: 'History item not found' });
        }

        // Recursive delete
        const deleteRecursive = (dirPath) => {
            const entries = readdirSync(dirPath, { withFileTypes: true });
            entries.forEach(entry => {
                const fullPath = join(dirPath, entry.name);
                if (entry.isDirectory()) {
                    deleteRecursive(fullPath);
                } else {
                    unlinkSync(fullPath);
                }
            });
            rmdirSync(dirPath);
        };

        deleteRecursive(historyFolder);
        console.log(`   ✅  Deleted history item: ${id}`);
        res.setHeader('Content-Type', 'application/json');
        res.json({ success: true, message: 'History item deleted' });

    } catch (error) {
        console.error('   ❌  Error deleting history item:', error);
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({ error: error.message });
    }
});

// Delete entire history
app.delete('/api/code-generator/history', (req, res) => {
    try {
        if (existsSync(historyRoot)) {
            // Delete all subdirectories
            const folders = readdirSync(historyRoot, { withFileTypes: true })
                .filter(entry => entry.isDirectory());

            folders.forEach(folder => {
                const folderPath = join(historyRoot, folder.name);
                // Recursive delete
                const deleteRecursive = (dirPath) => {
                    const entries = readdirSync(dirPath, { withFileTypes: true });
                    entries.forEach(entry => {
                        const fullPath = join(dirPath, entry.name);
                        if (entry.isDirectory()) {
                            deleteRecursive(fullPath);
                        } else {
                            unlinkSync(fullPath);
                        }
                    });
                    rmdirSync(dirPath);
                };
                deleteRecursive(folderPath);
            });

            console.log('   🗑️  Cleared all history');
            res.json({ success: true, message: 'History cleared successfully' });
        } else {
            res.json({ success: true, message: 'No history to clear' });
        }
    } catch (error) {
        console.error('Error clearing history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete generated files from actual project
app.post('/api/code-generator/delete-from-project', async (req, res) => {
    console.log('   🗑️  DELETE FROM PROJECT request received');

    try {
        const { projectId, files, moduleName, moduleType } = req.body;

        if (!projectId || !files || !Array.isArray(files)) {
            return res.status(400).json({ error: 'Missing required parameters: projectId, files' });
        }

        // Get project path using MCP tool
        const projectsResult = await callMcpTool('list_apostrophe_projects', {});

        // Fix: Handle MCP response format properly
        let projects;
        if (typeof projectsResult === 'string') {
            projects = JSON.parse(projectsResult);
        } else if (projectsResult.content && projectsResult.content[0]) {
            projects = JSON.parse(projectsResult.content[0].text);
        } else {
            projects = projectsResult;
        }

        const project = projects.find(p => p.id === projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const deletedFiles = [];
        const failedFiles = [];
        const deletedDirs = [];
        const revertedRegistrations = [];

        // Step 1: Remove module registration from modules.js
        if (moduleName && moduleType) {
            try {
                let subdirectory;
                let moduleKey;

                if (moduleType === 'bundle') {
                    subdirectory = 'pieces';
                    moduleKey = `'${moduleName}-module'`;
                } else {
                    subdirectory = moduleType === 'widget' ? 'widgets' : (moduleType === 'piece' ? 'pieces' : 'pages');
                    const registrationName = moduleType === 'widget' ? `${moduleName}-widget` : moduleName;
                    moduleKey = `'${registrationName}'`;
                }

                const modulesJsPath = join(project.path, 'modules', subdirectory, 'modules.js');

                if (existsSync(modulesJsPath)) {
                    let content = readFileSync(modulesJsPath, 'utf8');
                    const originalContent = content;

                    // Remove the module entry
                    // Pattern: 'module-name': {},
                    const moduleEntryPattern = new RegExp(`\\s*${moduleKey.replace(/'/g, "\\'")}\\s*:\\s*\\{[^}]*\\},?\\s*`, 'g');
                    content = content.replace(moduleEntryPattern, '');

                    // Clean up trailing commas before closing brace
                    content = content.replace(/,(\s*)\}/g, '$1}');

                    if (content !== originalContent) {
                        writeFileSync(modulesJsPath, content, 'utf8');
                        revertedRegistrations.push(`Removed from ${subdirectory}/modules.js`);
                        console.log(`   ✅  Removed module registration from ${subdirectory}/modules.js`);
                    }
                }
            } catch (error) {
                console.error(`   ⚠️  Failed to remove module registration:`, error.message);
            }
        }

        // Step 2: Remove SCSS imports from index.scss
        try {
            const mainScssPath = join(project.path, 'modules', 'asset', 'ui', 'src', 'index.scss');

            if (existsSync(mainScssPath)) {
                let scssContent = readFileSync(mainScssPath, 'utf8');
                const originalScssContent = scssContent;

                // Extract SCSS file names from the files array
                const scssFiles = files.filter(f => f.path.includes('modules/asset/ui/src/scss/') && f.path.endsWith('.scss'));

                scssFiles.forEach(file => {
                    const match = file.path.match(/\/scss\/(components|pages)\/_([^/]+)\.scss$/);
                    if (match) {
                        const [, subdir, name] = match;
                        const importStatement = `@import "./scss/${subdir}/_${name}";`;

                        // Remove the import statement (with optional newline)
                        scssContent = scssContent.replace(new RegExp(`${importStatement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'g'), '');
                    }
                });

                if (scssContent !== originalScssContent) {
                    writeFileSync(mainScssPath, scssContent, 'utf8');
                    revertedRegistrations.push('Removed SCSS imports from index.scss');
                    console.log(`   ✅  Removed SCSS imports from index.scss`);
                }
            }
        } catch (error) {
            console.error(`   ⚠️  Failed to remove SCSS imports:`, error.message);
        }

        // Step 3: Remove page registration from page/index.js (for pages only)
        if (moduleType === 'page' && moduleName) {
            try {
                const pageIndexPath = join(project.path, 'modules', '@apostrophecms', 'page', 'index.js');

                if (existsSync(pageIndexPath)) {
                    let content = readFileSync(pageIndexPath, 'utf8');
                    const originalContent = content;

                    // Remove from types array
                    // Pattern: { name: 'module-name', label: 'Module Label' },
                    const typeEntryPattern = new RegExp(`\\s*\\{\\s*name:\\s*'${moduleName}'[^}]*\\},?\\s*`, 'g');
                    content = content.replace(typeEntryPattern, '');

                    // Remove from park array
                    // Pattern: { title: '...', slug: '...', type: 'module-name', parkedId: '...' },
                    const parkEntryPattern = new RegExp(`\\s*\\{[^}]*type:\\s*'${moduleName}'[^}]*\\},?\\s*`, 'g');
                    content = content.replace(parkEntryPattern, '');

                    // Clean up trailing commas before closing brackets
                    content = content.replace(/,(\s*)\]/g, '$1]');

                    if (content !== originalContent) {
                        writeFileSync(pageIndexPath, content, 'utf8');
                        revertedRegistrations.push('Removed page registration from page/index.js');
                        console.log(`   ✅  Removed page registration from page/index.js`);
                    }
                }
            } catch (error) {
                console.error(`   ⚠️  Failed to remove page registration:`, error.message);
            }
        }

        // Step 4: Delete files
        const skippedCommonFunctions = [];

        for (const file of files) {
            // CRITICAL: Never delete the global asset module - it may contain functions used by other modules
            if (file.path === 'modules/asset/ui/src/index.js') {
                skippedCommonFunctions.push(file.path);
                console.log(`   ⚠️  Skipped: ${file.path} (contains shared functions - must be manually cleaned if needed)`);
                continue;
            }

            const filePath = join(project.path, file.path);

            try {
                if (existsSync(filePath)) {
                    unlinkSync(filePath);
                    deletedFiles.push(file.path);
                    console.log(`   ✅  Deleted: ${file.path}`);
                } else {
                    console.log(`   ⚠️  File not found (already deleted?): ${file.path}`);
                }
            } catch (error) {
                console.error(`   ❌  Failed to delete ${file.path}:`, error.message);
                failedFiles.push({ path: file.path, error: error.message });
            }
        }

        // Step 5: Clean up empty directories
        const cleanupEmptyDirs = (dirPath) => {
            try {
                if (!existsSync(dirPath)) return;

                const entries = readdirSync(dirPath);

                // Recursively clean subdirectories first
                entries.forEach(entry => {
                    const fullPath = join(dirPath, entry);
                    if (existsSync(fullPath)) {
                        const stats = require('fs').lstatSync(fullPath);
                        if (stats.isDirectory()) {
                            cleanupEmptyDirs(fullPath);
                        }
                    }
                });

                // Check if directory is now empty
                const remainingEntries = readdirSync(dirPath);
                if (remainingEntries.length === 0) {
                    rmdirSync(dirPath);
                    const relativePath = dirPath.replace(project.path + '/', '');
                    deletedDirs.push(relativePath);
                    console.log(`   🗂️  Removed empty directory: ${relativePath}`);
                }
            } catch (error) {
                // Silently ignore directory cleanup errors
            }
        };

        // Get unique directories from deleted files
        const directories = new Set();
        deletedFiles.forEach(file => {
            const parts = file.split('/');
            for (let i = parts.length - 1; i > 0; i--) {
                const dir = join(project.path, parts.slice(0, i).join('/'));
                directories.add(dir);
            }
        });

        // Clean up from deepest to shallowest
        Array.from(directories)
            .sort((a, b) => b.split('/').length - a.split('/').length)
            .forEach(dir => cleanupEmptyDirs(dir));

        console.log(`   ✅  Deleted ${deletedFiles.length} file(s) from project`);
        if (deletedDirs.length > 0) {
            console.log(`   🗂️  Removed ${deletedDirs.length} empty director(ies)`);
        }
        if (revertedRegistrations.length > 0) {
            console.log(`   ✅  Reverted ${revertedRegistrations.length} registration(s)`);
        }
        if (skippedCommonFunctions.length > 0) {
            console.log(`   ⚠️  Skipped ${skippedCommonFunctions.length} shared function file(s) (must be manually cleaned if needed)`);
        }

        // Build success message
        let message = `Deleted ${deletedFiles.length} file(s), removed ${deletedDirs.length} empty director(ies), and reverted ${revertedRegistrations.length} registration(s) from ${project.name}`;
        if (skippedCommonFunctions.length > 0) {
            message += `. Note: ${skippedCommonFunctions.length} shared function file(s) preserved (${skippedCommonFunctions.join(', ')})`;
        }

        res.json({
            success: true,
            deletedFiles: deletedFiles.length,
            deletedDirectories: deletedDirs.length,
            revertedRegistrations: revertedRegistrations.length,
            skippedFiles: skippedCommonFunctions.length,
            failedFiles: failedFiles.length,
            details: {
                deleted: deletedFiles,
                directories: deletedDirs,
                reverted: revertedRegistrations,
                skipped: skippedCommonFunctions,
                failed: failedFiles
            },
            message: message
        });

    } catch (error) {
        console.error('   ❌  Error deleting files from project:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🎨 Apostrophe Code Generator`);
    console.log(`   Server running on http://localhost:${PORT}`);
    console.log(`   Using MCP backend (mcp-server/index.js)`);
    console.log(`   All code generation handled via MCP tools\n`);
});
