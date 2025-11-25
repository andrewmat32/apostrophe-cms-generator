# Page Module Generation Prompt

You are generating an Apostrophe CMS page module{BUNDLE_CONTEXT}.

**CRITICAL - READ THIS FIRST**:
- You are generating ONLY THE PAGE MODULE
- DO NOT generate the piece module - it will be generated separately
- DO NOT generate widget modules - they will be generated separately
- ONLY return files for THIS page module: {MODULE_NAME}
- If part of a bundle, the piece already exists - just reference it
- **Widget names in area configs are REFERENCES ONLY** - don't create those widgets
- **ALWAYS use full widget name with -widget suffix** in area configs: `'hero-widget': {}` NOT `'hero': {}`
- Area configs like `'custom-filter-widget': {}` mean "allow this widget" - the widget exists elsewhere

## ⚠️ IMPORTANT: Page Registration Required

After generating the page module, you MUST register it in `modules/@apostrophecms/page/index.js`:

```javascript
export default {
  options: {
    types: [
      {
        name: '{MODULE_NAME}',
        label: '{MODULE_LABEL}'
      }
    ],
    // Optional: Auto-create page at specific URL
    park: [
      {
        title: '{MODULE_LABEL}',
        slug: '/page-url',
        type: '{MODULE_NAME}',
        parkedId: '{MODULE_NAME}'
      }
    ]
  }
};
```

**Add this instruction to your output**: "⚠️ REGISTRATION REQUIRED: Add this page to `modules/@apostrophecms/page/index.js` in the `types` array."

## Module Requirements

- **Name**: {MODULE_NAME}
- **Label**: {MODULE_LABEL}
{USER_INSTRUCTIONS}

## Page Schema (index.js)

### CRITICAL Structure Rules

- **Extend**: `{EXTEND_TYPE}` (REQUIRED)
{BUNDLE_INFO}
- **Add the fields/areas specified in USER INSTRUCTIONS** (or one 'main' area if none)
- Use appropriate field types based on what user requested
- **CRITICAL**: Structure is `export default { extend, options: {...}, fields: { add: {...}, group: {...} } }`
- **CRITICAL**: `group` is at the SAME LEVEL as `add`, INSIDE the `fields` object
- **CRITICAL**: ALL relationship fields MUST have underscore prefix (e.g., `_category`, `_pieces`)
- **CRITICAL**: When referencing relationship fields in group arrays, KEEP the underscore (e.g., `fields: ['title', '_category']`)

### ⚠️ CRITICAL: Reserved Field Names - DO NOT USE

**NEVER use these field names** - they are reserved by Apostrophe and will cause errors:

❌ **FORBIDDEN FIELD NAMES:**
- `type` - Used internally for module type (will throw error!)
- `_id` - MongoDB document ID
- `slug`, `published`, `archived`, `trash`, `visibility`
- `createdAt`, `updatedAt`, `metaType`, `aposMode`, `aposLocale`

**If user requests these concepts, use alternative names:**
- `type` → use `pageType`, `category`, `kind`, `variant`
- `status` → use `currentStatus`, `pageStatus`

### Field Types for Pages

- `area` - Main content areas (most common for pages)
- `string` - Text fields
- `select` - Dropdowns for settings
- `boolean` - Toggle options
- `relationship` - Connect to pieces

## Page Templates

{BUNDLE_TEMPLATES}

### Template Structure

**CRITICAL**: Templates are HTML ONLY (Nunjucks)

- ❌ **NEVER** include `<script>` tags
- ❌ **NEVER** include `<style>` tags
- ✅ **ONLY** HTML with Nunjucks template syntax

```nunjucks
{% extends 'layout.html' %}

{% block main %}
  <!-- Page content here - NO <script> tags! -->
  {% area data.page, 'areaName' %}
{% endblock %}
```

### Data Access

- Page title: `{{ data.page.title }}`
- Page fields: `{{ data.page.fieldName }}`
- Areas: `{% area data.page, 'areaName' %}`
{BUNDLE_DATA_ACCESS}

{BEM_CLASSES}

{BEM_GUIDANCE}

## File Paths

All files must use this exact path structure:

- **index.js**: `{CORRECT_PATH}/index.js`
{TEMPLATE_PATHS}

## Example: Standard Page

### Backend (index.js)

```javascript
export default {
  extend: '@apostrophecms/page-type',
  options: {
    label: 'Landing Page'
  },
  fields: {
    add: {
      main: {
        type: 'area',
        label: 'Main Content',
        options: {
          widgets: {
            '@apostrophecms/rich-text': {},
            '@apostrophecms/image': {},
            'custom-widget': {}
          }
        }
      }
    },
    // CRITICAL: group at SAME LEVEL as add, INSIDE fields
    group: {
      basics: {
        label: 'Basics',
        fields: ['title', 'main']
      }
    }
  }
};
```

### Frontend (views/page.html)

```html
{% extends 'layout.html' %}

{% block main %}
<div class="{MODULE_NAME}">
  <div class="{MODULE_NAME}__header">
    <h1 class="{MODULE_NAME}__title">{{ data.page.title }}</h1>
  </div>
  <div class="{MODULE_NAME}__content">
    {% area data.page, 'main' %}
  </div>
</div>
{% endblock %}
```

## Frontend JavaScript (Optional - Only if User Explicitly Requests)

{FRONTEND_JS_GUIDANCE}

## Remember

- Generate ONLY what user specified
- **ALL relationship fields MUST have underscore prefix** (`_fieldName`)
- Pages use `{% extends 'layout.html' %}` and `{% block main %}`
- HTML shows ONLY schema fields/areas
- Use exact file paths provided
- Return pure JSON (no markdown code blocks)
