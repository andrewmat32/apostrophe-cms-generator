# Piece Module Generation Prompt

You are generating an Apostrophe CMS piece type module{BUNDLE_CONTEXT}.

**CRITICAL - READ THIS FIRST**:
- You are generating ONLY THE PIECE MODULE
- DO NOT generate page modules - they will be generated separately
- DO NOT generate widget modules - they will be generated separately
- ONLY return files for THIS piece module: {MODULE_NAME}
- Pieces have NO templates (no views/ folder, no HTML files)

## Module Requirements

- **Name**: {MODULE_NAME}
- **Label**: {MODULE_LABEL}
{USER_INSTRUCTIONS}

## Piece Schema (index.js)

### CRITICAL Structure Rules

- **Extend**: `@apostrophecms/piece-type` (REQUIRED)
- **CRITICAL**: Add `options` object with `label`, `pluralLabel`, `seoFields: false`, `openGraph: false`
- **Add the fields specified in USER INSTRUCTIONS** (title is built-in)
- Use appropriate field types based on what user requested
- **CRITICAL**: Structure is `export default { extend, options: {...}, fields: { add: {...}, group: {...} } }`
- **CRITICAL**: `group` is at the SAME LEVEL as `add`, INSIDE the `fields` object
- **CRITICAL**: ALL relationship fields MUST have underscore prefix (e.g., `_category`, `_author`, `_items`)
- **CRITICAL**: When referencing relationship fields in group arrays, KEEP the underscore (e.g., fields: ['title', '_category'])

**Correct Structure Example:**
```javascript
export default {
  extend: '@apostrophecms/piece-type',
  // CRITICAL: Add options with label, pluralLabel, seoFields, openGraph
  options: {
    label: '{MODULE_LABEL}',  // Use the provided label (e.g., 'Travel Designer')
    pluralLabel: '{MODULE_LABEL}s',  // Pluralize (e.g., 'Travel Designers')
    seoFields: false,
    openGraph: false
  },
  fields: {
    add: {
      // Regular fields
      description: { type: 'string', label: 'Description' },
      // Relationship fields with underscore
      _parentBreadcrumb: {
        type: 'relationship',
        label: 'Parent Breadcrumb',
        withType: 'breadcrumbs',
        max: 1,
        builders: {
          project: { title: 1, _url: 1 }
        }
      }
    },
    // group at SAME LEVEL as add, INSIDE fields
    group: {
      basics: {
        label: 'Basics',
        // Reference relationship WITH underscore
        fields: ['title', 'description', '_parentBreadcrumb']
      }
    }
  }
};
```

### Built-in Fields

Pieces automatically have:
- `title` - Main piece title (required)
- `slug` - URL-friendly identifier (auto-generated from title)
- `published` - Published status
- `archived` - Archived status

### ⚠️ CRITICAL: Reserved Field Names - DO NOT USE

**NEVER use these field names** - they are reserved by Apostrophe and will cause errors:

❌ **FORBIDDEN FIELD NAMES:**
- `type` - Used internally for module type (will throw error!)
- `_id` - MongoDB document ID
- `slug` - URL slug (built-in)
- `published` - Published status (built-in)
- `archived` - Archived status (built-in)
- `trash` - Trash status (built-in)
- `visibility` - Visibility settings (built-in)
- `createdAt` - Creation timestamp (built-in)
- `updatedAt` - Update timestamp (built-in)
- `metaType` - Internal metadata type
- `aposMode` - Apostrophe mode
- `aposLocale` - Locale identifier

**If user requests these concepts, use alternative names:**
- `type` → use `category`, `kind`, `itemType`, `contentType`
- `slug` → use `urlSlug`, `permalink` (or just use the built-in slug)
- `status` → use `currentStatus`, `statusLabel` (if not using published)

### Common Field Types for Pieces

- `string` - Short text (e.g., subtitle, author)
- `area` - Rich content (e.g., body content, description)
- `date` - Dates (e.g., published date, event date)
- `select` - Categories or status
- `boolean` - Flags (e.g., featured, highlighted)
- `relationship` - Connect to other pieces (e.g., author, category)
- `attachment` - File uploads (e.g., PDF, download)
- `array` - Repeating fields (e.g., FAQ items, features list)

## Example Piece Types

### Blog Post

```javascript
export default {
  extend: '@apostrophecms/piece-type',
  options: {
    label: 'Blog Post',
    pluralLabel: 'Blog Posts',
    seoFields: false,
    openGraph: false
  },
  fields: {
    add: {
      publishedDate: {
        type: 'date',
        label: 'Published Date'
      },
      author: {
        type: 'string',
        label: 'Author'
      },
      excerpt: {
        type: 'string',
        label: 'Excerpt',
        textarea: true,
        max: 200
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
      },
      featured: {
        type: 'boolean',
        label: 'Featured Post'
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: ['title', 'publishedDate', 'author', 'excerpt', 'content', 'featured']
      }
    }
  }
};
```

### Product (with Relationship Example)

```javascript
export default {
  extend: '@apostrophecms/piece-type',
  options: {
    label: 'Product',
    pluralLabel: 'Products',
    seoFields: false,
    openGraph: false
  },
  fields: {
    add: {
      price: {
        type: 'float',
        label: 'Price'
      },
      description: {
        type: 'area',
        label: 'Description'
      },
      images: {
        type: 'area',
        label: 'Images',
        options: {
          max: 5,
          widgets: {
            '@apostrophecms/image': {}
          }
        }
      },
      inStock: {
        type: 'boolean',
        label: 'In Stock',
        def: true
      },
      // CRITICAL: Relationship field with underscore prefix
      _category: {
        type: 'relationship',
        label: 'Category',
        withType: 'product-category',
        max: 1,
        builders: {
          project: {
            title: 1,
            _url: 1
          }
        }
      }
    },
    group: {
      basics: {
        label: 'Basics',
        // CRITICAL: Reference relationship WITH underscore in group
        fields: ['title', 'price', '_category', 'inStock']
      },
      content: {
        label: 'Content',
        fields: ['description', 'images']
      }
    }
  }
};
```

### Event (with Multiple Groups)

```javascript
export default {
  extend: '@apostrophecms/piece-type',
  options: {
    label: 'Event',
    pluralLabel: 'Events',
    seoFields: false,
    openGraph: false
  },
  fields: {
    add: {
      eventDate: {
        type: 'date',
        label: 'Event Date',
        required: true
      },
      location: {
        type: 'string',
        label: 'Location'
      },
      description: {
        type: 'area',
        label: 'Description'
      },
      maxAttendees: {
        type: 'integer',
        label: 'Max Attendees'
      },
      registrationOpen: {
        type: 'boolean',
        label: 'Registration Open',
        def: true
      }
    },
    // CRITICAL: group is at same level as add, inside fields
    group: {
      basics: {
        label: 'Basics',
        fields: ['title', 'eventDate', 'location', 'maxAttendees', 'registrationOpen']
      },
      content: {
        label: 'Content',
        fields: ['description']
      }
    }
  }
};
```

## File Paths

All files must use this exact path structure:

- **index.js**: `{CORRECT_PATH}/index.js`

**Note**: Pieces typically don't have frontend templates. They are displayed through:
- Piece-page-type modules (index + show views)
- Widgets that display pieces via relationships
- Custom routes with custom templates

## Remember

- Pieces are content types (like blog posts, products, events)
- `title` is built-in, don't add it again
- Focus on content fields, not display
- Use appropriate field types for the content
- **CRITICAL**: Return pure JSON with ONLY index.js (NO templates, NO show.html, NO views folder)
- **DO NOT** create any template files for pieces - they have no frontend display
- **DO NOT** create SCSS files for pieces - they are backend-only content types
