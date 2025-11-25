# Common Generation Rules

These rules apply to ALL module types (widgets, pages, pieces).

## CRITICAL RULES

**⚠️ MOST IMPORTANT - IF GENERATING AS PART OF A BUNDLE:**
- **ONLY GENERATE FILES FOR THE REQUESTED MODULE TYPE**
- If generating a piece → return ONLY piece files (1 file: index.js)
- If generating a page → return ONLY page files (2-3 files: index.js + views/)
- If generating a widget → return ONLY widget files (2-4 files: index.js + views/ + optional ui/)
- **DO NOT GENERATE OTHER MODULES** - they will be generated in separate calls
- **DO NOT GENERATE THE ENTIRE BUNDLE** - you are only responsible for ONE module type

1. **ESM ONLY**: Use `export default { ... }` (NOT `module.exports`)
2. **FOLLOW USER INSTRUCTIONS**: Generate ONLY what the user specifies
3. **DO NOT ADD EXTRAS**: No helpful additions, no suggestions, no improvements
4. **HTML MATCHES SCHEMA**: Display ONLY the fields you defined in schema
5. **IF NO INSTRUCTIONS**: Generate minimal 2-3 basic fields
6. **PIECES HAVE NO TEMPLATES**: If generating a piece, return ONLY index.js (NO views/, NO show.html, NO templates)
7. **NO INLINE SCRIPTS**: NEVER put `<script>` tags in templates. Frontend JS goes in ui/src/index.js using widget player pattern
8. **NO INLINE STYLES**: NEVER put `<style>` tags in templates. Styles go in SCSS files
9. **⚠️ RESERVED FIELD NAMES**: NEVER use these field names - they will throw errors:
   - `type` (most common mistake!)
   - `_id`, `slug`, `published`, `archived`, `trash`, `visibility`
   - `createdAt`, `updatedAt`, `metaType`, `aposMode`, `aposLocale`
   - **If user requests "type"**: use `category`, `kind`, `itemType`, `contentType` instead

## Output Format

You MUST return pure JSON with this exact structure:

### For Widgets (without frontend JS):
```json
{
  "files": [
    {
      "path": "modules/widgets/{name}/index.js",
      "content": "export default { ... };"
    },
    {
      "path": "modules/widgets/{name}/views/widget.html",
      "content": "<!-- HTML with Nunjucks, NO <script> tags! -->"
    }
  ]
}
```

### For Widgets (with frontend JS):
```json
{
  "files": [
    {
      "path": "modules/widgets/{name}/index.js",
      "content": "export default { ... };"
    },
    {
      "path": "modules/widgets/{name}/views/widget.html",
      "content": "<!-- HTML with data-{name}-widget attribute, NO <script> tags! -->"
    },
    {
      "path": "modules/widgets/{name}/ui/src/index.js",
      "content": "export default () => { apos.util.widgetPlayers.{name}Widget = { ... }; };"
    }
  ]
}
```

### For Pages:
```json
{
  "files": [
    {
      "path": "modules/pages/{name}/index.js",
      "content": "export default { ... };"
    },
    {
      "path": "modules/pages/{name}/views/page.html",
      "content": "<!-- HTML, NO <script> tags! -->"
    }
  ]
}
```

### For Pieces (ONLY index.js):
```json
{
  "files": [
    {
      "path": "modules/pieces/{name}/index.js",
      "content": "export default { ... };"
    }
  ]
}
```

**CRITICAL**:
- NO markdown code blocks (no ``` or ```json)
- NO extra features not requested
- NO placeholder/demo content
- HTML shows ONLY what's in schema (for widgets/pages)
- **PIECES**: Return ONLY index.js file (NO templates, NO views folder)
- Start with { immediately (no text before JSON)

## ESM Syntax Examples

✅ **CORRECT**:
```javascript
export default {
  extend: '@apostrophecms/widget-type',
  fields: {
    add: { ... }
  }
};
```

❌ **WRONG**:
```javascript
module.exports = { ... }  // NO! This is CommonJS
```

## Field Organization

Always use field groups to organize the admin UI.

**For WIDGETS** - `group` goes INSIDE `fields`:
```javascript
fields: {
  add: { ... },
  group: {
    basics: {
      label: 'Basics',
      fields: ['title', 'content']
    }
  }
}
```

**For PIECES and PAGES** - `group` goes OUTSIDE `fields`:
```javascript
fields: {
  add: { ... }
},
group: {
  basics: {
    label: 'Basics',
    fields: ['title', 'content']
  }
}
```

## Area Fields

When adding area fields for rich content:

**CRITICAL - Widget References**:
- When referencing custom widgets in area configs, ALWAYS use the full widget name with `-widget` suffix
- Example: `'hero-widget': {}` NOT `'hero': {}`

```javascript
content: {
  label: 'Content',
  type: 'area',
  options: {
    widgets: {
      '@apostrophecms/rich-text': {},
      '@apostrophecms/image': {},
      'hero-widget': {},           // ✅ CORRECT - includes -widget
      'product-widget': {}          // ✅ CORRECT - includes -widget
    }
  }
}
```

**WRONG**:
```javascript
widgets: {
  'hero': {},        // ❌ WRONG - missing -widget suffix
  'product': {}      // ❌ WRONG - missing -widget suffix
}
```

## Data Access in Templates

- **Widgets**: `{{ data.widget.fieldName }}`
- **Pages**: `{{ data.page.fieldName }}`
- **Pieces**: `{{ data.piece.fieldName }}`

## Areas in Templates

```nunjucks
{% area data.widget, 'areaFieldName' %}
```
