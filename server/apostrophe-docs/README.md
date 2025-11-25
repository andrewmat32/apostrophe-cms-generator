# Apostrophe CMS Documentation Files

This directory contains comprehensive documentation of Apostrophe 3.x patterns extracted from your actual projects (dw4, abendsonneafrika).

## Files

### 1. `project-structure.json`
- **Purpose**: Overall project organization and file structure
- **Contains**: Directory layout, module organization, naming conventions, ESM syntax requirements
- **Use**: Understanding where to place different module types

### 2. `widgets-patterns.json`  
- **Purpose**: Complete widget implementation patterns
- **Contains**: Backend configuration, field types, frontend templates, Nunjucks patterns, Apostrophe helpers
- **Use**: Generating widget modules with proper data flow

### 3. `pieces-patterns.json`
- **Purpose**: Piece type (content types) implementation patterns
- **Contains**: Backend configuration, custom methods, frontend templates, relationships, API patterns
- **Use**: Generating piece types like blogs, products, events

### 4. `pages-patterns.json`
- **Purpose**: Page type implementation patterns
- **Contains**: Backend configuration, area definitions, frontend templates, routing, hierarchy
- **Use**: Generating custom page types with flexible content areas

### 5. `FRONTEND-JAVASCRIPT-PATTERN.md`
- **Purpose**: Frontend JavaScript logic for interactive widgets
- **Contains**: Widget player system, data attribute patterns, event handling, imports, accessibility best practices
- **Use**: Adding client-side behavior to widgets (accordions, sliders, tabs, modals) - only when explicitly requested

### 6. `RELATIONSHIP-PATTERN.md`
- **Purpose**: Connecting pieces to widgets and pages via relationships
- **Contains**: Relationship field patterns, show/select toggles, load methods
- **Use**: Displaying pieces within widgets or pages

### 7. Additional Pattern Files
- `nested-modules-pattern.json` - Bundle structures
- `AUTO-REGISTRATION.md` - Automatic module registration
- `AUTO-SCSS.md` - SCSS generation and organization

## Usage in Code Generator

### Pattern Files (JSON)

These JSON files serve as comprehensive reference documentation extracted from production code. They provide:

1. **Accurate Examples**: Real patterns from production code
2. **Data Flow**: How data moves from backend → database → frontend
3. **Best Practices**: Naming, organization, field grouping
4. **ESM Syntax**: Correct `export default` usage (not `module.exports`)
5. **Nunjucks Patterns**: Template syntax, loops, conditionals, helpers

### Prompt Templates (Markdown)

**NEW**: The `prompts/` directory contains Claude AI prompt templates that the MCP server uses for code generation.

See `prompts/README.md` for details on:
- How prompts are assembled
- Template variables and substitution
- Editing prompts without code changes
- Testing your changes

**Key benefit**: Non-developers can improve code generation by editing markdown files!

## Key Patterns

- **Module System**: ESM (ECMAScript Modules) - `export default { ... }`
- **Data Access**: `data.widget.*`, `data.piece.*`, `data.page.*`
- **Areas**: Flexible content regions that can contain widgets
- **Conditional Fields**: Show/hide based on other field values
- **Field Groups**: Organize fields into tabs in the editor UI

## Generated Code Location

When using these patterns to generate code:

- **Widgets**: `modules/widgets/{name}-widget/`
- **Pieces**: `modules/pieces/{name}-module/`
- **Pages**: `modules/pages/{name}-page/`

All modules must be registered in `app.js` under the `modules:` section.
