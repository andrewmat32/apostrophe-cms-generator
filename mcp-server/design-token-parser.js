/**
 * Design Token Parser
 * Dynamically extracts SCSS variables, CSS custom properties, and mixins
 * from any Apostrophe project's index.scss and all its imports
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';

/**
 * Parse SCSS variables from content
 * Matches: $variable-name: value;
 */
function parseSCSSVariables(content) {
  const variables = {};

  // Match SCSS variable declarations
  // Handles: $name: value; and $name: value !default;
  const varPattern = /\$([a-zA-Z0-9_-]+)\s*:\s*([^;]+?)(?:\s*!default)?;/g;
  let match;

  while ((match = varPattern.exec(content)) !== null) {
    const [, name, value] = match;
    variables[name] = value.trim();
  }

  return variables;
}

/**
 * Parse CSS custom properties from content
 * Matches: --property-name: value;
 */
function parseCSSCustomProperties(content) {
  const properties = {};

  // Match CSS custom properties (usually inside :root)
  const propPattern = /--([a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = propPattern.exec(content)) !== null) {
    const [, name, value] = match;
    properties[name] = value.trim();
  }

  return properties;
}

/**
 * Parse SCSS mixins from content
 * Matches: @mixin name($params) { ... }
 */
function parseSCSSMixins(content) {
  const mixins = {};

  // Match @mixin declarations
  const mixinPattern = /@mixin\s+([a-zA-Z0-9_-]+)\s*(\([^)]*\))?\s*\{/g;
  let match;

  while ((match = mixinPattern.exec(content)) !== null) {
    const [fullMatch, name, params] = match;

    // Find the closing brace for this mixin
    let braceCount = 1;
    let pos = match.index + fullMatch.length;
    let endPos = pos;

    while (braceCount > 0 && pos < content.length) {
      if (content[pos] === '{') braceCount++;
      else if (content[pos] === '}') braceCount--;
      if (braceCount === 0) endPos = pos;
      pos++;
    }

    const body = content.substring(match.index + fullMatch.length, endPos).trim();

    mixins[name] = {
      params: params ? params.trim() : '()',
      body: body,
      usage: `@include ${name}${params || '()'};`
    };
  }

  return mixins;
}

/**
 * Resolve @import statements and read all imported files recursively
 */
function resolveImports(indexScssPath, maxDepth = 5) {
  const resolvedFiles = new Set();
  const combinedContent = [];

  function processFile(filePath, depth = 0) {
    if (depth > maxDepth || resolvedFiles.has(filePath)) {
      return;
    }

    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }

    resolvedFiles.add(filePath);

    try {
      const fileContent = readFileSync(filePath, 'utf-8');
      combinedContent.push(`\n/* === ${filePath} === */\n${fileContent}`);

      // Find @import statements
      // Matches: @import "path", @import 'path', @import url('path')
      const importPattern = /@import\s+(?:url\()?['"]([^'"]+)['"](?:\))?/g;
      let match;

      while ((match = importPattern.exec(fileContent)) !== null) {
        const importPath = match[1];

        // Skip external URLs
        if (importPath.startsWith('http') || importPath.startsWith('//')) {
          continue;
        }

        // Skip node_modules imports
        if (importPath.startsWith('~') || importPath.startsWith('@')) {
          continue;
        }

        // Resolve relative path
        const baseDir = dirname(filePath);
        let resolvedPath = join(baseDir, importPath);

        // Try multiple file patterns
        const attempts = [
          resolvedPath,
          `${resolvedPath}.scss`,
          `${resolvedPath}.css`,
          join(resolvedPath, '_index.scss'),
          join(resolvedPath, 'index.scss'),
        ];

        // Try with underscore prefix for SCSS partials
        if (!basename(importPath).startsWith('_')) {
          const pathParts = resolvedPath.split('/');
          const filename = pathParts.pop();
          pathParts.push(`_${filename}`);
          const partialPath = pathParts.join('/');
          attempts.push(partialPath);
          attempts.push(`${partialPath}.scss`);
        }

        // Try to find the file
        for (const attempt of attempts) {
          if (existsSync(attempt)) {
            processFile(attempt, depth + 1);
            break;
          }
        }
      }
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error.message);
    }
  }

  processFile(indexScssPath);

  return {
    filesAnalyzed: resolvedFiles.size,
    files: Array.from(resolvedFiles),
    content: combinedContent.join('\n')
  };
}

/**
 * Categorize tokens by naming convention
 * Preserves source type (scss vs css) for proper syntax generation
 */
function categorizeTokens(scssVars, cssProps) {
  const categories = {
    colors: {},
    typography: {},
    spacing: {},
    layout: {},
    effects: {},
    breakpoints: {},
    filters: {},
    other: {}
  };

  // Helper to categorize a single token
  function categorize(name, value) {
    const lowerName = name.toLowerCase();

    // Colors
    if (lowerName.includes('color') || lowerName.includes('bg') ||
        lowerName.includes('background') || lowerName.includes('border') ||
        lowerName.includes('accent') || lowerName.includes('primary') ||
        lowerName.includes('secondary') || lowerName.includes('footer') ||
        lowerName.includes('header') || lowerName.match(/-(white|black|gray|grey|red|blue|green|yellow|orange|purple|pink)/)) {
      return 'colors';
    }

    // Typography
    if (lowerName.includes('font') || lowerName.includes('text') ||
        lowerName.includes('heading') || lowerName.includes('typography') ||
        lowerName.includes('line-height') || lowerName.includes('letter-spacing') ||
        lowerName.includes('tracking')) {
      return 'typography';
    }

    // Spacing
    if (lowerName.includes('space') || lowerName.includes('spacing') ||
        lowerName.includes('padding') || lowerName.includes('margin') ||
        lowerName.includes('gap')) {
      return 'spacing';
    }

    // Layout
    if (lowerName.includes('width') || lowerName.includes('height') ||
        lowerName.includes('container') || lowerName.includes('wrapper') ||
        lowerName.includes('grid') || lowerName.includes('column')) {
      return 'layout';
    }

    // Effects
    if (lowerName.includes('shadow') || lowerName.includes('radius') ||
        lowerName.includes('transition') || lowerName.includes('opacity') ||
        lowerName.includes('blur') || lowerName.includes('ease')) {
      return 'effects';
    }

    // Breakpoints
    if (lowerName.includes('desktop') || lowerName.includes('tablet') ||
        lowerName.includes('mobile') || lowerName.includes('breakpoint') ||
        lowerName.match(/-(xs|sm|md|lg|xl|2xl|max|min)$/)) {
      return 'breakpoints';
    }

    // Filters (SVG color filters)
    if (lowerName.includes('filter')) {
      return 'filters';
    }

    return 'other';
  }

  // Categorize SCSS variables - store with metadata
  for (const [name, value] of Object.entries(scssVars)) {
    const category = categorize(name, value);
    categories[category][name] = { value, type: 'scss' };
  }

  // Categorize CSS custom properties - store with metadata
  for (const [name, value] of Object.entries(cssProps)) {
    const category = categorize(name, value);
    categories[category][name] = { value, type: 'css' };
  }

  return categories;
}

/**
 * Helper: Convert token to proper SCSS syntax based on type
 */
function toScss(name, tokenData) {
  if (tokenData.type === 'css') {
    // CSS custom property: use var(--name)
    return `var(--${name})`;
  } else {
    // SCSS variable: use $name
    return `$${name}`;
  }
}

/**
 * Generate smart recommendations for using tokens
 */
function generateRecommendations(categorized, mixins) {
  const recommendations = {
    colors: {
      primary: null,
      secondary: null,
      accent: null,
      text: null,
      background: null
    },
    spacing: [],
    typography: {
      heading: null,
      body: null,
      button: null
    },
    effects: {
      shadow: null,
      radius: null,
      transition: null
    },
    mixins: []
  };

  // Find primary colors
  const colorKeys = Object.keys(categorized.colors);

  // Primary color
  const primaryKeys = colorKeys.filter(k =>
    k.includes('primary') || k.includes('main-color') || k === 'main-color'
  );
  if (primaryKeys.length > 0) {
    const key = primaryKeys[0];
    const token = categorized.colors[key];
    recommendations.colors.primary = {
      name: key,
      value: token.value,
      type: token.type,
      scss: toScss(key, token)
    };
  }

  // Secondary color
  const secondaryKeys = colorKeys.filter(k => k.includes('secondary'));
  if (secondaryKeys.length > 0) {
    const key = secondaryKeys[0];
    const token = categorized.colors[key];
    recommendations.colors.secondary = {
      name: key,
      value: token.value,
      type: token.type,
      scss: toScss(key, token)
    };
  }

  // Accent color
  const accentKeys = colorKeys.filter(k => k.includes('accent'));
  if (accentKeys.length > 0) {
    const key = accentKeys[0];
    const token = categorized.colors[key];
    recommendations.colors.accent = {
      name: key,
      value: token.value,
      type: token.type,
      scss: toScss(key, token)
    };
  }

  // Text color
  const textKeys = colorKeys.filter(k => k.includes('text') && !k.includes('white'));
  if (textKeys.length > 0) {
    const key = textKeys[0];
    const token = categorized.colors[key];
    recommendations.colors.text = {
      name: key,
      value: token.value,
      type: token.type,
      scss: toScss(key, token)
    };
  }

  // Background color
  const bgKeys = colorKeys.filter(k => k.includes('bg') || k.includes('background'));
  if (bgKeys.length > 0) {
    const key = bgKeys[0];
    const token = categorized.colors[key];
    recommendations.colors.background = {
      name: key,
      value: token.value,
      type: token.type,
      scss: toScss(key, token)
    };
  }

  // Common spacing values
  const spacingKeys = Object.keys(categorized.spacing).slice(0, 5);
  recommendations.spacing = spacingKeys.map(key => {
    const token = categorized.spacing[key];
    return {
      name: key,
      value: token.value,
      type: token.type,
      scss: toScss(key, token)
    };
  });

  // Typography
  const typoKeys = Object.keys(categorized.typography);
  const headingKey = typoKeys.find(k => k.includes('heading'));
  const bodyKey = typoKeys.find(k => k.includes('font') && !k.includes('heading') && !k.includes('button'));
  const buttonKey = typoKeys.find(k => k.includes('button'));

  if (headingKey) {
    const token = categorized.typography[headingKey];
    recommendations.typography.heading = {
      name: headingKey,
      value: token.value,
      type: token.type,
      scss: toScss(headingKey, token)
    };
  }
  if (bodyKey) {
    const token = categorized.typography[bodyKey];
    recommendations.typography.body = {
      name: bodyKey,
      value: token.value,
      type: token.type,
      scss: toScss(bodyKey, token)
    };
  }
  if (buttonKey) {
    const token = categorized.typography[buttonKey];
    recommendations.typography.button = {
      name: buttonKey,
      value: token.value,
      type: token.type,
      scss: toScss(buttonKey, token)
    };
  }

  // Effects
  const effectKeys = Object.keys(categorized.effects);
  const shadowKey = effectKeys.find(k => k.includes('shadow'));
  const radiusKey = effectKeys.find(k => k.includes('radius'));
  const transitionKey = effectKeys.find(k => k.includes('transition'));

  if (shadowKey) {
    const token = categorized.effects[shadowKey];
    recommendations.effects.shadow = {
      name: shadowKey,
      value: token.value,
      type: token.type,
      scss: toScss(shadowKey, token)
    };
  }
  if (radiusKey) {
    const token = categorized.effects[radiusKey];
    recommendations.effects.radius = {
      name: radiusKey,
      value: token.value,
      type: token.type,
      scss: toScss(radiusKey, token)
    };
  }
  if (transitionKey) {
    const token = categorized.effects[transitionKey];
    recommendations.effects.transition = {
      name: transitionKey,
      value: token.value,
      type: token.type,
      scss: toScss(transitionKey, token)
    };
  }

  // Top mixins
  const mixinNames = Object.keys(mixins).slice(0, 5);
  recommendations.mixins = mixinNames.map(name => ({
    name,
    params: mixins[name].params,
    usage: mixins[name].usage
  }));

  return recommendations;
}

/**
 * Main function: Extract all design tokens from a project
 */
export function extractDesignTokens(projectPath) {
  const indexScssPath = join(projectPath, 'modules', 'asset', 'ui', 'src', 'index.scss');

  if (!existsSync(indexScssPath)) {
    return {
      success: false,
      error: 'No index.scss found in project',
      path: indexScssPath
    };
  }

  try {
    console.error(`\n🎨 Analyzing design tokens from: ${indexScssPath}`);

    // Resolve all imports and combine content
    const resolved = resolveImports(indexScssPath);
    console.error(`📁 Analyzed ${resolved.filesAnalyzed} SCSS files`);

    // Parse tokens
    const scssVariables = parseSCSSVariables(resolved.content);
    const cssCustomProperties = parseCSSCustomProperties(resolved.content);
    const scssMixins = parseSCSSMixins(resolved.content);

    console.error(`✅ Found ${Object.keys(scssVariables).length} SCSS variables`);
    console.error(`✅ Found ${Object.keys(cssCustomProperties).length} CSS custom properties`);
    console.error(`✅ Found ${Object.keys(scssMixins).length} SCSS mixins`);

    // Categorize tokens
    const categorized = categorizeTokens(scssVariables, cssCustomProperties);

    // Generate recommendations
    const recommendations = generateRecommendations(categorized, scssMixins);

    return {
      success: true,
      projectPath,
      indexPath: indexScssPath,
      filesAnalyzed: resolved.filesAnalyzed,
      files: resolved.files,
      tokens: {
        scss: scssVariables,
        css: cssCustomProperties,
        mixins: scssMixins,
        categorized,
        total: Object.keys(scssVariables).length + Object.keys(cssCustomProperties).length + Object.keys(scssMixins).length
      },
      recommendations
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      path: indexScssPath,
      stack: error.stack
    };
  }
}

/**
 * 💎 HIRE A DESIGNER MODE
 * Generate production-ready SCSS with complete professional styling
 */
function generateFullDesignSCSS(moduleName, moduleType, classes, htmlContent, recommendations, categorized) {
  const blockClass = classes.find(c => c === moduleName);
  const elementClasses = classes.filter(c => c.startsWith(`${moduleName}__`));
  const modifierClasses = classes.filter(c => c.startsWith(`${moduleName}--`));

  let scss = `// ============================================\n`;
  scss += `// ${capitalize(moduleName)} ${moduleType}\n`;
  scss += `// 💎 PRODUCTION-READY PROFESSIONAL DESIGN\n`;
  scss += `// Generated with complete styling using project design tokens\n`;
  scss += `// ============================================\n\n`;

  if (!blockClass) {
    scss += `// ⚠️  Warning: No BEM block class found\n`;
    scss += `// Generating flat structure\n\n`;
    classes.forEach(c => {
      scss += `.${c} {\n  // Add styles\n}\n\n`;
    });
    return scss;
  }

  // Main component block
  scss += `.${blockClass} {\n`;
  scss += `  // 🎨 Component container\n`;
  scss += `  // Modern layout with CSS container queries\n`;
  scss += `  container-type: inline-size;\n`;
  scss += `  container-name: ${blockClass};\n`;
  scss += `  \n`;
  scss += `  display: flex;\n`;
  scss += `  flex-direction: column;\n`;

  if (categorized.spacing && Object.keys(categorized.spacing).length > 0) {
    const spacingKeys = Object.keys(categorized.spacing);
    const gapToken = spacingKeys.find(k => k.includes('4')) || spacingKeys[0];
    if (gapToken) {
      const token = categorized.spacing[gapToken];
      scss += `  gap: ${toScss(gapToken, token)};\n`;
    }
  }

  if (recommendations.colors.background) {
    scss += `  background: ${recommendations.colors.background.scss};\n`;
  }

  if (categorized.effects) {
    const radiusKeys = Object.keys(categorized.effects);
    const radiusToken = radiusKeys.find(k => k.includes('radius') && (k.includes('lg') || k.includes('md')));
    if (radiusToken) {
      const token = categorized.effects[radiusToken];
      scss += `  border-radius: ${toScss(radiusToken, token)};\n`;
    }
  }

  if (categorized.spacing && Object.keys(categorized.spacing).length > 0) {
    const spacingKeys = Object.keys(categorized.spacing);
    const paddingToken = spacingKeys.find(k => k.includes('6') || k.includes('8')) || spacingKeys[Math.floor(spacingKeys.length / 2)];
    if (paddingToken) {
      const token = categorized.spacing[paddingToken];
      scss += `  padding: ${toScss(paddingToken, token)};\n`;
    }

    const marginToken = spacingKeys.find(k => k.includes('8')) || spacingKeys[Math.floor(spacingKeys.length / 2)];
    if (marginToken) {
      const token = categorized.spacing[marginToken];
      scss += `  margin: ${toScss(marginToken, token)} 0;\n`;
    }
  }

  if (categorized.effects) {
    const shadowKeys = Object.keys(categorized.effects);
    const shadowToken = shadowKeys.find(k => k.includes('shadow') && k.includes('md'));
    if (shadowToken) {
      const token = categorized.effects[shadowToken];
      scss += `  box-shadow: ${toScss(shadowToken, token)};\n`;
    }

    const transitionKeys = Object.keys(categorized.effects);
    const transitionToken = transitionKeys.find(k => k.includes('transition') && (k.includes('base') || !k.includes('fast')));
    if (transitionToken) {
      const token = categorized.effects[transitionToken];
      scss += `  transition: all ${toScss(transitionToken, token)};\n`;
    } else {
      scss += `  transition: all 0.3s ease;\n`;
    }
  }

  scss += `  overflow: hidden;\n`;
  scss += `  position: relative;\n`;
  scss += `\n`;

  scss += `  // 🎯 Hover effect - elevation and lift\n`;
  scss += `  &:hover {\n`;
  scss += `    transform: translateY(-4px);\n`;

  if (categorized.effects) {
    const shadowKeys = Object.keys(categorized.effects);
    const hoverShadowToken = shadowKeys.find(k => k.includes('shadow') && (k.includes('lg') || k.includes('xl')));
    if (hoverShadowToken) {
      const token = categorized.effects[hoverShadowToken];
      scss += `    box-shadow: ${toScss(hoverShadowToken, token)};\n`;
    }
  }

  scss += `  }\n`;
  scss += `\n`;

  // Container query for responsive layout
  if (categorized.breakpoints && Object.keys(categorized.breakpoints).length > 0) {
    scss += `  // 📱 Container query - responsive layout\n`;
    scss += `  @container ${blockClass} (min-width: 600px) {\n`;
    scss += `    flex-direction: row;\n`;
    scss += `  }\n`;
    scss += `\n`;
  }

  // Element styles with full design treatment
  if (elementClasses.length > 0) {
    scss += `  // ============================================\n`;
    scss += `  // 🎨 ELEMENT STYLES\n`;
    scss += `  // ============================================\n`;
    scss += `\n`;

    elementClasses.forEach(elementClass => {
      const elementName = elementClass.replace(`${moduleName}__`, '');
      scss += `  &__${elementName} {\n`;
      scss += generateFullElementStyles(elementName, recommendations, categorized);
      scss += `  }\n\n`;
    });
  }

  // Modifier styles
  if (modifierClasses.length > 0) {
    scss += `  // ============================================\n`;
    scss += `  // 🎨 MODIFIER STYLES\n`;
    scss += `  // ============================================\n`;
    scss += `\n`;

    modifierClasses.forEach(modifierClass => {
      const modifierName = modifierClass.replace(`${moduleName}--`, '');
      scss += `  &--${modifierName} {\n`;
      scss += generateFullModifierStyles(modifierName, recommendations, categorized);
      scss += `  }\n\n`;
    });
  }

  scss += `}\n\n`;

  // Dark mode support
  scss += `// ============================================\n`;
  scss += `// 🌙 DARK MODE SUPPORT\n`;
  scss += `// ============================================\n`;
  scss += `@media (prefers-color-scheme: dark) {\n`;
  scss += `  .${blockClass} {\n`;
  if (categorized.colors) {
    const darkBg = Object.keys(categorized.colors).find(k => k.includes('gray') && (k.includes('800') || k.includes('900')));
    if (darkBg) {
      const token = categorized.colors[darkBg];
      scss += `    background: ${toScss(darkBg, token)};\n`;
    }
  }
  scss += `  }\n`;
  scss += `}\n\n`;

  // Reduced motion support
  scss += `// ============================================\n`;
  scss += `// ♿ ACCESSIBILITY - REDUCED MOTION\n`;
  scss += `// ============================================\n`;
  scss += `@media (prefers-reduced-motion: reduce) {\n`;
  scss += `  .${blockClass} {\n`;
  scss += `    transition: none;\n`;
  scss += `    transform: none !important;\n`;
  scss += `    \n`;
  scss += `    * {\n`;
  scss += `      transition: none !important;\n`;
  scss += `      animation: none !important;\n`;
  scss += `    }\n`;
  scss += `  }\n`;
  scss += `}\n\n`;

  // Responsive breakpoints
  if (categorized.breakpoints && Object.keys(categorized.breakpoints).length > 0) {
    scss += `// ============================================\n`;
    scss += `// 📱 RESPONSIVE BREAKPOINTS\n`;
    scss += `// ============================================\n`;

    const breakpointKeys = Object.keys(categorized.breakpoints);
    const tabletKey = breakpointKeys.find(k => k.includes('tablet') && k.includes('max'));
    const mobileKey = breakpointKeys.find(k => k.includes('mobile') && k.includes('max'));

    if (tabletKey) {
      const token = categorized.breakpoints[tabletKey];
      scss += `@media (max-width: ${toScss(tabletKey, token)}) {\n`;
      scss += `  .${blockClass} {\n`;
      if (categorized.spacing) {
        const spacingKeys = Object.keys(categorized.spacing);
        const smallPadding = spacingKeys.find(k => k.includes('4')) || spacingKeys[0];
        if (smallPadding) {
          const spToken = categorized.spacing[smallPadding];
          scss += `    padding: ${toScss(smallPadding, spToken)};\n`;
        }
      }
      scss += `  }\n`;
      scss += `}\n\n`;
    }

    if (mobileKey) {
      const token = categorized.breakpoints[mobileKey];
      scss += `@media (max-width: ${toScss(mobileKey, token)}) {\n`;
      scss += `  .${blockClass} {\n`;
      if (categorized.spacing) {
        const spacingKeys = Object.keys(categorized.spacing);
        const tinyPadding = spacingKeys.find(k => k.includes('2') || k.includes('3')) || spacingKeys[0];
        if (tinyPadding) {
          const spToken = categorized.spacing[tinyPadding];
          scss += `    padding: ${toScss(tinyPadding, spToken)};\n`;
        }
      }
      scss += `    flex-direction: column;\n`;
      scss += `  }\n`;
      scss += `}\n\n`;
    }
  }

  // Print styles
  scss += `// ============================================\n`;
  scss += `// 🖨️  PRINT STYLES\n`;
  scss += `// ============================================\n`;
  scss += `@media print {\n`;
  scss += `  .${blockClass} {\n`;
  scss += `    box-shadow: none;\n`;
  scss += `    border: 1px solid #000;\n`;
  scss += `    transform: none;\n`;
  scss += `    page-break-inside: avoid;\n`;
  scss += `  }\n`;
  scss += `}\n`;

  return scss;
}

/**
 * Generate full production-ready element styles
 */
function generateFullElementStyles(elementName, recommendations, categorized) {
  let styles = '';
  const name = elementName.toLowerCase();

  // Common for all elements
  styles += `    // ${capitalize(elementName)}\n`;

  // Image wrapper/container
  if (name.includes('image') && (name.includes('wrapper') || name.includes('container'))) {
    styles += `    position: relative;\n`;
    styles += `    overflow: hidden;\n`;
    if (categorized.effects) {
      const radiusKeys = Object.keys(categorized.effects);
      const radiusToken = radiusKeys.find(k => k.includes('radius') && k.includes('md'));
      if (radiusToken) {
        const token = categorized.effects[radiusToken];
        styles += `    border-radius: ${toScss(radiusToken, token)};\n`;
      }
    }
    styles += `    aspect-ratio: 16 / 9;\n`;
    if (categorized.colors) {
      const bgKeys = Object.keys(categorized.colors);
      const lightBg = bgKeys.find(k => k.includes('gray') && k.includes('100'));
      if (lightBg) {
        const token = categorized.colors[lightBg];
        styles += `    background: ${toScss(lightBg, token)};\n`;
      }
    }
    return styles;
  }

  // Image
  if (name.includes('image') || name.includes('img')) {
    styles += `    width: 100%;\n`;
    styles += `    height: 100%;\n`;
    styles += `    object-fit: cover;\n`;
    styles += `    display: block;\n`;
    if (categorized.effects) {
      const transitionKeys = Object.keys(categorized.effects);
      const transitionToken = transitionKeys.find(k => k.includes('transition') && k.includes('slow'));
      if (transitionToken) {
        const token = categorized.effects[transitionToken];
        styles += `    transition: transform ${toScss(transitionToken, token)};\n`;
      } else {
        styles += `    transition: transform 0.5s ease;\n`;
      }
    }
    styles += `    \n`;
    styles += `    // Zoom on parent hover\n`;
    styles += `    .${name.split('__')[0]}:hover & {\n`;
    styles += `      transform: scale(1.05);\n`;
    styles += `    }\n`;
    return styles;
  }

  // Title/Heading
  if (name.includes('title') || name.includes('heading') || name.includes('header')) {
    if (recommendations.typography.heading) {
      styles += `    font-family: ${recommendations.typography.heading.scss};\n`;
    }
    styles += `    font-size: clamp(1.25rem, 3vw, 1.75rem);\n`;
    styles += `    font-weight: 700;\n`;
    styles += `    line-height: 1.2;\n`;
    styles += `    margin: 0;\n`;

    if (recommendations.colors.primary) {
      styles += `    \n`;
      styles += `    // Gradient text effect\n`;
      styles += `    background: linear-gradient(135deg, ${recommendations.colors.primary.scss} 0%, ${recommendations.colors.primary.scss} 100%);\n`;
      styles += `    -webkit-background-clip: text;\n`;
      styles += `    -webkit-text-fill-color: transparent;\n`;
      styles += `    background-clip: text;\n`;
    }
    return styles;
  }

  // Description/Content
  if (name.includes('description') || name.includes('content') || name.includes('body')) {
    if (recommendations.typography.body) {
      styles += `    font-family: ${recommendations.typography.body.scss};\n`;
    }
    if (recommendations.colors.text) {
      styles += `    color: ${recommendations.colors.text.scss};\n`;
    }
    styles += `    line-height: 1.6;\n`;
    styles += `    margin: 0;\n`;
    styles += `    \n`;
    styles += `    // Line clamping for overflow\n`;
    styles += `    display: -webkit-box;\n`;
    styles += `    -webkit-line-clamp: 3;\n`;
    styles += `    -webkit-box-orient: vertical;\n`;
    styles += `    overflow: hidden;\n`;
    return styles;
  }

  // Button/CTA
  if (name.includes('button') || name.includes('cta') || name.includes('action')) {
    styles += `    // 🎯 Full button treatment\n`;
    styles += `    display: inline-flex;\n`;
    styles += `    align-items: center;\n`;
    styles += `    justify-content: center;\n`;
    if (categorized.spacing) {
      const spacingKeys = Object.keys(categorized.spacing);
      const gapToken = spacingKeys.find(k => k.includes('2'));
      if (gapToken) {
        const token = categorized.spacing[gapToken];
        styles += `    gap: ${toScss(gapToken, token)};\n`;
      }
    }
    styles += `    \n`;

    if (recommendations.colors.primary) {
      styles += `    background: linear-gradient(135deg, ${recommendations.colors.primary.scss} 0%, ${recommendations.colors.primary.scss} 100%);\n`;
    }
    styles += `    color: white;\n`;

    if (categorized.spacing) {
      const spacingKeys = Object.keys(categorized.spacing);
      const paddingY = spacingKeys.find(k => k.includes('3'));
      const paddingX = spacingKeys.find(k => k.includes('6'));
      if (paddingY && paddingX) {
        const yToken = categorized.spacing[paddingY];
        const xToken = categorized.spacing[paddingX];
        styles += `    padding: ${toScss(paddingY, yToken)} ${toScss(paddingX, xToken)};\n`;
      }
    }

    styles += `    border: none;\n`;

    if (categorized.effects) {
      const radiusKeys = Object.keys(categorized.effects);
      const radiusToken = radiusKeys.find(k => k.includes('radius') && k.includes('md'));
      if (radiusToken) {
        const token = categorized.effects[radiusToken];
        styles += `    border-radius: ${toScss(radiusToken, token)};\n`;
      }
    }

    if (recommendations.typography.button) {
      styles += `    font-family: ${recommendations.typography.button.scss};\n`;
    }
    styles += `    font-size: 1rem;\n`;
    styles += `    font-weight: 600;\n`;
    styles += `    text-transform: uppercase;\n`;
    styles += `    letter-spacing: 0.5px;\n`;
    styles += `    \n`;

    if (categorized.effects) {
      const shadowKeys = Object.keys(categorized.effects);
      const shadowToken = shadowKeys.find(k => k.includes('shadow') && k.includes('md'));
      if (shadowToken) {
        const token = categorized.effects[shadowToken];
        styles += `    box-shadow: ${toScss(shadowToken, token)};\n`;
      }

      const transitionKeys = Object.keys(categorized.effects);
      const transitionToken = transitionKeys.find(k => k.includes('transition') && k.includes('base'));
      if (transitionToken) {
        const token = categorized.effects[transitionToken];
        styles += `    transition: all ${toScss(transitionToken, token)};\n`;
      }
    }

    styles += `    cursor: pointer;\n`;
    styles += `    position: relative;\n`;
    styles += `    overflow: hidden;\n`;
    styles += `    \n`;
    styles += `    // Hover state\n`;
    styles += `    &:hover {\n`;
    styles += `      transform: translateY(-2px);\n`;

    if (categorized.effects) {
      const shadowKeys = Object.keys(categorized.effects);
      const hoverShadow = shadowKeys.find(k => k.includes('shadow') && k.includes('lg'));
      if (hoverShadow) {
        const token = categorized.effects[hoverShadow];
        styles += `      box-shadow: ${toScss(hoverShadow, token)};\n`;
      }
    }

    styles += `    }\n`;
    styles += `    \n`;
    styles += `    // Active state\n`;
    styles += `    &:active {\n`;
    styles += `      transform: translateY(0);\n`;

    if (categorized.effects) {
      const shadowKeys = Object.keys(categorized.effects);
      const activeShadow = shadowKeys.find(k => k.includes('shadow') && k.includes('sm'));
      if (activeShadow) {
        const token = categorized.effects[activeShadow];
        styles += `      box-shadow: ${toScss(activeShadow, token)};\n`;
      }
    }

    styles += `    }\n`;
    styles += `    \n`;
    styles += `    // Focus state (accessibility)\n`;
    styles += `    &:focus-visible {\n`;
    if (recommendations.colors.primary) {
      styles += `      outline: 3px solid rgba(${recommendations.colors.primary.value}, 0.4);\n`;
    } else {
      styles += `      outline: 3px solid rgba(59, 130, 246, 0.4);\n`;
    }
    styles += `      outline-offset: 2px;\n`;
    styles += `    }\n`;
    styles += `    \n`;
    styles += `    // Ripple effect\n`;
    styles += `    &::before {\n`;
    styles += `      content: '';\n`;
    styles += `      position: absolute;\n`;
    styles += `      top: 50%;\n`;
    styles += `      left: 50%;\n`;
    styles += `      width: 0;\n`;
    styles += `      height: 0;\n`;
    styles += `      border-radius: 50%;\n`;
    styles += `      background: rgba(white, 0.3);\n`;
    styles += `      transform: translate(-50%, -50%);\n`;
    styles += `      transition: width 0.6s, height 0.6s;\n`;
    styles += `    }\n`;
    styles += `    \n`;
    styles += `    &:active::before {\n`;
    styles += `      width: 300px;\n`;
    styles += `      height: 300px;\n`;
    styles += `    }\n`;

    return styles;
  }

  // Badge
  if (name.includes('badge') || name.includes('tag') || name.includes('label')) {
    styles += `    position: absolute;\n`;
    if (categorized.spacing) {
      const spacingKeys = Object.keys(categorized.spacing);
      const smallSpace = spacingKeys.find(k => k.includes('3'));
      if (smallSpace) {
        const token = categorized.spacing[smallSpace];
        styles += `    top: ${toScss(smallSpace, token)};\n`;
        styles += `    right: ${toScss(smallSpace, token)};\n`;
      }
    }

    if (recommendations.colors.accent) {
      styles += `    background: linear-gradient(135deg, ${recommendations.colors.accent.scss} 0%, ${recommendations.colors.accent.scss} 100%);\n`;
    }
    styles += `    color: white;\n`;

    if (categorized.spacing) {
      const spacingKeys = Object.keys(categorized.spacing);
      const paddingY = spacingKeys.find(k => k.includes('2'));
      const paddingX = spacingKeys.find(k => k.includes('3'));
      if (paddingY && paddingX) {
        const yToken = categorized.spacing[paddingY];
        const xToken = categorized.spacing[paddingX];
        styles += `    padding: ${toScss(paddingY, yToken)} ${toScss(paddingX, xToken)};\n`;
      }
    }

    if (categorized.effects) {
      const radiusKeys = Object.keys(categorized.effects);
      const fullRadius = radiusKeys.find(k => k.includes('full'));
      if (fullRadius) {
        const token = categorized.effects[fullRadius];
        styles += `    border-radius: ${toScss(fullRadius, token)};\n`;
      }
    }

    styles += `    font-size: 0.875rem;\n`;
    styles += `    font-weight: 600;\n`;
    styles += `    text-transform: uppercase;\n`;
    styles += `    letter-spacing: 0.5px;\n`;

    if (categorized.effects) {
      const shadowKeys = Object.keys(categorized.effects);
      const shadowToken = shadowKeys.find(k => k.includes('shadow') && k.includes('sm'));
      if (shadowToken) {
        const token = categorized.effects[shadowToken];
        styles += `    box-shadow: ${toScss(shadowToken, token)};\n`;
      }
    }

    styles += `    z-index: 10;\n`;
    return styles;
  }

  // Default
  styles += `    // Add custom styles\n`;
  return styles;
}

/**
 * Generate full production-ready modifier styles
 */
function generateFullModifierStyles(modifierName, recommendations, categorized) {
  let styles = '';
  const name = modifierName.toLowerCase();

  styles += `    // ${capitalize(modifierName)} variant\n`;

  // Featured/primary modifier
  if (name.includes('featured') || name.includes('primary')) {
    if (recommendations.colors.primary) {
      styles += `    border: 2px solid ${recommendations.colors.primary.scss};\n`;
    }
    styles += `    transform: scale(1.02);\n`;

    if (categorized.effects) {
      const shadowKeys = Object.keys(categorized.effects);
      const xlShadow = shadowKeys.find(k => k.includes('shadow') && k.includes('xl'));
      if (xlShadow) {
        const token = categorized.effects[xlShadow];
        styles += `    box-shadow: ${toScss(xlShadow, token)};\n`;
      }
    }
  }

  // Large modifier
  else if (name.includes('large')) {
    if (categorized.spacing) {
      const spacingKeys = Object.keys(categorized.spacing);
      const largeSpace = spacingKeys.find(k => k.includes('8'));
      if (largeSpace) {
        const token = categorized.spacing[largeSpace];
        styles += `    padding: ${toScss(largeSpace, token)};\n`;
      }
    }
    styles += `    font-size: 1.125rem;\n`;
  }

  // Small modifier
  else if (name.includes('small')) {
    if (categorized.spacing) {
      const spacingKeys = Object.keys(categorized.spacing);
      const smallSpace = spacingKeys.find(k => k.includes('2') || k.includes('3'));
      if (smallSpace) {
        const token = categorized.spacing[smallSpace];
        styles += `    padding: ${toScss(smallSpace, token)};\n`;
      }
    }
    styles += `    font-size: 0.875rem;\n`;
  }

  // Default
  if (!styles.includes('padding') && !styles.includes('border')) {
    styles += `    // Add variant styles\n`;
  }

  return styles;
}

/**
 * Format design tokens into a CONCISE readable prompt for Claude AI
 * Only include the most important tokens to avoid timeouts
 */
export function formatTokensForPrompt(designTokens) {
  if (!designTokens || !designTokens.success) {
    console.error('⚠️  formatTokensForPrompt: No design tokens or not successful');
    return 'No design tokens available.';
  }

  const { tokens, recommendations } = designTokens;
  if (!tokens) {
    console.error('⚠️  formatTokensForPrompt: tokens is undefined');
    return 'No design tokens available.';
  }

  const { scss, css, mixins, categorized } = tokens;
  if (!categorized) {
    console.error('⚠️  formatTokensForPrompt: categorized is undefined');
    return 'Design tokens found but not categorized.';
  }

  console.error(`✅ formatTokensForPrompt: Processing ${Object.keys(categorized).length} categories`);

  let output = '';

  // DEBUG: Log all available SCSS variables so we can see what's actually available
  if (scss && typeof scss === 'object') {
    console.error(`\n📋 Available SCSS variables in project:`);
    const scssKeys = Object.keys(scss).slice(0, 20);
    scssKeys.forEach(key => {
      console.error(`  $${key}: ${scss[key].value}`);
    });
    if (Object.keys(scss).length > 20) {
      console.error(`  ... and ${Object.keys(scss).length - 20} more`);
    }
  }

  // Show ONLY the most important tokens from each category
  const categories = ['colors', 'typography', 'spacing', 'effects', 'breakpoints'];

  categories.forEach(category => {
    const items = categorized[category];
    if (!items || Object.keys(items).length === 0) return;

    const entries = Object.entries(items);
    const maxPerCategory = category === 'colors' ? 5 : (category === 'spacing' ? 6 : 4);
    const limitedEntries = entries.slice(0, maxPerCategory);

    if (limitedEntries.length > 0) {
      output += `${category.charAt(0).toUpperCase() + category.slice(1)}: `;
      output += limitedEntries.map(([name, data]) => {
        if (data.type === 'scss') {
          return `$${name}`;
        } else {
          return `var(--${name})`;
        }
      }).join(', ');

      if (entries.length > maxPerCategory) {
        output += ` (+${entries.length - maxPerCategory} more)`;
      }
      output += '\n';
    }
  });

  // Show a few mixins with their parameters
  if (mixins && typeof mixins === 'object') {
    const mixinEntries = Object.entries(mixins);
    if (mixinEntries.length > 0) {
      output += '\nMixins (with required parameters):\n';
      mixinEntries.slice(0, 5).forEach(([name, mixin]) => {
        output += `  @include ${name}${mixin.params}\n`;
      });
      if (mixinEntries.length > 5) {
        output += `  (+${mixinEntries.length - 5} more mixins available)\n`;
      }
    }
  }

  // Add key recommendations as examples (with safety checks)
  try {
    if (recommendations) {
      output += '\nKey tokens:\n';
      if (recommendations.colors && recommendations.colors.primary) {
        output += `  Primary: ${recommendations.colors.primary.scss}\n`;
      }
      if (recommendations.colors && recommendations.colors.secondary) {
        output += `  Secondary: ${recommendations.colors.secondary.scss}\n`;
      }
      if (recommendations.typography && recommendations.typography.heading) {
        output += `  Heading font: ${recommendations.typography.heading.scss}\n`;
      }
      if (recommendations.typography && recommendations.typography.body) {
        output += `  Body font: ${recommendations.typography.body.scss}\n`;
      }
      if (recommendations.effects && recommendations.effects.shadow) {
        output += `  Shadow: ${recommendations.effects.shadow.scss}\n`;
      }
    } else {
      console.error('⚠️  formatTokensForPrompt: recommendations is undefined');
    }
  } catch (error) {
    console.error(`⚠️  Error accessing recommendations: ${error.message}`);
  }

  output += `\nTotal tokens available: ${tokens.total} (showing summary above)`;

  // DEBUG: Log what we're sending to Claude
  console.error(`\n📤 Formatted token list being sent to Claude:`);
  console.error(output);
  console.error(`--- END OF TOKEN LIST ---\n`);

  return output;
}

/**
 * Generate token-aware SCSS for a module
 */
export function generateTokenAwareSCSS(moduleName, moduleType, classes, htmlContent, designTokens, fullDesign = false) {
  if (!designTokens || !designTokens.success) {
    console.error('⚠️  No design tokens available, generating basic SCSS');
    return generateBasicSCSS(moduleName, moduleType, classes);
  }

  const { recommendations, tokens } = designTokens;
  if (!tokens || !tokens.categorized) {
    console.error('⚠️  Design tokens missing categorized data, generating basic SCSS');
    return generateBasicSCSS(moduleName, moduleType, classes);
  }

  const { categorized } = tokens;

  // If fullDesign mode is enabled, Claude will generate the SCSS
  // This function is only called as a fallback if Claude doesn't provide SCSS
  if (fullDesign) {
    console.error(`⚠️  fullDesign mode should generate SCSS via Claude, falling back to template`);
    return generateFullDesignSCSS(moduleName, moduleType, classes, htmlContent, recommendations, categorized);
  }

  console.error(`🎨 Generating token-aware SCSS using ${tokens.total} design tokens`);

  // Categorize classes by BEM pattern
  const blockClass = classes.find(c => c === moduleName);
  const elementClasses = classes.filter(c => c.startsWith(`${moduleName}__`));
  const modifierClasses = classes.filter(c => c.startsWith(`${moduleName}--`));

  let scss = `// ${capitalize(moduleName)} ${moduleType}\n`;
  scss += `// Generated using project design tokens\n`;
  scss += `//\n`;
  scss += `// BEM Classes:\n`;
  classes.forEach(c => {
    scss += `//   .${c}\n`;
  });
  scss += `\n`;

  if (blockClass) {
    scss += `.${blockClass} {\n`;
    scss += `  // Main ${moduleType} container\n`;
    scss += `  display: block;\n`;

    // Add intelligent spacing
    if (categorized.spacing && Object.keys(categorized.spacing).length > 0) {
      const spacingKeys = Object.keys(categorized.spacing);
      const mediumSpacing = spacingKeys.find(k => k.includes('8') || k.includes('medium')) || spacingKeys[Math.floor(spacingKeys.length / 2)];
      if (mediumSpacing) {
        const token = categorized.spacing[mediumSpacing];
        scss += `  margin: ${toScss(mediumSpacing, token)} 0;\n`;
      }
    } else {
      scss += `  margin: 2rem 0;\n`;
    }

    scss += `\n`;

    // Add element styles with design tokens
    if (elementClasses.length > 0) {
      elementClasses.forEach(elementClass => {
        const elementName = elementClass.replace(`${moduleName}__`, '');
        scss += `  &__${elementName} {\n`;
        scss += `    // ${capitalize(elementName)}\n`;
        scss += generateElementStyles(elementName, recommendations, categorized);
        scss += `  }\n\n`;
      });
    }

    // Add modifier styles
    if (modifierClasses.length > 0) {
      scss += `  // Modifiers\n`;
      modifierClasses.forEach(modifierClass => {
        const modifierName = modifierClass.replace(`${moduleName}--`, '');
        scss += `  &--${modifierName} {\n`;
        scss += `    // ${capitalize(modifierName)} variant\n`;
        scss += generateModifierStyles(modifierName, recommendations, categorized);
        scss += `  }\n\n`;
      });
    }

    scss += `}\n`;

    // Add responsive styles if breakpoints exist
    if (categorized.breakpoints && Object.keys(categorized.breakpoints).length > 0) {
      const breakpointKeys = Object.keys(categorized.breakpoints);
      const tabletKey = breakpointKeys.find(k => k.includes('tablet') && (k.includes('max') || k.includes('min')));

      if (tabletKey) {
        scss += `\n// Responsive\n`;
        const token = categorized.breakpoints[tabletKey];
        const mediaQuery = tabletKey.includes('max') ? 'max-width' : 'min-width';
        scss += `@media (${mediaQuery}: ${toScss(tabletKey, token)}) {\n`;
        scss += `  .${blockClass} {\n`;
        scss += `    // Mobile/tablet adjustments\n`;
        scss += `  }\n`;
        scss += `}\n`;
      }
    }
  } else {
    // No BEM structure, create flat styles
    scss += `// Flat structure (no BEM block found)\n\n`;
    classes.forEach(c => {
      scss += `.${c} {\n`;
      scss += `  // Add styles here\n`;
      scss += `}\n\n`;
    });
  }

  return scss;
}

/**
 * Generate element-specific styles using design tokens
 */
function generateElementStyles(elementName, recommendations, categorized) {
  let styles = '';
  const name = elementName.toLowerCase();

  // Container/wrapper
  if (name.includes('container') || name.includes('wrapper')) {
    if (categorized.spacing && Object.keys(categorized.spacing).length > 0) {
      const spacingKeys = Object.keys(categorized.spacing);
      const smallSpacing = spacingKeys.find(k => k.includes('4') || k.includes('small')) || spacingKeys[0];
      if (smallSpacing) {
        const token = categorized.spacing[smallSpacing];
        styles += `    padding: ${toScss(smallSpacing, token)};\n`;
      }
    }
  }

  // Title/heading
  else if (name.includes('title') || name.includes('heading') || name.includes('header')) {
    if (recommendations.typography.heading) {
      styles += `    font-family: ${recommendations.typography.heading.scss};\n`;
    }
    if (categorized.typography) {
      const sizeKey = Object.keys(categorized.typography).find(k => k.includes('h2') || k.includes('large'));
      if (sizeKey) {
        const token = categorized.typography[sizeKey];
        styles += `    font-size: ${toScss(sizeKey, token)};\n`;
      }
    }
    styles += `    font-weight: bold;\n`;
    if (recommendations.colors.text) {
      styles += `    color: ${recommendations.colors.text.scss};\n`;
    }
  }

  // Content/description
  else if (name.includes('content') || name.includes('body') || name.includes('description')) {
    if (recommendations.typography.body) {
      styles += `    font-family: ${recommendations.typography.body.scss};\n`;
    }
    if (recommendations.colors.text) {
      styles += `    color: ${recommendations.colors.text.scss};\n`;
    }
    styles += `    line-height: 1.6;\n`;
  }

  // Image
  else if (name.includes('image') || name.includes('img')) {
    styles += `    width: 100%;\n`;
    styles += `    height: auto;\n`;
    styles += `    display: block;\n`;
    if (recommendations.effects.radius) {
      styles += `    border-radius: ${recommendations.effects.radius.scss};\n`;
    }
  }

  // Button/CTA
  else if (name.includes('button') || name.includes('cta') || name.includes('action')) {
    if (recommendations.colors.primary) {
      styles += `    background-color: ${recommendations.colors.primary.scss};\n`;
    }
    styles += `    color: #fff;\n`;
    if (categorized.spacing && Object.keys(categorized.spacing).length > 0) {
      const spacingKeys = Object.keys(categorized.spacing);
      const smallSpacing = spacingKeys[0];
      const token = categorized.spacing[smallSpacing];
      if (token.type === 'css') {
        styles += `    padding: ${toScss(smallSpacing, token)} ${toScss(smallSpacing, token)};\n`;
      } else {
        styles += `    padding: $${smallSpacing} calc($${smallSpacing} * 2);\n`;
      }
    }
    if (recommendations.effects.radius) {
      styles += `    border-radius: ${recommendations.effects.radius.scss};\n`;
    }
    if (recommendations.effects.transition) {
      styles += `    transition: all ${recommendations.effects.transition.scss};\n`;
    }
    styles += `    cursor: pointer;\n`;
  }

  // Card
  else if (name.includes('card')) {
    if (recommendations.colors.background) {
      styles += `    background: ${recommendations.colors.background.scss};\n`;
    }
    if (recommendations.effects.shadow) {
      styles += `    box-shadow: ${recommendations.effects.shadow.scss};\n`;
    }
    if (recommendations.effects.radius) {
      styles += `    border-radius: ${recommendations.effects.radius.scss};\n`;
    }
  }

  // Default
  if (!styles) {
    styles += `    // Add custom styles\n`;
  }

  return styles;
}

/**
 * Generate modifier styles using design tokens
 */
function generateModifierStyles(modifierName, recommendations, categorized) {
  let styles = '';
  const name = modifierName.toLowerCase();

  // Size modifiers
  if (name.includes('large')) {
    if (categorized.spacing && Object.keys(categorized.spacing).length > 0) {
      const largeSpacing = Object.keys(categorized.spacing).find(k => k.includes('8') || k.includes('large'));
      if (largeSpacing) {
        const token = categorized.spacing[largeSpacing];
        styles += `    padding: ${toScss(largeSpacing, token)};\n`;
      }
    }
  } else if (name.includes('small')) {
    if (categorized.spacing && Object.keys(categorized.spacing).length > 0) {
      const smallSpacing = Object.keys(categorized.spacing).find(k => k.includes('2') || k.includes('small'));
      if (smallSpacing) {
        const token = categorized.spacing[smallSpacing];
        styles += `    padding: ${toScss(smallSpacing, token)};\n`;
      }
    }
  }

  // Color modifiers
  if (name.includes('primary')) {
    if (recommendations.colors.primary) {
      styles += `    background-color: ${recommendations.colors.primary.scss};\n`;
    }
  } else if (name.includes('secondary')) {
    if (recommendations.colors.secondary) {
      styles += `    background-color: ${recommendations.colors.secondary.scss};\n`;
    }
  }

  // Default
  if (!styles) {
    styles += `    // Add variant styles\n`;
  }

  return styles;
}

/**
 * Fallback: Generate basic SCSS without design tokens
 */
function generateBasicSCSS(moduleName, moduleType, classes) {
  let scss = `// ${capitalize(moduleName)} ${moduleType}\n`;
  scss += `// No design tokens available - using basic styles\n\n`;

  if (!classes || !Array.isArray(classes) || classes.length === 0) {
    scss += `.${moduleName} {\n`;
    scss += `  // Add styles here\n`;
    scss += `}\n`;
    return scss;
  }

  const blockClass = classes.find(c => c === moduleName);

  if (blockClass) {
    scss += `.${blockClass} {\n`;
    classes.filter(c => c !== blockClass).forEach(c => {
      if (c.startsWith(`${moduleName}__`)) {
        const element = c.replace(`${moduleName}__`, '');
        scss += `  &__${element} {\n`;
        scss += `    // Add styles\n`;
        scss += `  }\n\n`;
      } else if (c.startsWith(`${moduleName}--`)) {
        const modifier = c.replace(`${moduleName}--`, '');
        scss += `  &--${modifier} {\n`;
        scss += `    // Add variant styles\n`;
        scss += `  }\n\n`;
      }
    });
    scss += `}\n`;
  } else {
    classes.forEach(c => {
      scss += `.${c} {\n`;
      scss += `  // Add styles\n`;
      scss += `}\n\n`;
    });
  }

  return scss;
}

/**
 * Helper: Capitalize and format strings
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
}
