# Apostrophe Code Generator MCP Server

An MCP (Model Context Protocol) server that provides code generation tools for Apostrophe CMS with intelligent design token integration.

## 🔑 No API Keys Required!

This MCP server runs **locally** and doesn't need any API keys. It's just a tool that Claude Code can call.

## ✨ Key Features

- 🎨 **Design Token Extraction** - Automatically analyzes project SCSS and extracts design tokens
- 💎 **"Hire a Designer" Mode** - Generates production-ready SCSS with complete professional styling
- 🎯 **BEM Pattern Support** - Generates proper BEM class structures
- 🔧 **Auto-Registration** - Automatically registers modules in `modules.js` and `index.scss`
- 🌐 **Natural Language** - Generate modules from plain English descriptions
- 📦 **Bundle Support** - Create piece + page + widget bundles

## Installation

```bash
cd /home/andrei/health-check-tool-generator/mcp-server
npm install
```

## Configuration for Claude Code

### Option 1: Using airis-mcp-gateway (Recommended)

Add to your airis-mcp-gateway configuration:

```json
{
  "mcpServers": {
    "apostrophe-generator": {
      "command": "node",
      "args": ["/home/andrei/health-check-tool-generator/mcp-server/index.js"],
      "env": {}
    }
  }
}
```

### Option 2: Direct Configuration

Add to your Claude Code MCP settings (`~/.config/claude-code/mcp.json` or similar):

```json
{
  "mcpServers": {
    "apostrophe-generator": {
      "command": "node",
      "args": ["/home/andrei/health-check-tool-generator/mcp-server/index.js"]
    }
  }
}
```

## Available Tools

### 1. `list_apostrophe_projects`
Lists all discovered Apostrophe CMS projects in the parent directory.

**No parameters needed**

**Returns:**
```json
[
  {
    "id": "wedive",
    "name": "Wedive",
    "path": "/home/andrei/wedive",
    "database": "wedive"
  }
]
```

### 2. `analyze_project_structure`
Analyzes a project to see existing modules.

**Parameters:**
- `projectId` (string): The project ID

**Returns:**
```json
{
  "project": "Wedive",
  "path": "/home/andrei/wedive",
  "modules": {
    "widgets": ["hero-banner", "menu-widget"],
    "pages": ["article-page"],
    "pieces": ["article", "author"]
  }
}
```

### 3. `validate_module_name`
Validates a module name and checks if it exists.

**Parameters:**
- `projectId` (string): The project ID
- `moduleName` (string): Proposed module name
- `moduleType` (string): 'widget', 'page', or 'piece'

**Returns:**
```json
{
  "valid": true,
  "exists": false,
  "moduleName": "shopping-list",
  "moduleType": "widget",
  "path": "/home/andrei/wedive/modules/widgets/shopping-list-widget",
  "message": "Module name is valid and available"
}
```

### 4. `get_bem_structure`
Gets the BEM class structure for a module.

**Parameters:**
- `moduleName` (string): The module name
- `moduleType` (string): 'widget' or 'page'

**Returns:**
```json
{
  "moduleName": "shopping-list",
  "moduleType": "widget",
  "classes": {
    "block": ".shopping-list",
    "elements": [
      ".shopping-list__container",
      ".shopping-list__header",
      ".shopping-list__title"
    ],
    "modifiers": [
      ".shopping-list--large",
      ".shopping-list--dark"
    ],
    "example": "<div class=\"shopping-list\">...</div>"
  }
}
```

### 5. `analyze_design_tokens`
Extracts and analyzes design tokens (SCSS variables, CSS custom properties, and mixins) from a project's `index.scss` and all imported files.

**Parameters:**
- `projectId` (string): The project ID

**Returns:**
```json
{
  "success": true,
  "projectId": "wedive",
  "projectName": "Wedive",
  "filesAnalyzed": 15,
  "tokens": {
    "total": 147,
    "scss": { "main-color": "#215AA8", "headingFont": "Barlow" },
    "css": { "color-primary": "#215AA8", "space-4": "1rem" },
    "categorized": {
      "colors": { ... },
      "typography": { ... },
      "spacing": { ... },
      "effects": { ... },
      "breakpoints": { ... }
    }
  },
  "recommendations": {
    "colors": {
      "primary": { "name": "main-color", "value": "#215AA8", "scss": "$main-color" }
    },
    "typography": { ... },
    "effects": { ... }
  }
}
```

### 6. `list_available_asset_functions`
Lists all exported functions from a project's global asset module (`modules/asset/ui/src/index.js`).

**Parameters:**
- `projectId` (string): The project ID

**Returns:**
```json
{
  "success": true,
  "available": true,
  "functions": ["initAccordion", "toggleMenu", "setupSlider"],
  "importPath": "Modules/asset/index.js"
}
```

### 7. `generate_apostrophe_module`
Generates a complete Apostrophe module using Claude AI with all documentation and BEM patterns.

**Parameters:**
- `projectId` (string): The project ID
- `moduleType` (string): 'widget', 'page', or 'piece'
- `moduleName` (string): Module name in kebab-case
- `label` (string): Human-readable label
- `description` (string, optional): What the module should do
- `includeBemStyles` (boolean, default: true): Generate SCSS with BEM structure
- `fullDesign` (boolean, default: false): 💎 **HIRE A DESIGNER** - Generate production-ready SCSS with professional styling

**Returns:**
```json
{
  "success": true,
  "files": [
    { "path": "modules/widgets/product-card-widget/index.js", "content": "..." },
    { "path": "modules/widgets/product-card-widget/views/widget.html", "content": "..." },
    { "path": "modules/asset/ui/src/scss/components/_product-card.scss", "content": "..." }
  ],
  "moduleName": "product-card",
  "moduleType": "widget"
}
```

**Example - Basic Widget:**
```json
{
  "projectId": "wedive",
  "moduleType": "widget",
  "moduleName": "product-card",
  "label": "Product Card",
  "description": "Card with image, title, price, and buy button",
  "includeBemStyles": true,
  "fullDesign": false
}
```

**Example - 💎 Full Design Mode:**
```json
{
  "projectId": "wedive",
  "moduleType": "widget",
  "moduleName": "product-card",
  "label": "Product Card",
  "description": "Card with image, title, price, and buy button",
  "includeBemStyles": true,
  "fullDesign": true  // ← Generates production-ready SCSS!
}
```

### 8. `save_generated_module`
Saves generated module files to the project and auto-registers in `modules.js` and `index.scss`.

**Parameters:**
- `projectId` (string): The project ID
- `files` (array): Array of file objects with `path` and `content`
- `moduleName` (string): The module name
- `moduleType` (string): The module type
- `includeBemStyles` (boolean): Whether BEM styles were included

**Returns:**
```json
{
  "success": true,
  "savedCount": 3,
  "updatedModulesJs": true,
  "createdScss": true
}
```

### 9. `generate_from_natural_language`
Generates an Apostrophe module from a natural language description.

**Parameters:**
- `projectId` (string): The project ID
- `userRequest` (string): Natural language description

**Example Requests:**
- "Create a blog widget with title and content"
- "I need a product piece with price and description"
- "Make a landing page with hero section"
- "Generate a news bundle with pieces, page, and widget"

**Returns:**
```json
{
  "success": true,
  "parsed": {
    "moduleType": "widget",
    "moduleName": "blog",
    "label": "Blog",
    "confidence": "high"
  },
  "files": [...],
  "message": "Generated 3 file(s) for blog (parsed from natural language with high confidence)"
}
```

## Usage in Claude Code

### Basic Module Generation

```
User: Generate a product card widget for wedive project with image, title, price, and buy button

Claude: [calls generate_apostrophe_module]
        [calls save_generated_module]

Result: Widget created with BEM HTML and basic SCSS styles using project design tokens
```

### 💎 Production-Ready Design

```
User: Generate a hero banner widget for DW4 with full professional design

Claude: [calls generate_apostrophe_module with fullDesign: true]
        [calls save_generated_module]

Result: Widget created with:
- Complete hover/active/focus states
- Gradient backgrounds and text effects
- Container queries for responsiveness
- Dark mode support
- Accessibility features (reduced motion, focus rings)
- Print styles
- All using DW4's design tokens
```

### Design Token Analysis

```
User: Analyze design tokens in the wedive project

Claude: [calls analyze_design_tokens with projectId: "wedive"]

Result: Returns all SCSS variables, CSS custom properties, and mixins
        from index.scss and all imported files
```

### Natural Language Generation

```
User: Create a news bundle for wirodive

Claude: [calls generate_from_natural_language]

Result: Generates news piece, news-page, and news-widget as a bundle
```

## 🎨 Design Token Features

### Automatic Token Extraction
The MCP automatically:
- Recursively parses `index.scss` and all `@import` statements
- Extracts SCSS variables (`$main-color`, `$headingFont`, etc.)
- Extracts CSS custom properties (`--color-primary`, `--space-4`, etc.)
- Extracts SCSS mixins (`@mixin flexbox()`, etc.)
- Categorizes tokens (colors, typography, spacing, effects, breakpoints)
- Generates smart recommendations

### Token-Aware SCSS Generation
When `includeBemStyles: true`:
- Analyzes HTML to extract all BEM classes
- Generates SCSS using project's actual design tokens
- Automatically uses correct syntax: `$variable` vs `var(--property)`
- Applies intelligent defaults based on element type

### 💎 "Hire a Designer" Mode
When `fullDesign: true`:
- Generates **production-ready** SCSS (200-400 lines)
- Complete hover/active/focus states
- Gradient backgrounds and text effects
- Ripple effects on buttons
- Image zoom on hover
- Container queries (`@container`)
- Responsive breakpoints
- Dark mode support (`prefers-color-scheme: dark`)
- Reduced motion accessibility
- Print styles
- All using your project's design tokens!

**Comparison:**

| Feature | Basic BEM (`fullDesign: false`) | 💎 Full Design (`fullDesign: true`) |
|---------|--------------------------------|-------------------------------------|
| Lines of SCSS | ~20 lines | ~200-400 lines |
| Hover Effects | ❌ | ✅ Lift, shadow, zoom |
| Button States | ❌ | ✅ All states + ripple |
| Gradients | ❌ | ✅ Backgrounds + text |
| Container Queries | ❌ | ✅ Modern responsiveness |
| Dark Mode | ❌ | ✅ Automatic |
| Accessibility | ❌ | ✅ Focus rings, reduced motion |
| Production Ready | ❌ | ✅ Ship it! 🚀 |

## 🔧 Three Critical Fixes

### Fix #1: SCSS Import Underscore Prefix
SCSS partials are automatically imported with underscore prefix:
```scss
@import "./scss/components/_product-card";  // ✅ Correct
```

### Fix #2: CSS var() vs SCSS $ Syntax Detection
Automatically detects token source type and uses correct syntax:
```scss
// DW4 (SCSS variables)
.widget__title {
  color: $main-color;           // ✅ SCSS variable
  font-family: $headingFont;    // ✅ SCSS variable
}

// Abendsonneafrika (CSS custom properties)
.widget__title {
  color: var(--color-main);                    // ✅ CSS variable
  font-family: var(--typography-h2-font-family);  // ✅ CSS variable
}
```

### Fix #3: Widget -widget Suffix
Widgets always have the `-widget` suffix:
```
modules/widgets/accordion-widget/       ✅ Has suffix
modules.js: 'accordion-widget': {}      ✅ Has suffix
```

## 📚 Additional Documentation

- [DESIGN-TOKENS-FEATURE.md](./DESIGN-TOKENS-FEATURE.md) - Design token extraction system
- [HIRE-A-DESIGNER-FEATURE.md](./HIRE-A-DESIGNER-FEATURE.md) - Production-ready SCSS generation
- [FIXES-APPLIED.md](./FIXES-APPLIED.md) - Three critical fixes explained

## Benefits of MCP vs Web Server

**MCP Server:**
- ✅ Structured tool calls (type-safe)
- ✅ Direct integration with Claude Code
- ✅ No HTTP server needed
- ✅ Better error handling
- ✅ Built-in validation
- ✅ Design token integration
- ✅ Auto-registration in modules.js

**Old Web Server:**
- ❌ Unstructured HTTP requests
- ❌ Manual JSON parsing
- ❌ Port conflicts
- ❌ Less type safety
- ❌ No design token awareness

## Requirements

- **Node.js** v16 or higher
- **Claude CLI** (`npm install -g @anthropic-ai/cli`)
- **Claude API key** configured (`claude configure`)

## Testing

```bash
# Test syntax
node -c index.js

# List projects
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js

# Or use Claude Code to call the tools
```

## Troubleshooting

**"Command not found":**
- Make sure Node.js is installed
- Use absolute path in configuration

**"Module not found":**
- Run `npm install` in mcp-server directory

**"No projects found":**
- Projects must be in parent directory
- Projects must have `app.js` with `shortName`

**"Claude CLI not found":**
- Install: `npm install -g @anthropic-ai/cli`
- Configure: `claude configure`

**"Design tokens not found":**
- Ensure project has `modules/asset/ui/src/index.scss`
- Check file exists and is readable

## Project Structure

```
mcp-server/
├── index.js                    # MCP server entry point
├── generator.js                # Module generation logic
├── design-token-parser.js      # Design token extraction & SCSS generation
├── package.json
├── README.md
├── DESIGN-TOKENS-FEATURE.md    # Design token documentation
├── HIRE-A-DESIGNER-FEATURE.md  # Full design mode documentation
└── FIXES-APPLIED.md            # Technical fixes documentation
```

## License

MIT
