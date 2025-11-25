/**
 * Code generation helper for MCP server
 * Contains all the prompt building and Claude calling logic
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { extractDesignTokens, generateTokenAwareSCSS, formatTokensForPrompt } from './design-token-parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DOCS_PATH = join(__dirname, '..', 'server', 'apostrophe-docs');

/**
 * Get available asset functions from project
 */
function getAvailableAssetFunctions(project) {
  try {
    const assetIndexPath = join(project.path, 'modules', 'asset', 'ui', 'src', 'index.js');

    if (!existsSync(assetIndexPath)) {
      return { available: false, functions: [] };
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
      available: true,
      functions: [...new Set(functions)].sort() // Remove duplicates and sort
    };
  } catch (error) {
    console.error('Error reading asset functions:', error.message);
    return { available: false, functions: [] };
  }
}

/**
 * Generate module using Claude CLI
 */
export async function generateModule(options) {
  const { project, type, name, label, description, includeBemStyles, fullDesign = false, bundleContext } = options;

  const subdirectory = type === 'widget' ? 'widgets' : (type === 'piece' ? 'pieces' : 'pages');
  // Widgets should always have -widget suffix in their folder name
  const folderName = type === 'widget' ? `${name}-widget` : name;
  const correctPath = `modules/${subdirectory}/${folderName}`;

  // Build BEM guidance (not strict requirements)
  const bemGuidance = includeBemStyles ? buildBemGuidance(name, type) : '';

  // Get available asset functions for the project
  const availableFunctions = getAvailableAssetFunctions(project);

  // Extract design tokens BEFORE calling Claude (whenever BEM styles are requested)
  let designTokens = null;
  if (includeBemStyles) {
    console.error(`\n🎨 Extracting design tokens for SCSS generation...`);
    designTokens = extractDesignTokens(project.path);
    if (designTokens.success) {
      console.error(`✅ Found ${designTokens.tokens.total} design tokens`);
    } else {
      console.error(`⚠️  Could not extract design tokens: ${designTokens.error}`);
      console.error(`⚠️  Will generate basic SCSS without tokens`);
    }
  }

  // Build the prompt
  const prompt = buildPrompt({
    type,
    name,
    label,
    description,
    correctPath,
    bemGuidance,
    includeBemStyles,
    fullDesign,
    designTokens,
    bundleContext,
    projectName: project.name,
    availableFunctions
  });

  console.error(`Generating ${type}: ${name} for project ${project.name}`);

  // Call Claude CLI (with extended timeout for complex operations)
  // Pages need more time, especially piece-page-types (index.html + show.html)
  // Full design mode needs even more time for SCSS generation
  let timeoutMs = 60000; // Default: 60s

  if (type === 'page') {
    timeoutMs = fullDesign ? 180000 : 120000; // 3min for fullDesign pages, 2min for regular pages
  } else if (fullDesign) {
    timeoutMs = 120000; // 2min for fullDesign widgets/pieces
  }

  console.error(`⏱️  Timeout set to ${timeoutMs/1000}s for ${type}${fullDesign ? ' (fullDesign mode)' : ''}`);

  // Warn about long operations
  if (timeoutMs >= 120000) {
    console.error(`⚠️  This operation may take 1-3 minutes. Please wait...`);
    if (type === 'page' && bundleContext?.isPartOfBundle) {
      console.error(`   (Generating piece-page with index.html + show.html templates)`);
    }
    if (fullDesign) {
      console.error(`   (Full Design mode generates production-ready SCSS)`);
    }
  }

  // Log prompt size (important for debugging stdin vs argument length issues)
  const promptLines = prompt.split('\n').length;
  const promptBytes = Buffer.byteLength(prompt, 'utf8');
  console.error(`📝 Prompt: ${promptLines} lines, ${(promptBytes / 1024).toFixed(1)}KB`);
  if (promptBytes > 100000) {
    console.error(`   ⚠️  Large prompt (>100KB) - using stdin to avoid command-line limits`);
  }

  let response = await callClaude(prompt, timeoutMs);

  // DEBUG: Log raw response
  console.error(`\n📥 RAW CLAUDE RESPONSE (first 500 chars):`);
  console.error(response.substring(0, 500));
  console.error(`\n📏 Total response length: ${response.length} characters\n`);

  // Parse response - extract ONLY the JSON object, nothing after it
  let cleaned = response.trim();

  // Remove code fences
  cleaned = cleaned.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
  cleaned = cleaned.replace(/^```\s*/m, '').replace(/\s*```$/m, '');

  // Find the first { and match braces to find the complete JSON object
  let firstBrace = cleaned.indexOf('{');

  // RETRY MECHANISM: If Claude returned text instead of JSON, retry once with a simpler prompt
  if (firstBrace === -1) {
    console.error(`\n⚠️  Claude returned text instead of JSON. Retrying with JSON-only prompt...`);

    const retryPrompt = `You previously generated a description instead of JSON. I need you to convert this description into the required JSON format.

Previous response (convert this to JSON):
${cleaned.substring(0, 2000)}

REQUIRED OUTPUT FORMAT - Return ONLY this JSON structure:
{
  "files": [
    {
      "path": "${correctPath}/index.js",
      "content": "export default { extend: '${type === 'page' && bundleContext?.isPartOfBundle ? '@apostrophecms/piece-page-type' : '@apostrophecms/' + type + '-type'}', ... };"
    },
    {
      "path": "${correctPath}/views/${type === 'widget' ? 'widget' : (type === 'page' && bundleContext?.isPartOfBundle ? 'index' : 'page')}.html",
      "content": "<!-- HTML template -->"
    }${type === 'page' && bundleContext?.isPartOfBundle ? `,
    {
      "path": "${correctPath}/views/show.html",
      "content": "<!-- Show template -->"
    }` : ''}
  ]
}

⚠️ CRITICAL: Your ENTIRE response must be ONLY the JSON object above.
- Start with { immediately
- No text before or after
- No markdown code blocks
- No explanations

START WITH { NOW:`;

    try {
      response = await callClaude(retryPrompt, timeoutMs);
      console.error(`\n📥 RETRY RESPONSE (first 500 chars):`);
      console.error(response.substring(0, 500));

      cleaned = response.trim();
      cleaned = cleaned.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
      cleaned = cleaned.replace(/^```\s*/m, '').replace(/\s*```$/m, '');
      firstBrace = cleaned.indexOf('{');
    } catch (retryError) {
      console.error(`\n❌ Retry also failed: ${retryError.message}`);
    }
  }

  if (firstBrace === -1) {
    console.error(`\n❌ PARSE ERROR - Could not find opening { in response (even after retry)`);
    console.error(`\n📏 Response length: ${cleaned.length} characters`);
    console.error(`\n📄 FULL CLEANED RESPONSE (first 2000 chars):\n${cleaned.substring(0, 2000)}`);
    if (cleaned.length > 2000) {
      console.error(`\n... (${cleaned.length - 2000} more characters)`);
      console.error(`\nLAST 500 chars:\n${cleaned.substring(cleaned.length - 500)}`);
    }

    // If response is very short, Claude likely returned an error or refusal
    if (cleaned.length < 200) {
      throw new Error(`Claude returned invalid response: "${cleaned.substring(0, 150)}"`);
    }

    // Check if it's a plain text response instead of JSON
    if (cleaned.toLowerCase().includes('error') || cleaned.toLowerCase().includes('cannot') || cleaned.toLowerCase().includes('unable')) {
      throw new Error(`Claude returned an error message instead of JSON: "${cleaned.substring(0, 300)}..."`);
    }

    throw new Error(`Could not find valid JSON in Claude response. Response starts with: "${cleaned.substring(0, 200)}..."\n\nPlease try again. If this persists, try simplifying your description.`);
  }

  // Extract JSON by counting braces
  let braceCount = 0;
  let jsonEnd = firstBrace;
  for (let i = firstBrace; i < cleaned.length; i++) {
    if (cleaned[i] === '{') braceCount++;
    if (cleaned[i] === '}') braceCount--;
    if (braceCount === 0) {
      jsonEnd = i + 1;
      break;
    }
  }

  const jsonString = cleaned.substring(firstBrace, jsonEnd);

  console.error(`\n📋 Extracted JSON (${jsonString.length} chars)`);
  console.error(`First 500 chars: ${jsonString.substring(0, 500)}`);

  let result;
  try {
    result = JSON.parse(jsonString);
  } catch (parseError) {
    console.error(`\n❌ JSON PARSE ERROR: ${parseError.message}`);
    console.error(`\nAttempted to parse (first 1000 chars):\n${jsonString.substring(0, 1000)}`);

    // Try to clean common issues
    let fixedJson = jsonString;

    // Remove trailing commas before } or ]
    fixedJson = fixedJson.replace(/,(\s*[\}\]])/g, '$1');

    // Remove leading commas after { or [
    fixedJson = fixedJson.replace(/([\{\[])\s*,/g, '$1');

    // Remove double commas
    fixedJson = fixedJson.replace(/,\s*,/g, ',');

    // Remove commas before colons (invalid: "key":, "value")
    fixedJson = fixedJson.replace(/,(\s*:)/g, '$1');

    console.error(`\n🔧 Attempting to fix JSON issues...`);

    // Try parsing the fixed version
    try {
      result = JSON.parse(fixedJson);
      console.error(`✅ Successfully parsed after automatic fixes`);
    } catch (retryError) {
      console.error(`\n❌ Still failed after cleanup: ${retryError.message}`);
      console.error(`\nOriginal JSON (first 1000 chars):\n${jsonString.substring(0, 1000)}`);
      console.error(`\nFixed JSON (first 1000 chars):\n${fixedJson.substring(0, 1000)}`);
      throw new Error(`Failed to parse JSON: ${parseError.message}`);
    }
  }

  if (!result.files || !Array.isArray(result.files)) {
    throw new Error('Invalid response format: missing files array');
  }

  // DEBUG: Log what Claude returned
  console.error(`\n=== CLAUDE RESPONSE DEBUG ===`);
  console.error(`Module: ${type}/${name}`);
  console.error(`Files returned by Claude: ${result.files.length}`);
  console.error(`File paths:`);
  result.files.forEach((f, idx) => {
    console.error(`  ${idx + 1}. ${f.path}`);
  });
  console.error(`=== END DEBUG ===\n`);

  // Now analyze the generated HTML and create matching SCSS (if not already provided by Claude)
  if (includeBemStyles) {
    // Check if Claude already provided SCSS (for fullDesign mode)
    const scssSubdir = type === 'page' ? 'pages' : 'components';
    const scssPath = `modules/asset/ui/src/scss/${scssSubdir}/_${name}.scss`;
    const claudeProvidedScss = result.files.some(f => f.path === scssPath);

    if (claudeProvidedScss && fullDesign) {
      console.error(`✅ Claude provided production-ready SCSS in fullDesign mode`);

      // Validate SCSS for undefined variables
      const scssFile = result.files.find(f => f.path === scssPath);
      if (scssFile && designTokens && designTokens.success) {
        const undefinedVars = validateScssVariables(scssFile.content, designTokens, name);
        if (undefinedVars.length > 0) {
          // Add warning note to result
          const warningNote = `⚠️ WARNING: Generated SCSS contains ${undefinedVars.length} undefined variable(s): ${undefinedVars.join(', ')}. These must be replaced with plain CSS (hex colors, rem values, etc.) before the SCSS will compile.`;
          result.scssWarning = warningNote;
          if (result.registrationNote) {
            result.registrationNote += `\n\n${warningNote}`;
          } else {
            result.registrationNote = warningNote;
          }
        }
      }
    } else if (claudeProvidedScss) {
      console.error(`✅ Claude provided SCSS file`);

      // Validate SCSS for undefined variables
      const scssFile = result.files.find(f => f.path === scssPath);
      if (scssFile && designTokens && designTokens.success) {
        const undefinedVars = validateScssVariables(scssFile.content, designTokens, name);
        if (undefinedVars.length > 0) {
          // Add warning note to result
          const warningNote = `⚠️ WARNING: Generated SCSS contains ${undefinedVars.length} undefined variable(s): ${undefinedVars.join(', ')}. These must be replaced with plain CSS (hex colors, rem values, etc.) before the SCSS will compile.`;
          result.scssWarning = warningNote;
          if (result.registrationNote) {
            result.registrationNote += `\n\n${warningNote}`;
          } else {
            result.registrationNote = warningNote;
          }
        }
      }
    } else {
      // Generate SCSS ourselves since Claude didn't provide it
    // For piece-pages, we need to analyze both index.html and show.html
    const templateFiles = result.files.filter(f =>
      f.path.includes('/views/widget.html') ||
      f.path.includes('/views/page.html') ||
      f.path.includes('/views/index.html') ||
      f.path.includes('/views/show.html')
    );

    if (templateFiles.length > 0) {
      console.error(`Analyzing HTML to extract classes from ${templateFiles.length} template(s)...`);

      // Extract classes from all templates
      const allClasses = new Set();
      templateFiles.forEach(file => {
        const classes = extractClassesFromHtml(file.content);
        classes.forEach(c => allClasses.add(c));
      });

      const classesArray = Array.from(allClasses).sort();
      console.error(`Found ${classesArray.length} unique classes across all templates, generating SCSS...`);

      // Combine all HTML content for analysis
      const combinedHtml = templateFiles.map(f => f.content).join('\n');

      // Generate token-aware SCSS using design tokens
      // fullDesign mode will use Claude's creative output, basic mode uses templates
      const scssContent = generateTokenAwareSCSS(name, type, classesArray, combinedHtml, designTokens, fullDesign);

      result.files.push({
        path: scssPath,
        content: scssContent
      });
    }
    } // End of else - generate SCSS ourselves
  }

  // POST-PROCESSING: Fix image field references in templates
  // This ensures template field names match schema field names and use correct Apostrophe patterns
  result.files = fixImageFieldReferences(result.files, type);

  // Note: Page registration is now handled automatically in saveModuleFiles()
  // No manual registration note needed anymore

  return {
    files: result.files,
    moduleName: name,
    moduleType: type,
  };
}

/**
 * Extract all classes from HTML content
 */
function extractClassesFromHtml(html) {
  const classPattern = /class=["']([^"']+)["']/g;
  const allClasses = new Set();

  let match;
  while ((match = classPattern.exec(html)) !== null) {
    // Split by spaces to handle multiple classes
    const classes = match[1].split(/\s+/).filter(c => c.trim());
    classes.forEach(c => {
      // Skip Nunjucks template variables and empty strings
      if (!c.includes('{{') && !c.includes('{%') && c.trim()) {
        allClasses.add(c.trim());
      }
    });
  }

  return Array.from(allClasses).sort();
}

/**
 * Extract image area fields from schema (index.js content)
 * Returns array of field names that are image areas
 */
function extractImageFieldsFromSchema(indexJsContent) {
  const imageFields = [];

  // Normalize content for easier matching (remove excessive whitespace)
  const normalized = indexJsContent.replace(/\s+/g, ' ');

  // Match field definitions that are areas with image widgets
  // Pattern: fieldName: { type: 'area', ... widgets: { '@apostrophecms/image': {} } }
  // Use multiline-safe pattern
  const fieldPattern = /(\w+):\s*\{\s*(?:label:\s*['"][^'"]*['"]\s*,\s*)?type:\s*['"]area['"][^}]*@apostrophecms\/image/g;

  let match;
  while ((match = fieldPattern.exec(normalized)) !== null) {
    if (!imageFields.includes(match[1])) {
      imageFields.push(match[1]);
    }
  }

  // Also look for common image field naming patterns with area type
  // Common names: featuredImage, heroImage, coverImage, backgroundImage, image, thumbnail
  const commonImageNames = /\b(featuredImage|heroImage|coverImage|backgroundImage|mainImage|image|thumbnail|photo|banner|avatar):\s*\{[^}]*type:\s*['"]area['"]/gi;
  while ((match = commonImageNames.exec(normalized)) !== null) {
    const fieldName = match[1];
    if (!imageFields.includes(fieldName)) {
      imageFields.push(fieldName);
    }
  }

  // Match relationship fields to images (e.g., _featuredImage with withType: '@apostrophecms/image')
  const relationshipPattern = /(_?\w+):\s*\{[^}]*type:\s*['"]relationship['"][^}]*withType:\s*['"]@apostrophecms\/image['"]/g;
  while ((match = relationshipPattern.exec(normalized)) !== null) {
    if (!imageFields.includes(match[1])) {
      imageFields.push(match[1]);
    }
  }

  // Parse more thoroughly - look for add: { ... } section and find all area fields with image widgets
  const addSectionMatch = normalized.match(/add:\s*\{([\s\S]*?)\}\s*(?:,\s*group:|$)/);
  if (addSectionMatch) {
    const addSection = addSectionMatch[1];
    // Find all field names followed by area type and containing image widget
    const detailedPattern = /(\w+):\s*\{[^{}]*type:\s*['"]area['"][^{}]*widgets:\s*\{[^{}]*['"]@apostrophecms\/image['"]/g;
    while ((match = detailedPattern.exec(addSection)) !== null) {
      if (!imageFields.includes(match[1])) {
        imageFields.push(match[1]);
      }
    }
  }

  return [...new Set(imageFields)]; // Remove duplicates
}

/**
 * Generate the correct Apostrophe image block for templates
 */
function generateCorrectImageBlock(contextVar, fieldName, bemClass = '') {
  const imgVar = `__img_${fieldName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const classAttr = bemClass ? ` class="${bemClass}"` : '';

  return `{% if ${contextVar}.${fieldName} %}
            {% set ${imgVar} = apos.image.first(${contextVar}.${fieldName}) %}
            {% if ${imgVar} %}
              <img${classAttr} src="{{ apos.attachment.url(${imgVar}, { size: 'one-half' }) }}" alt="{{ ${contextVar}.title }}">
            {% endif %}
          {% endif %}`;
}

/**
 * Fix image field references in templates to match schema field names
 * and use correct Apostrophe image access patterns
 *
 * CORRECT PATTERN (what we want):
 * {% if piece.featuredImage %}
 *   {% set image = apos.image.first(piece.featuredImage) %}
 *   {% if image %}
 *     <img src="{{ apos.attachment.url(image, { size: 'one-half' }) }}" alt="{{ piece.title }}">
 *   {% endif %}
 * {% endif %}
 */
function fixImageFieldReferences(files, moduleType) {
  // Find the index.js file to extract schema
  const indexFile = files.find(f => f.path.endsWith('/index.js'));
  if (!indexFile) {
    console.error(`⚠️  No index.js found, skipping image field validation`);
    return files;
  }

  // Extract image field names from schema
  const imageFields = extractImageFieldsFromSchema(indexFile.content);

  if (imageFields.length === 0) {
    console.error(`ℹ️  No image area fields found in schema`);
    return files;
  }

  console.error(`\n🖼️  Found ${imageFields.length} image field(s) in schema: ${imageFields.join(', ')}`);

  // Determine the data context based on module type
  const dataContext = moduleType === 'widget' ? 'data.widget'
    : moduleType === 'piece' ? 'data.piece'
    : 'data.page';

  // Find template files
  const templateFiles = files.filter(f =>
    f.path.includes('/views/') && f.path.endsWith('.html')
  );

  if (templateFiles.length === 0) {
    return files;
  }

  console.error(`🔧 Checking ${templateFiles.length} template file(s) for image field references...`);

  // Process each template file
  return files.map(file => {
    if (!file.path.includes('/views/') || !file.path.endsWith('.html')) {
      return file;
    }

    let content = file.content;
    let fixCount = 0;

    // Determine if this is a piece-page template (index.html or show.html)
    const isIndexHtml = file.path.endsWith('/index.html');
    const isShowHtml = file.path.endsWith('/show.html');

    // Determine the correct context variable for this template
    // - index.html: uses 'piece' in loop ({% for piece in data.pieces %})
    // - show.html: uses 'data.piece'
    // - widget.html: uses 'data.widget'
    // - page.html: uses 'data.page'
    const contextVar = isIndexHtml ? 'piece'
      : isShowHtml ? 'data.piece'
      : dataContext;

    // First, fix wrong field names (e.g., piece.image → piece.featuredImage)
    if (imageFields.length > 0) {
      const primaryImageField = imageFields[0];

      // Common wrong field names Claude might use
      const wrongNames = ['image', 'img', 'photo', 'picture', 'thumbnail', 'cover', 'coverImage', 'mainImage'];
      for (const wrongName of wrongNames) {
        if (!imageFields.includes(wrongName)) {
          // Replace wrong field name with correct one from schema
          // Match patterns like: piece.image, data.piece.image, data.widget.image
          const wrongPatterns = [
            new RegExp(`\\bpiece\\.(${wrongName})(?![\\w])`, 'g'),
            new RegExp(`data\\.piece\\.(${wrongName})(?![\\w])`, 'g'),
            new RegExp(`data\\.widget\\.(${wrongName})(?![\\w])`, 'g'),
            new RegExp(`data\\.page\\.(${wrongName})(?![\\w])`, 'g'),
          ];

          for (const pattern of wrongPatterns) {
            const before = content;
            content = content.replace(pattern, (match, name) => {
              return match.replace(name, primaryImageField);
            });
            if (content !== before) {
              console.error(`   🔧 Fixed field name: ${wrongName} → ${primaryImageField}`);
              fixCount++;
            }
          }
        }
      }
    }

    // Now fix incorrect image access patterns for each image field
    for (const fieldName of imageFields) {
      const ctxPattern = contextVar.replace('.', '\\.');

      // Pattern 1: Direct output {{ piece.fieldName }} - completely wrong
      const directOutputPattern = new RegExp(
        `\\{\\{\\s*(?:${ctxPattern}|piece)\\.${fieldName}\\s*\\}\\}`,
        'g'
      );
      if (directOutputPattern.test(content)) {
        const replacement = generateCorrectImageBlock(contextVar.includes('.') ? contextVar : 'piece', fieldName);
        content = content.replace(directOutputPattern, replacement);
        console.error(`   🔧 Fixed direct output pattern for ${fieldName}`);
        fixCount++;
      }

      // Pattern 2: src="{{ piece.fieldName.url }}" or src="{{ piece.fieldName._url }}"
      const srcUrlPattern = new RegExp(
        `<img([^>]*)src=["']\\{\\{\\s*(?:${ctxPattern}|piece)\\.${fieldName}(?:\\.(?:url|_url))?\\s*\\}\\}["']([^>]*)>`,
        'g'
      );
      if (srcUrlPattern.test(content)) {
        const ctx = contextVar.includes('.') ? contextVar : 'piece';
        const imgVar = `__img_${fieldName}`;
        const replacement = `{% set ${imgVar} = apos.image.first(${ctx}.${fieldName}) %}{% if ${imgVar} %}<img$1src="{{ apos.attachment.url(${imgVar}, { size: 'one-half' }) }}"$2>{% endif %}`;
        content = content.replace(srcUrlPattern, replacement);
        console.error(`   🔧 Fixed src URL pattern for ${fieldName}`);
        fixCount++;
      }

      // Pattern 3: Has {% if piece.fieldName %} but missing apos.image.first()
      // Check if the field is referenced but apos.image.first is not used with it
      const fieldRegex = new RegExp(`(?:${ctxPattern}|piece)\\.${fieldName}`, 'g');
      const hasFieldRef = fieldRegex.test(content);
      const hasCorrectAccess = content.includes(`apos.image.first`) &&
        (content.includes(`apos.image.first(${contextVar}.${fieldName})`) ||
         content.includes(`apos.image.first(piece.${fieldName})`));

      if (hasFieldRef && !hasCorrectAccess) {
        // Find and fix any img tag that references this field incorrectly
        const imgTagPattern = new RegExp(
          `<img[^>]*\\{\\{[^}]*(?:${ctxPattern}|piece)\\.${fieldName}[^}]*\\}\\}[^>]*>`,
          'g'
        );

        const matches = content.match(imgTagPattern);
        if (matches) {
          for (const match of matches) {
            const ctx = contextVar.includes('.') ? contextVar : 'piece';
            const imgVar = `__img_${fieldName}`;
            // Extract any existing class attribute
            const classMatch = match.match(/class=["']([^"']*)["']/);
            const classAttr = classMatch ? ` class="${classMatch[1]}"` : '';

            const replacement = `{% set ${imgVar} = apos.image.first(${ctx}.${fieldName}) %}
            {% if ${imgVar} %}
              <img${classAttr} src="{{ apos.attachment.url(${imgVar}, { size: 'one-half' }) }}" alt="{{ ${ctx}.title }}">
            {% endif %}`;

            content = content.replace(match, replacement);
            console.error(`   🔧 Fixed img tag pattern for ${fieldName}`);
            fixCount++;
          }
        }
      }

      // Pattern 4: Fix any remaining {{ piece.fieldName.attachment... }} patterns
      const attachmentPattern = new RegExp(
        `\\{\\{\\s*(?:${ctxPattern}|piece)\\.${fieldName}\\.attachment[^}]*\\}\\}`,
        'g'
      );
      if (attachmentPattern.test(content)) {
        const ctx = contextVar.includes('.') ? contextVar : 'piece';
        const replacement = `{{ apos.attachment.url(apos.image.first(${ctx}.${fieldName}), { size: 'one-half' }) }}`;
        content = content.replace(attachmentPattern, replacement);
        console.error(`   🔧 Fixed attachment pattern for ${fieldName}`);
        fixCount++;
      }
    }

    if (fixCount > 0) {
      console.error(`   ✅ Fixed ${fixCount} image reference(s) in ${file.path}`);
    }

    return { ...file, content };
  });
}

// Note: generateScssFromClasses removed - now using generateTokenAwareSCSS from design-token-parser.js

/**
 * Load a prompt template from external file
 */
function loadPromptTemplate(templateName) {
  try {
    const templatePath = join(DOCS_PATH, 'prompts', templateName);
    return readFileSync(templatePath, 'utf-8');
  } catch (error) {
    console.error(`Warning: Could not load template ${templateName}:`, error.message);
    return '';
  }
}

/**
 * Build BEM guidance for prompt (loaded from external file)
 */
function buildBemGuidance(name, type) {
  const template = loadPromptTemplate('bem-guidance.md');

  if (!template) {
    // Fallback to minimal inline guidance if file not found
    return `Use BEM classes: .${name}, .${name}__element, .${name}--modifier`;
  }

  // Replace placeholders
  return template
    .replace(/{MODULE_NAME}/g, name)
    .replace(/{MODULE_TYPE}/g, type);
}

/**
 * Build Claude prompt from external templates
 */
function buildPrompt({ type, name, label, description, correctPath, bemGuidance, includeBemStyles, fullDesign, designTokens, bundleContext, projectName, availableFunctions }) {
  const isPartOfBundle = bundleContext?.isPartOfBundle || false;
  const basePieceName = bundleContext?.basePieceName || name;

  // Load common rules
  const commonRules = loadPromptTemplate('common-rules.md');

  // Load type-specific template
  const templateName = `${type}-prompt.md`;
  let typeTemplate = loadPromptTemplate(templateName);

  // Fallback to hardcoded if templates not found
  if (!typeTemplate) {
    console.error(`Warning: Template ${templateName} not found, using fallback`);
    return buildFallbackPrompt({ type, name, label, description, correctPath, bemGuidance, includeBemStyles, bundleContext });
  }

  // Build user instructions section
  const userInstructions = description ? `
USER INSTRUCTIONS (FOLLOW THESE EXACTLY):
${description}

CRITICAL: Generate ONLY the fields/features described above. Nothing more, nothing less.
If the user says "array with labels", add ONLY that array field.
If the user says "title and content area", add ONLY those two fields.
DO NOT add extra fields you think would be helpful.
` : `
NO USER INSTRUCTIONS PROVIDED.
Generate a minimal ${type} with 2-3 basic fields (string, area, boolean).
`;

  // Build bundle-specific sections
  let bundleContext_text = isPartOfBundle ? ' as part of a bundle' : '';
  let bundleRelationship = '';
  let bundleTemplate = '';
  let bundleInfo = '';
  let bundleTemplates = '';
  let bundleDataAccess = '';
  let extendType = '@apostrophecms/page-type';
  let templatePaths = `- **Template**: ${correctPath}/views/page.html`;

  if (type === 'widget' && isPartOfBundle) {
    bundleRelationship = `
**CRITICAL - BUNDLE WIDGET RELATIONSHIP**:

This widget is part of a bundle with the '${basePieceName}' piece. You MUST add a relationship field to reference pieces.

**REQUIRED FIELD** (add to schema):
\`\`\`javascript
_pieces: {
  label: 'Items',
  type: 'relationship',
  withType: '${basePieceName}',
  builders: {
    project: { aposDocId: 1, title: 1, _url: 1 }
  }
}
\`\`\`

**CRITICAL**:
- Field name MUST be \`_pieces\` (with underscore prefix)
- withType MUST be \`${basePieceName}\` (the piece from this bundle)
- Include \`_pieces\` in the group array: \`fields: ['_pieces', ...other fields]\`

**OPTIONAL**: Add a 'show' select field (values: 'all', 'selected') to let users choose between showing all pieces or only selected ones.
`;
    bundleTemplate = `
**CRITICAL - TEMPLATE MUST USE RELATIONSHIP**:

Your widget template MUST loop through the pieces from the relationship:

\`\`\`nunjucks
{% for piece in data.widget._pieces %}
  <a href="{{ piece._url }}">{{ piece.title }}</a>
{% endfor %}
\`\`\`

Access piece data: \`{{ piece.title }}\`, \`{{ piece._url }}\`, and any other fields from the ${basePieceName} piece schema.
`;
  }

  if (type === 'page' && isPartOfBundle) {
    extendType = '@apostrophecms/piece-page-type';
    bundleInfo = `- CRITICAL: This is a piece-page that displays '${basePieceName}' pieces
- Auto-provides: data.pieces (index view), data.piece (show view)
- Add areas for index page content (displayed on listing page)
- Add areas for show page content (displayed on detail page)
`;
    bundleTemplates = `PAGE TEMPLATES (TWO REQUIRED):
1. views/index.html (piece listing):
   - {% extends 'layout.html' %}
   - {% block main %}...{% endblock %}
   - Loop through pieces: {% for piece in data.pieces %}
   - Link to detail: <a href="{{ piece._url }}">{{ piece.title }}</a>
   - Display index page areas from schema

2. views/show.html (piece detail):
   - {% extends 'layout.html' %}
   - {% block main %}...{% endblock %}
   - Access current piece: {{ data.piece.title }}, {{ data.piece.fieldName }}
   - Display show page areas from schema
   - NO loops - this shows ONE piece
`;
    templatePaths = `- **Index template**: ${correctPath}/views/index.html
- **Show template**: ${correctPath}/views/show.html`;
    bundleDataAccess = `
- **Piece listing**: {% for piece in data.pieces %}
- **Single piece**: {{ data.piece.fieldName }}`;
  }

  // BEM class instructions
  const bemClasses = includeBemStyles ? `- Use BEM classes: .${name}, .${name}__element` : '';

  // 💎 Full Design Mode - Add design tokens to prompt
  let fullDesignSection = '';
  if (fullDesign && designTokens && designTokens.success) {
    const tokenList = formatTokensForPrompt(designTokens);
    // Use correct SCSS subdirectory based on module type
    const scssSubdir = type === 'page' ? 'pages' : 'components';
    fullDesignSection = `

---

## 💎 PROFESSIONAL SCSS REQUIRED

⚠️ ⚠️ ⚠️ **CRITICAL SCSS RULES - VIOLATIONS WILL BREAK COMPILATION** ⚠️ ⚠️ ⚠️

**STEP 1: CHECK IF TOKEN EXISTS**
Before using ANY \`$variable\` or \`@mixin\`, you MUST verify it exists in the "Available tokens" section below.

**STEP 2: IF TOKEN EXISTS → Use it**
**STEP 3: IF TOKEN DOESN'T EXIST → Use plain CSS (hex/rgb/named colors)**

**NEVER INVENT VARIABLES. NEVER GUESS VARIABLE NAMES.**

**❌ FORBIDDEN - DO NOT USE THESE UNLESS IN THE LIST BELOW:**
- \`$white\`, \`$black\`, \`$gray\`, \`$grey\` (use \`#fff\`, \`#000\`, \`#666\` instead)
- \`$primary\`, \`$secondary\`, \`$accent\` (use hex colors instead)
- \`$text-color\`, \`$bg-color\`, \`$background\` (use \`color: #333;\` instead)
- \`$border-color\`, \`$border-radius\`, \`$border-width\` (use \`border: 1px solid #ddd;\` instead)
- \`$spacing\`, \`$padding\`, \`$margin\` (use \`padding: 1rem;\` instead)
- ANY variable not explicitly listed below

**✅ CORRECT EXAMPLES:**

\`\`\`scss
// Token EXISTS in list below (example: $color-text-primary)
.element {
  color: $color-text-primary;  // ✅ CORRECT - found in available tokens
}

// Token DOESN'T EXIST
.element {
  color: #333;                  // ✅ CORRECT - plain CSS
  background: #f5f5f5;          // ✅ CORRECT - plain CSS
  border: 1px solid #ddd;       // ✅ CORRECT - plain CSS
  border-radius: 4px;           // ✅ CORRECT - plain CSS
  padding: 1rem;                // ✅ CORRECT - plain CSS
}
\`\`\`

**❌ WRONG EXAMPLES:**

\`\`\`scss
.element {
  color: $text-color;           // ❌ WRONG - not in available tokens list
  background: $white;           // ❌ WRONG - not in available tokens list
  border: 1px solid $border-color;  // ❌ WRONG - not in available tokens list
}
\`\`\`

**Available tokens in this project:**
${tokenList}

**VALIDATION CHECKLIST (review before submitting):**
1. ✓ Every \`$variable\` I used appears in the available tokens list above
2. ✓ For any styling where no token exists, I used plain CSS (hex/rgb/named colors, plain numbers)
3. ✓ I did NOT invent, guess, or assume any variable names

**Styling Requirements:**
- Generate production-ready SCSS (~100-150 lines)
- Style appropriately for the component type (accordion/card/hero/etc.)
- Include hover/focus/active states
- Add smooth transitions and modern CSS patterns
- Keep it concise but complete

Include SCSS in your files array:
{ "path": "modules/asset/ui/src/scss/${scssSubdir}/_${name}.scss", "content": "..." }
`;
  } else if (fullDesign && !designTokens?.success) {
    fullDesignSection = `

---

⚠️  Full design mode was requested but design tokens could not be extracted.
Generating with basic styling only.
`;
  }

  // Frontend JavaScript guidance - only if user mentions interactive features
  const jsKeywords = ['interactive', 'accordion', 'slider', 'tab', 'modal', 'carousel', 'dropdown', 'toggle', 'animation', 'click', 'hover', 'scroll', 'menu', 'navigation'];
  const needsFrontendJs = description && jsKeywords.some(keyword => description.toLowerCase().includes(keyword));

  let frontendJsGuidance = '';
  if (needsFrontendJs) {
    frontendJsGuidance = loadPromptTemplate('FRONTEND-JAVASCRIPT-PATTERN.md');

    // Add available functions information directly into the prompt
    if (availableFunctions && availableFunctions.available && availableFunctions.functions.length > 0) {
      frontendJsGuidance += `\n\n### Available Functions in ${projectName || 'This Project'}\n\n`;
      frontendJsGuidance += `The following functions are available for import from \`Modules/asset/index.js\`:\n\n`;
      frontendJsGuidance += '```javascript\n';
      frontendJsGuidance += availableFunctions.functions.map(fn => `// ${fn}`).join('\n');
      frontendJsGuidance += '\n```\n\n';
      frontendJsGuidance += `**IMPORTANT**: Only import functions from the list above. Do not import functions that don't exist.\n`;
    } else {
      frontendJsGuidance += `\n\n### Available Functions in ${projectName || 'This Project'}\n\n`;
      frontendJsGuidance += `This project does not have a global asset module with shared functions.\n`;
      frontendJsGuidance += `Do not generate import statements from \`Modules/asset/index.js\`.\n`;
    }
  }

  // Replace all placeholders
  const finalPrompt = [
    commonRules,
    '',
    typeTemplate
      .replace(/{BUNDLE_CONTEXT}/g, bundleContext_text)
      .replace(/{MODULE_NAME}/g, name)
      .replace(/{MODULE_LABEL}/g, label)
      .replace(/{USER_INSTRUCTIONS}/g, userInstructions)
      .replace(/{CORRECT_PATH}/g, correctPath)
      .replace(/{BEM_GUIDANCE}/g, bemGuidance)
      .replace(/{BEM_CLASSES}/g, bemClasses)
      .replace(/{BUNDLE_RELATIONSHIP}/g, bundleRelationship)
      .replace(/{BUNDLE_TEMPLATE}/g, bundleTemplate)
      .replace(/{BUNDLE_INFO}/g, bundleInfo)
      .replace(/{BUNDLE_TEMPLATES}/g, bundleTemplates)
      .replace(/{BUNDLE_DATA_ACCESS}/g, bundleDataAccess)
      .replace(/{EXTEND_TYPE}/g, extendType)
      .replace(/{TEMPLATE_PATHS}/g, templatePaths)
      .replace(/{FRONTEND_JS_GUIDANCE}/g, frontendJsGuidance),
    fullDesignSection,  // Add design tokens section
    // CRITICAL: Add JSON enforcement at the very end of the prompt
    `
---

## ⚠️ CRITICAL OUTPUT FORMAT - READ THIS LAST

**YOUR RESPONSE MUST BE PURE JSON. NO EXCEPTIONS.**

❌ DO NOT start with text like "Here is...", "Generated...", "I'll create..."
❌ DO NOT use markdown code blocks (\`\`\`json or \`\`\`)
❌ DO NOT explain what you're doing

✅ START YOUR RESPONSE WITH { IMMEDIATELY
✅ Return ONLY the JSON object with "files" array

**Your entire response must be exactly this format:**

{"files":[{"path":"...","content":"..."},{"path":"...","content":"..."}]}

**START WITH { NOW:**`
  ].join('\n');

  return finalPrompt;
}

/**
 * Fallback prompt builder if templates not found
 */
function buildFallbackPrompt({ type, name, label, description, correctPath, bemGuidance, includeBemStyles, bundleContext }) {
  const isPartOfBundle = bundleContext?.isPartOfBundle || false;
  const basePieceName = bundleContext?.basePieceName || name;

  return `You are generating an Apostrophe CMS ${type} module${isPartOfBundle ? ' as part of a bundle' : ''}. Follow the user's instructions EXACTLY.

CRITICAL RULES:
1. ESM ONLY: export default { ... } (NOT module.exports)
2. FOLLOW USER INSTRUCTIONS: Generate ONLY what the user specifies below
3. DO NOT ADD EXTRAS: No helpful additions, no suggestions, no improvements
4. HTML MATCHES SCHEMA: Display ONLY the fields you defined in schema
5. IF NO INSTRUCTIONS: Generate minimal 2-3 basic fields

MODULE REQUIREMENTS:
- Name: ${name}
- Label: ${label}
${description ? `
USER INSTRUCTIONS (FOLLOW THESE EXACTLY):
${description}

CRITICAL: Generate ONLY the fields/features described above. Nothing more, nothing less.
If the user says "array with labels", add ONLY that array field.
If the user says "title and content area", add ONLY those two fields.
DO NOT add extra fields you think would be helpful.
` : `
NO USER INSTRUCTIONS PROVIDED.
Generate a minimal ${type} with 2-3 basic fields (string, area, boolean).
`}

${type === 'widget' ? `WIDGET SCHEMA (index.js):
- Extend: '@apostrophecms/widget-type'
${isPartOfBundle ? `- REQUIRED: Add _pieces relationship field to connect with '${basePieceName}' piece:
  _pieces: {
    label: 'Items',
    type: 'relationship',
    withType: '${basePieceName}',
    builders: {
      project: { aposDocId: 1, title: 1, _url: 1 }
    }
  }
- Add show field (select: 'all' or 'selected') to control which pieces to display
- Add conditional logic: if show === 'selected', make _pieces required
` : ''}
- Add the fields specified in USER INSTRUCTIONS (or 2-3 basic fields if none)
- Use appropriate field types: string, area, boolean, array, select, relationship, etc.
- Structure: export default { extend, fields: { add: {...} }, group: { basics: { label, fields: [...field names...] } } }

WIDGET TEMPLATE (views/widget.html):
${isPartOfBundle ? `- REQUIRED: Loop through pieces using relationship:
  {% for piece in data.widget._pieces %}
    <a href="{{ piece._url }}">{{ piece.title }}</a>
  {% endfor %}
` : ''}
- Display ONLY the fields defined in your schema
- Access fields: {{ data.widget.fieldName }}
- Areas: {% area data.widget, 'areaName' %}
- Arrays: {% for item in data.widget.arrayName %}
${includeBemStyles ? `- Use BEM classes: .${name}, .${name}__element` : ''}
- NO extra content not related to schema fields` : type === 'piece' ? `PIECE SCHEMA (index.js):
- Extend: '@apostrophecms/piece-type'
- Add the fields specified in USER INSTRUCTIONS (title is built-in)
- Use appropriate field types based on what user requested
- Structure: export default { extend, fields: { add: {...} }, group: { basics: { label, fields: [...field names...] } } }` : `PAGE SCHEMA (index.js):
- Extend: '@apostrophecms/${isPartOfBundle ? 'piece-page-type' : 'page-type'}'
${isPartOfBundle ? `- CRITICAL: This is a piece-page that displays '${basePieceName}' pieces
- Auto-provides: data.pieces (index view), data.piece (show view)
- Add areas for index page content (displayed on listing page)
- Add areas for show page content (displayed on detail page)
` : ''}
- Add the fields/areas specified in USER INSTRUCTIONS (or one 'main' area if none)
- Use appropriate field types based on what user requested
- Structure: export default { extend, fields: { add: {...} }, group: { basics: { label, fields: [...field names...] } } }

${isPartOfBundle ? `PAGE TEMPLATES (TWO REQUIRED):
1. views/index.html (piece listing):
   - {% extends 'layout.html' %}
   - {% block main %}...{% endblock %}
   - Loop through pieces: {% for piece in data.pieces %}
   - Link to detail: <a href="{{ piece._url }}">{{ piece.title }}</a>
   - Display index page areas from schema

2. views/show.html (piece detail):
   - {% extends 'layout.html' %}
   - {% block main %}...{% endblock %}
   - Access current piece: {{ data.piece.title }}, {{ data.piece.fieldName }}
   - Display show page areas from schema
   - NO loops - this shows ONE piece
` : `PAGE TEMPLATE (views/page.html):
- {% extends 'layout.html' %}
- {% block main %}...{% endblock %}
- Display ONLY the fields/areas defined in your schema
`}${includeBemStyles ? `- Use BEM classes: .${name}, .${name}__element` : ''}
- NO extra content not related to schema`}

${bemGuidance}

STRICT OUTPUT FORMAT:
{
  "files": [
    {
      "path": "${correctPath}/index.js",
      "content": "export default { extend: '@apostrophecms/${isPartOfBundle && type === 'page' ? 'piece-page-type' : type + '-type'}', fields: { add: { /* fields here */ } }, group: { basics: { label: 'Basics', fields: [/* field names */] } } };"
    }${type === 'widget' ? `,
    {
      "path": "${correctPath}/views/widget.html",
      "content": "<!-- Widget template with ${isPartOfBundle ? 'piece relationship loop' : 'fields'} -->"
    }` : type === 'page' && isPartOfBundle ? `,
    {
      "path": "${correctPath}/views/index.html",
      "content": "<!-- Index template with piece listing loop -->"
    },
    {
      "path": "${correctPath}/views/show.html",
      "content": "<!-- Show template for single piece detail -->"
    }` : type === 'page' ? `,
    {
      "path": "${correctPath}/views/page.html",
      "content": "<!-- Page template -->"
    }` : ''}
  ]
}

CRITICAL:
- NO markdown code blocks
- NO extra features not requested
- NO placeholder/demo content
- HTML shows ONLY what's in schema
- Start with { immediately

Generate now:`;
}

/**
 * Validate SCSS for undefined variables
 *
 * This catches when Claude invents variables like $white, $border-color, etc.
 * that don't exist in the project's design tokens.
 *
 * Returns array of undefined variables (empty if all valid)
 */
function validateScssVariables(scssContent, designTokens, moduleName) {
  console.error(`\n🔍 Validating SCSS variables...`);

  // Extract all $variables used in the SCSS
  const variableMatches = scssContent.matchAll(/\$([a-zA-Z0-9_-]+)/g);
  const usedVariables = new Set();
  for (const match of variableMatches) {
    usedVariables.add(`$${match[1]}`);
  }

  if (usedVariables.size === 0) {
    console.error(`   ℹ️  No SCSS variables found in generated SCSS`);
    return [];
  }

  // Extract all available variables from design tokens
  const availableVariables = new Set();
  if (designTokens.tokens && designTokens.tokens.categorized) {
    const categorized = designTokens.tokens.categorized;
    for (const category in categorized) {
      for (const key in categorized[category]) {
        const token = categorized[category][key];
        if (token.scss && token.scss.startsWith('$')) {
          availableVariables.add(token.scss);
        }
      }
    }
  }

  console.error(`   ℹ️  Found ${usedVariables.size} variable(s) used in SCSS`);
  console.error(`   ℹ️  ${availableVariables.size} variable(s) available from design tokens`);

  // Check for undefined variables
  const undefinedVariables = [];
  for (const variable of usedVariables) {
    if (!availableVariables.has(variable)) {
      undefinedVariables.push(variable);
    }
  }

  if (undefinedVariables.length > 0) {
    console.error(`\n⚠️ ⚠️ ⚠️  CRITICAL: Found ${undefinedVariables.length} UNDEFINED SCSS variable(s) ⚠️ ⚠️ ⚠️`);
    undefinedVariables.forEach(v => {
      console.error(`   ❌ ${v} - NOT FOUND in design tokens (will break compilation!)`);
    });
    console.error(`\n   🔧 FIX: Replace undefined variables with plain CSS:`);
    undefinedVariables.forEach(v => {
      if (v.includes('white')) console.error(`      ${v} → use #fff or white`);
      else if (v.includes('black')) console.error(`      ${v} → use #000 or black`);
      else if (v.includes('border')) console.error(`      ${v} → use border: 1px solid #ddd;`);
      else if (v.includes('color')) console.error(`      ${v} → use #333, #666, or other hex color`);
      else console.error(`      ${v} → use plain CSS value`);
    });
    console.error(`\n   Available variables: ${Array.from(availableVariables).slice(0, 10).join(', ')}...`);
    console.error(`   Module: ${moduleName}\n`);
  } else {
    console.error(`   ✅ All variables are valid!`);
  }

  return undefinedVariables;
}

/**
 * Parse natural language request using Claude
 */
export async function parseNaturalLanguageRequest(userRequest) {
  const parseTemplate = loadPromptTemplate('parse-request.md');

  if (!parseTemplate) {
    throw new Error('Parse template not found');
  }

  const prompt = parseTemplate.replace(/{USER_REQUEST}/g, userRequest);

  console.error(`Parsing natural language request: "${userRequest.substring(0, 50)}..."`);

  // Call Claude to parse the request
  const response = await callClaude(prompt);

  // Parse JSON response
  let cleaned = response.trim();
  cleaned = cleaned.replace(/^```json\s*/m, '').replace(/\s*```$/m, '');
  cleaned = cleaned.replace(/^```\s*/m, '').replace(/\s*```$/m, '');

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse natural language request - no valid JSON found');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.moduleType || !parsed.moduleName || !parsed.label) {
    throw new Error('Parsed request missing required fields (moduleType, moduleName, or label)');
  }

  return parsed;
}

/**
 * Call Claude CLI
 */
async function callClaude(prompt, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    // CRITICAL: Use stdin instead of -p argument to avoid command-line length limits
    // Prompts can be very long (500+ lines with templates, examples, design tokens)
    // Command-line arguments have system limits (~128KB-256KB on most systems)
    const child = spawn('claude', [], {
      stdio: ['pipe', 'pipe', 'pipe']  // Enable stdin for prompt input
    });

    let stdout = '';
    let stderr = '';
    let isResolved = false;

    // Set timeout (configurable, default 60s)
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        child.kill('SIGTERM');
        reject(new Error(`Claude API timeout (${timeoutMs/1000} seconds). The request took too long. Please try again.`));
      }
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (isResolved) return; // Already timed out
      isResolved = true;
      clearTimeout(timeout);

      if (code !== 0) {
        console.error(`\n❌ Claude CLI failed with exit code ${code}`);
        console.error(`stderr: ${stderr}`);
        console.error(`stdout: ${stdout.substring(0, 500)}`);
        reject(new Error(`Claude CLI failed (exit code ${code}): ${stderr || stdout.substring(0, 200)}`));
      } else {
        // Check if stdout is empty or very short
        if (!stdout || stdout.trim().length < 10) {
          console.error(`\n❌ Claude returned empty or very short response`);
          console.error(`stdout length: ${stdout.length}`);
          console.error(`stderr: ${stderr}`);
          reject(new Error(`Claude returned empty response. stderr: ${stderr.substring(0, 200)}`));
        } else {
          resolve(stdout);
        }
      }
    });

    child.on('error', (error) => {
      if (isResolved) return; // Already timed out
      isResolved = true;
      clearTimeout(timeout);
      reject(new Error(`Failed to execute Claude CLI: ${error.message}. Make sure 'claude' command is installed globally: npm install -g @anthropic-ai/cli`));
    });

    // Write prompt to stdin instead of passing as command-line argument
    // This avoids system limits on argument length
    try {
      child.stdin.write(prompt);
      child.stdin.end();
    } catch (writeError) {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeout);
        reject(new Error(`Failed to write prompt to Claude CLI stdin: ${writeError.message}`));
      }
    }
  });
}

/**
 * Save generated files to project
 */
export function saveModuleFiles(options) {
  const { project, files, moduleName, moduleType, moduleLabel, includeBemStyles, parkPage = false, parkUrl = null } = options;

  let savedCount = 0;
  let updatedModulesJs = false;
  let createdScss = false;
  let registeredPage = false;
  let pageRegistrationType = null; // 'park' or 'types'
  let pageRegistrationDetails = null;

  // Check for existing modules with same name to prevent conflicts
  if (moduleType === 'bundle') {
    const bundlePath = join(project.path, 'modules', 'pieces', `${moduleName}-module`);
    if (existsSync(bundlePath)) {
      console.error(`⚠️  Warning: Bundle '${moduleName}-module' already exists at ${bundlePath}`);
    }
  } else {
    const subdirectory = moduleType === 'widget' ? 'widgets' : (moduleType === 'piece' ? 'pieces' : 'pages');
    // Widgets should always have -widget suffix
    const folderName = moduleType === 'widget' ? `${moduleName}-widget` : moduleName;
    const modulePath = join(project.path, 'modules', subdirectory, folderName);
    if (existsSync(modulePath)) {
      console.error(`⚠️  Warning: Module '${folderName}' already exists at ${modulePath}`);
    }
  }

  // Save all generated files
  for (const file of files) {
    const fullPath = join(project.path, file.path);

    // CRITICAL: Handle global asset module specially - APPEND, don't overwrite
    if (file.path === 'modules/asset/ui/src/index.js') {
      console.error(`\n📝 Adding common function(s) to global asset module...`);

      // Read existing content
      let existingContent = '';
      if (existsSync(fullPath)) {
        existingContent = readFileSync(fullPath, 'utf8');
        console.error(`   ✅ Existing file found, will append new functions`);
      } else {
        console.error(`   ℹ️  File doesn't exist, will create new`);
      }

      // CRITICAL: Validate that the content uses NAMED exports, not default exports
      const newContent = file.content.trim();

      // Check for incorrect default export pattern
      if (newContent.includes('export default')) {
        console.error(`\n❌ ERROR: Global asset module must use NAMED exports, not default exports!`);
        console.error(`   Found: "export default"`);
        console.error(`   Expected: "export function functionName() { ... }"`);
        console.error(`\n   The global asset module (modules/asset/ui/src/index.js) is for shared utility functions.`);
        console.error(`   Use NAMED exports so other modules can import specific functions.`);
        console.error(`\n   ❌ WRONG: export default () => { ... }`);
        console.error(`   ✅ CORRECT: export function myFunction() { ... }`);
        console.error(`\n   Skipping this malformed content.`);
        continue;
      }

      // Extract function names from existing content to check for duplicates
      const existingFunctionNames = new Set();
      if (existingContent) {
        const functionMatches = existingContent.matchAll(/export\s+function\s+(\w+)/g);
        for (const match of functionMatches) {
          existingFunctionNames.add(match[1]);
        }
        console.error(`   ℹ️  Found ${existingFunctionNames.size} existing function(s): ${Array.from(existingFunctionNames).join(', ')}`);
      }

      // Extract new functions that don't already exist
      let newFunctionsToAdd = '';

      // Check if the new content contains functions that don't exist yet
      const newFunctionMatches = newContent.matchAll(/export\s+function\s+(\w+)/g);
      const newFunctionNames = [];
      for (const match of newFunctionMatches) {
        newFunctionNames.push(match[1]);
      }

      // Only add if we have new functions that don't exist
      const hasNewFunctions = newFunctionNames.some(name => !existingFunctionNames.has(name));

      if (hasNewFunctions) {
        // Filter out any functions that already exist by parsing the content more carefully
        // For now, if at least one function is new, add the entire content
        // (Claude should only generate new functions anyway)
        newFunctionsToAdd = newContent;

        console.error(`   ✅ Adding new function(s): ${newFunctionNames.filter(name => !existingFunctionNames.has(name)).join(', ')}`);

        // Append new functions to existing file
        const updatedContent = existingContent
          ? `${existingContent.trimEnd()}\n\n${newFunctionsToAdd}\n`
          : `${newFunctionsToAdd}\n`;

        mkdirSync(dirname(fullPath), { recursive: true });
        writeFileSync(fullPath, updatedContent, 'utf8');
        console.error(`   ✅ Appended new function(s) to global asset module`);
        savedCount++;
      } else {
        console.error(`   ⚠️  All function(s) already exist: ${newFunctionNames.join(', ')}`);
        console.error(`   ℹ️  No new functions to add`);
      }
      continue;
    }

    // Normal file save for all other files
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.content, 'utf8');
    savedCount++;
  }

  // Check if SCSS needs to be created and add imports
  const hasTemplate = files.some(f => f.path.includes('/views/'));
  const mainScssPath = join(project.path, 'modules', 'asset', 'ui', 'src', 'index.scss');

  if (hasTemplate && moduleName && moduleType) {
    // For bundles, extract all SCSS files from the files array
    // For single modules, use the moduleName
    const scssFilesToImport = [];

    if (moduleType === 'bundle') {
      // Extract SCSS filenames from files array (e.g., _custom-product-widget.scss, _custom-product-page.scss)
      const scssFiles = files.filter(f => f.path.includes('modules/asset/ui/src/scss/') && f.path.endsWith('.scss'));
      scssFiles.forEach(file => {
        const match = file.path.match(/\/scss\/(components|pages)\/_([^/]+)\.scss$/);
        if (match) {
          const [, subdir, name] = match;
          scssFilesToImport.push({ subdir, name });
          createdScss = true;
        }
      });
    } else {
      // Single module
      const scssSubdir = moduleType === 'page' ? 'pages' : 'components';
      const scssRelativePath = `modules/asset/ui/src/scss/${scssSubdir}/_${moduleName}.scss`;
      const scssAlreadyInFiles = files.some(f => f.path === scssRelativePath);

      if (scssAlreadyInFiles) {
        scssFilesToImport.push({ subdir: scssSubdir, name: moduleName });
        createdScss = true;
      }
    }

    // Add imports to main index.scss
    if (existsSync(mainScssPath) && scssFilesToImport.length > 0) {
      let mainScssContent = readFileSync(mainScssPath, 'utf8');

      scssFilesToImport.forEach(({ subdir, name }) => {
        // SCSS partials should have underscore prefix
        const importStatement = `@import "./scss/${subdir}/_${name}";`;

        if (!mainScssContent.includes(importStatement)) {
          const sectionComment = subdir === 'components' ? '//Components' : '//Pages';
          if (mainScssContent.includes(sectionComment)) {
            mainScssContent = mainScssContent.replace(
              new RegExp(`(${sectionComment}[^]*?)((?://[A-Z]|$))`, 's'),
              `$1${importStatement}\n$2`
            );
          } else {
            mainScssContent += `\n${importStatement}\n`;
          }
        }
      });

      writeFileSync(mainScssPath, mainScssContent, 'utf8');
    }
  }

  // Auto-update modules.js
  if (moduleName && moduleType) {
    // For bundles, register the bundle itself (e.g., 'custom-product-module') in modules/pieces/modules.js
    // For single modules, register in their respective type-specific modules.js
    let subdirectory;
    let moduleKey;

    if (moduleType === 'bundle') {
      subdirectory = 'pieces';
      moduleKey = `'${moduleName}-module'`; // Bundle name with -module suffix
    } else {
      subdirectory = moduleType === 'widget' ? 'widgets' : (moduleType === 'piece' ? 'pieces' : 'pages');
      // Widgets should always have -widget suffix
      const registrationName = moduleType === 'widget' ? `${moduleName}-widget` : moduleName;
      moduleKey = `'${registrationName}'`;
    }

    const modulesJsPath = join(project.path, 'modules', subdirectory, 'modules.js');

    if (existsSync(modulesJsPath)) {
      let content = readFileSync(modulesJsPath, 'utf8');

      if (!content.includes(moduleKey)) {
        const exportDefaultMatch = content.match(/export\s+default\s+\{/);
        if (exportDefaultMatch) {
          const startIndex = exportDefaultMatch.index + exportDefaultMatch[0].length;
          let braceCount = 1;
          let endIndex = startIndex;

          while (braceCount > 0 && endIndex < content.length) {
            if (content[endIndex] === '{') braceCount++;
            else if (content[endIndex] === '}') braceCount--;
            endIndex++;
          }

          const closingBraceIndex = endIndex - 1;
          const existingContent = content.substring(startIndex, closingBraceIndex).trim();

          let updatedContent;
          if (existingContent) {
            // Add comma to the end of the last item if it doesn't have one
            const needsComma = !existingContent.endsWith(',');
            const contentWithComma = needsComma
              ? content.substring(0, closingBraceIndex).trimEnd() + ','
              : content.substring(0, closingBraceIndex);

            updatedContent =
              contentWithComma + '\n    ' + moduleKey + ': {}\n' +
              content.substring(closingBraceIndex);
          } else {
            updatedContent =
              content.substring(0, startIndex) +
              '\n    ' + moduleKey + ': {}\n' +
              content.substring(closingBraceIndex);
          }

          writeFileSync(modulesJsPath, updatedContent, 'utf8');
          updatedModulesJs = true;
        }
      }
    } else {
      const newContent = `export default {\n    ${moduleKey}: {}\n};\n`;
      mkdirSync(dirname(modulesJsPath), { recursive: true });
      writeFileSync(modulesJsPath, newContent, 'utf8');
      updatedModulesJs = true;
    }
  }

  // Auto-register pages in modules/@apostrophecms/page/index.js
  // For bundles: detect if bundle contains a page module
  let isPageModule = moduleType === 'page';
  let pageModuleName = moduleName;

  console.error(`\n🔍 PAGE REGISTRATION CHECK:`);
  console.error(`   moduleType: ${moduleType}`);
  console.error(`   moduleName: ${moduleName}`);
  console.error(`   parkPage: ${parkPage}`);
  console.error(`   parkUrl: ${parkUrl}`);

  if (moduleType === 'bundle') {
    console.error(`   📦 Checking if bundle contains page...`);
    // Check if bundle contains a page by looking for page files
    // CRITICAL: Bundle files have adjusted paths like: modules/pieces/{bundle}-module/{name}-page/index.js
    // So we need to check for BOTH patterns:
    // 1. modules/pages/{name}/index.js (before adjustment - shouldn't happen)
    // 2. modules/pieces/{bundle}-module/{name}-page/index.js (after adjustment - this is what we'll see)
    const pageFile = files.find(f =>
      (f.path.includes('/pages/') && f.path.endsWith('/index.js')) ||
      (f.path.includes('-page/index.js') && f.path.includes(`modules/pieces/${moduleName}-module/`))
    );
    console.error(`   📄 Page file found: ${!!pageFile}`);
    if (pageFile) {
      console.error(`   📄 Page file path: ${pageFile.path}`);
      isPageModule = true;
      // Extract page name from path
      // Pattern 1: modules/pages/shopping-list-page/index.js -> shopping-list-page
      // Pattern 2: modules/pieces/shopping-list-module/shopping-list-page/index.js -> shopping-list-page
      let match = pageFile.path.match(/modules\/pages\/([^/]+)\/index\.js/);
      if (!match) {
        match = pageFile.path.match(/modules\/pieces\/[^/]+-module\/([^/]+)\/index\.js/);
      }
      if (match) {
        pageModuleName = match[1];
        console.error(`   ✅ Bundle contains page module: ${pageModuleName}`);
      }
    } else {
      console.error(`   ℹ️  Bundle does NOT contain a page module`);
    }
  }

  console.error(`   isPageModule: ${isPageModule}`);
  console.error(`   pageModuleName: ${pageModuleName}`);

  if (isPageModule) {
    const pageIndexPath = join(project.path, 'modules', '@apostrophecms', 'page', 'index.js');
    const label = moduleLabel || pageModuleName;

    if (existsSync(pageIndexPath)) {
      let content = readFileSync(pageIndexPath, 'utf8');

      // CRITICAL: If parkPage is checked, ONLY add to park array (not types)
      //           If parkPage is NOT checked, ONLY add to types array (not park)

      let updatedContent = content;

      // Check if page is already registered
      const alreadyRegistered = content.includes(`name: '${pageModuleName}'`) || content.includes(`type: '${pageModuleName}'`);

      if (!alreadyRegistered) {
        // If parkPage is checked: Add to PARK array only
        if (parkPage && parkUrl) {
          const parkEntry = `      {\n        title: '${label}',\n        slug: '${parkUrl}',\n        type: '${pageModuleName}',\n        parkedId: '${pageModuleName}'\n      }`;

          const parkMatch = updatedContent.match(/park:\s*\[/);
          if (parkMatch) {
            const parkStartIndex = parkMatch.index + parkMatch[0].length;
            let parkBracketCount = 1;
            let parkEndIndex = parkStartIndex;

            while (parkBracketCount > 0 && parkEndIndex < updatedContent.length) {
              if (updatedContent[parkEndIndex] === '[') parkBracketCount++;
              else if (updatedContent[parkEndIndex] === ']') parkBracketCount--;
              parkEndIndex++;
            }

            const parkClosingIndex = parkEndIndex - 1;
            const existingPark = updatedContent.substring(parkStartIndex, parkClosingIndex).trim();

            if (existingPark) {
              const needsComma = !existingPark.endsWith(',');
              const parkWithComma = needsComma
                ? updatedContent.substring(0, parkClosingIndex).trimEnd() + ',\n'
                : updatedContent.substring(0, parkClosingIndex) + '\n';

              updatedContent =
                parkWithComma + parkEntry + '\n    ' +
                updatedContent.substring(parkClosingIndex);
            } else {
              updatedContent =
                updatedContent.substring(0, parkStartIndex) +
                '\n' + parkEntry + '\n    ' +
                updatedContent.substring(parkClosingIndex);
            }

            writeFileSync(pageIndexPath, updatedContent, 'utf8');
            registeredPage = true;
            pageRegistrationType = 'park';
            pageRegistrationDetails = {
              title: label,
              slug: parkUrl,
              type: pageModuleName,
              parkedId: pageModuleName
            };
          }
        }
        // If parkPage is NOT checked: Add to TYPES array only
        else {
          const typeEntry = `      {\n        name: '${pageModuleName}',\n        label: '${label}'\n      }`;

          // Find the types array
          const typesMatch = content.match(/types:\s*\[/);
          if (typesMatch) {
            const startIndex = typesMatch.index + typesMatch[0].length;

            // Find the closing bracket for the types array
            let bracketCount = 1;
            let endIndex = startIndex;

            while (bracketCount > 0 && endIndex < content.length) {
              if (content[endIndex] === '[') bracketCount++;
              else if (content[endIndex] === ']') bracketCount--;
              endIndex++;
            }

            const closingBracketIndex = endIndex - 1;
            const existingTypes = content.substring(startIndex, closingBracketIndex).trim();

            if (existingTypes) {
              // Add comma to last item if needed
              const needsComma = !existingTypes.endsWith(',');
              const contentWithComma = needsComma
                ? content.substring(0, closingBracketIndex).trimEnd() + ',\n'
                : content.substring(0, closingBracketIndex) + '\n';

              updatedContent =
                contentWithComma + typeEntry + '\n    ' +
                content.substring(closingBracketIndex);
            } else {
              updatedContent =
                content.substring(0, startIndex) +
                '\n' + typeEntry + '\n    ' +
                content.substring(closingBracketIndex);
            }

            writeFileSync(pageIndexPath, updatedContent, 'utf8');
            registeredPage = true;
            pageRegistrationType = 'types';
            pageRegistrationDetails = {
              name: pageModuleName,
              label: label
            };
          }
        }
      }
    } else {
      console.error(`⚠️  Warning: modules/@apostrophecms/page/index.js not found at ${pageIndexPath}`);
    }
  }

  return {
    savedCount,
    updatedModulesJs,
    createdScss,
    registeredPage,
    pageRegistrationType,
    pageRegistrationDetails
  };
}
