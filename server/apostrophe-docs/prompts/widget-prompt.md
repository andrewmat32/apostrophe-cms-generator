# Widget Module Generation Prompt

You are generating an Apostrophe CMS widget module{BUNDLE_CONTEXT}.

**CRITICAL - READ THIS FIRST**:
- You are generating ONLY THE WIDGET MODULE
- DO NOT generate the piece module - it will be generated separately
- DO NOT generate page modules - they will be generated separately
- ONLY return files for THIS widget module: {MODULE_NAME}
- **If part of a bundle, you MUST add a `_pieces` relationship field** to reference the piece in the bundle (see BUNDLE_RELATIONSHIP section below)

## Module Requirements

- **Name**: {MODULE_NAME}
- **Label**: {MODULE_LABEL}
{USER_INSTRUCTIONS}

## Widget Schema (index.js)

### Structure

**CRITICAL - NAMING**:
- Widget name MUST end with `-widget` (e.g., `hero-widget`, `product-widget`, `custom-widget`)

**CRITICAL - SCHEMA STRUCTURE**:
- **Extend**: `@apostrophecms/widget-type` (REQUIRED)
{BUNDLE_RELATIONSHIP}
- **Add the fields specified in USER INSTRUCTIONS** (or 2-3 basic fields if none)
- **DO NOT add relationship fields unless explicitly mentioned** in USER INSTRUCTIONS
- **CRITICAL**: ALL relationship fields MUST have underscore prefix (e.g., `_items`, `_category`, `_author`)
- **CRITICAL**: When referencing relationship fields in group arrays, KEEP the underscore (e.g., `fields: ['title', '_items']`)
- Use appropriate field types: string, area, boolean, array, select, relationship, etc.

**Correct Structure** (group inside fields, at same level as add):
```javascript
export default {
  extend: '@apostrophecms/widget-type',
  fields: {
    add: {
      fieldName: {
        type: 'string',
        label: 'Field Name'
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: ['fieldName']
      }
    }
  }
};
```

### ⚠️ CRITICAL: Reserved Field Names - DO NOT USE

**NEVER use these field names** - they are reserved by Apostrophe and will cause errors:

❌ **FORBIDDEN FIELD NAMES:**
- `type` - Used internally for module type (will throw error!)
- `_id` - MongoDB document ID
- `slug`, `published`, `archived`, `trash`, `visibility`
- `createdAt`, `updatedAt`, `metaType`, `aposMode`, `aposLocale`

**If user requests these concepts, use alternative names:**
- `type` → use `category`, `kind`, `itemType`, `variant`
- `status` → use `currentStatus`, `statusLabel`

### Field Types Available

- `string` - Text input
- `area` - Rich content area (can contain widgets)
- `boolean` - Checkbox
- `select` - Dropdown
- `checkboxes` - Multiple checkboxes
- `relationship` - Connect to pieces
- `array` - Repeating group of fields
- `date` - Date picker
- `url` - URL input
- `email` - Email input
- `integer` - Number input

## Widget Template (views/widget.html)

**CRITICAL**: Templates are HTML ONLY (Nunjucks + data attributes)

- ❌ **NEVER** include `<script>` tags in templates
- ❌ **NEVER** include `<style>` tags in templates
- ❌ **NEVER** use inline event handlers (`onclick`, `onchange`, etc.)
- ✅ **ALWAYS** use data attributes for frontend JS integration
- ✅ **IMPORTANT**: Data attribute must match widget name (including -widget suffix)
  - If widget is `hero-widget`, use `data-hero-widget`
  - NOT `data-hero` (missing -widget)

{BUNDLE_TEMPLATE}
- Display ONLY the fields defined in your schema
- Access fields: `{{ data.widget.fieldName }}`
- Areas: `{% area data.widget, 'areaName' %}`
- Arrays: `{% for item in data.widget.arrayName %}`
{BEM_CLASSES}
- NO extra content not related to schema fields
- Add `data-{widget-name}` attribute to root element for frontend JS (use full widget name with -widget)

{BEM_GUIDANCE}

## File Paths

All files must use this exact path structure:

- **index.js**: `{CORRECT_PATH}/index.js`
- **Template**: `{CORRECT_PATH}/views/widget.html`

## Example Widget

### Backend (index.js)

```javascript
export default {
  extend: '@apostrophecms/widget-type',
  fields: {
    add: {
      title: {
        type: 'string',
        label: 'Title',
        required: true
      },
      content: {
        type: 'area',
        label: 'Content',
        options: {
          widgets: {
            '@apostrophecms/rich-text': {},
            '@apostrophecms/image': {}
          }
        }
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: ['title', 'content']
      }
    }
  }
};
```

**Note**: `group` is inside `fields` at the same level as `add`.

### Example with Relationship Field

```javascript
export default {
  extend: '@apostrophecms/widget-type',
  fields: {
    add: {
      heading: {
        type: 'string',
        label: 'Heading'
      },
      _products: {
        type: 'relationship',
        label: 'Products',
        withType: 'product',
        max: 5
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: ['heading', '_products']  // ← Keep underscore in group!
      }
    }
  }
};
```

**IMPORTANT**: Relationship field `_products` has underscore prefix in BOTH definition AND group array.

### Example: Bundle Widget (Widget in a Bundle with a Piece)

When a widget is part of a bundle, it MUST reference the piece from the bundle:

**Backend (index.js):**
```javascript
export default {
  extend: '@apostrophecms/widget-type',
  fields: {
    add: {
      heading: {
        type: 'string',
        label: 'Heading'
      },
      _pieces: {
        type: 'relationship',
        label: 'Items',
        withType: 'product',  // ← The piece from the bundle
        builders: {
          project: { aposDocId: 1, title: 1, _url: 1 }
        }
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: ['heading', '_pieces']  // ← Keep underscore!
      }
    }
  }
};
```

**Frontend (views/widget.html):**
```html
<div class="product-widget">
  <h2 class="product-widget__heading">{{ data.widget.heading }}</h2>
  <div class="product-widget__items">
    {% for piece in data.widget._pieces %}
      <a href="{{ piece._url }}" class="product-widget__item">
        <h3>{{ piece.title }}</h3>
      </a>
    {% endfor %}
  </div>
</div>
```

**CRITICAL**: Bundle widgets ALWAYS need `_pieces` relationship to connect with the bundle's piece type.

### Frontend (views/widget.html)

```html
<div class="{MODULE_NAME}">
  <div class="{MODULE_NAME}__container">
    <h3 class="{MODULE_NAME}__title">{{ data.widget.title }}</h3>
    <div class="{MODULE_NAME}__content">
      {% area data.widget, 'content' %}
    </div>
  </div>
</div>
```

## Frontend JavaScript (Optional - Only if User Explicitly Requests)

{FRONTEND_JS_GUIDANCE}

## Remember

- Generate ONLY what user specified
- **DO NOT add relationship fields unless explicitly mentioned** (EXCEPTION: bundle widgets MUST have `_pieces` relationship - see BUNDLE_RELATIONSHIP section)
- **ALL relationship fields MUST have underscore prefix** (`_fieldName`)
- **Bundle widgets MUST reference the bundle's piece** with `_pieces` relationship field
- NO extra helpful fields beyond bundle requirements
- HTML shows ONLY schema fields
- Use exact file paths provided
- Return pure JSON (no markdown code blocks)
