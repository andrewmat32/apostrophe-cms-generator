# Apostrophe Relationship Pattern

## Overview

When displaying pieces in pages or widgets, **ALWAYS use relationship fields**, NOT areas or arrays. This is the standard Apostrophe pattern for connecting content.

## The Pattern

### 1. Show/Select Toggle

First, add a `show` field to let editors choose between "all" or "selected" pieces:

```javascript
show: {
  label: 'Show',
  type: 'select',
  def: 'all',
  choices: [
    { label: 'All', value: 'all' },
    { label: 'Selected', value: 'selected' }
  ]
}
```

### 2. Relationship Field

Then, add a `_pieces` relationship field (notice the underscore prefix):

```javascript
_pieces: {
  label: 'Items',              // Descriptive label
  type: 'relationship',         // CRITICAL: Use relationship type
  withType: 'piece-type-name',  // Name of the piece type to relate to
  max: 12,                      // Optional: limit number of selections
  builders: {
    project: {                  // Specify which fields to load (performance)
      _id: 1,
      aposDocId: 1,
      title: 1,
      images: 1,
      // Add other fields you need in the template
    }
  },
  if: {                         // Only show when "selected" is chosen
    show: 'selected'
  },
  requiredIf: {                 // Make required when "selected" is chosen
    show: 'selected'
  }
}
```

## Widget Example

```javascript
// modules/widgets/my-widget/index.js
export default {
  extend: '@apostrophecms/widget-type',
  options: {
    label: 'My Widget'
  },
  fields: {
    add: {
      show: {
        label: 'Show',
        type: 'select',
        def: 'all',
        choices: [
          { label: 'All', value: 'all' },
          { label: 'Selected', value: 'selected' }
        ]
      },
      _pieces: {
        label: 'Articles',
        type: 'relationship',
        withType: 'article',
        max: 6,
        builders: {
          project: {
            _id: 1,
            aposDocId: 1,
            title: 1,
            images: 1,
            shortText: 1
          }
        },
        if: {
          show: 'selected'
        },
        requiredIf: {
          show: 'selected'
        }
      }
    },
    group: {
      content: {
        label: 'Content',
        fields: ['show', '_pieces']
      }
    }
  },
  methods(self) {
    return {
      async load(req, widgets) {
        // Load pieces based on show selection
        for (const widget of widgets) {
          let query = {};

          if (widget.show === 'selected' && widget?.piecesIds?.length) {
            query = {
              aposDocId: {
                $in: widget.piecesIds
              }
            };
          }

          const pieces = await self.apos.modules['article']
            .find(req, query)
            .archived(false)
            .project({
              _id: 1,
              aposDocId: 1,
              title: 1,
              images: 1,
              shortText: 1
            })
            .toArray();

          widget._pieces = pieces;
        }
      }
    };
  }
};
```

### Template (views/widget.html)

```nunjucks
<div class="my-widget">
  <div class="my-widget__pieces">
    {% for piece in data.widget._pieces %}
      <article class="my-widget__piece">
        <h3 class="my-widget__title">{{ piece.title }}</h3>
        <p class="my-widget__text">{{ piece.shortText }}</p>
      </article>
    {% endfor %}
  </div>
</div>
```

## Page Example

```javascript
// modules/pages/article-page/index.js
export default {
  extend: '@apostrophecms/page-type',
  options: {
    label: 'Article Page'
  },
  fields: {
    add: {
      show: {
        label: 'Show',
        type: 'select',
        def: 'all',
        choices: [
          { label: 'All', value: 'all' },
          { label: 'Selected', value: 'selected' }
        ]
      },
      _pieces: {
        label: 'Articles',
        type: 'relationship',
        withType: 'article',
        builders: {
          project: {
            _id: 1,
            aposDocId: 1,
            title: 1,
            images: 1,
            content: 1
          }
        },
        if: {
          show: 'selected'
        },
        requiredIf: {
          show: 'selected'
        }
      },
      pageHeader: {
        type: 'area',
        max: 1,
        widgets: {
          'page-header': {}
        }
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: ['title', 'pageHeader']
      },
      content: {
        label: 'Content',
        fields: ['show', '_pieces']
      }
    }
  }
};
```

### Template (views/page.html)

```nunjucks
{% extends "layout.html" %}

{% block main %}
  {% area data.page, 'pageHeader' %}

  <div class="article-page">
    <div class="article-page__pieces">
      {% for piece in data.page._pieces %}
        <article class="article-page__piece">
          <h2 class="article-page__title">{{ piece.title }}</h2>
          {% area piece, 'content' %}
        </article>
      {% endfor %}
    </div>
  </div>
{% endblock %}
```

## Key Points

### ✅ DO:
- Use `type: 'relationship'` for connecting to pieces
- Use underscore prefix: `_pieces`, `_articles`, etc.
- Use `withType` to specify the piece type name
- Use `builders.project` to limit loaded fields (performance)
- Use `if` and `requiredIf` for conditional display
- Load pieces in the `load()` method using `widget.piecesIds`

### ❌ DON'T:
- ❌ Use areas to store pieces
- ❌ Use arrays to duplicate piece data
- ❌ Forget the underscore prefix on relationship field names
- ❌ Load all fields if you only need a few (use `builders.project`)

## Benefits

1. **Single Source of Truth**: Pieces are stored once, referenced everywhere
2. **Performance**: `builders.project` limits data loaded
3. **Maintainability**: Update piece once, changes reflect everywhere
4. **Flexibility**: Editors can choose "all" or "selected" pieces
5. **Standard Pattern**: Consistent across all Apostrophe projects

## Real-World Examples from wedive

See these modules for production examples:
- `modules/pieces/travel-designer-module/travel-designer-about-widget/`
- `modules/pieces/characteristic-module/characteristic-menu-widget/`
- `modules/widgets/menu-link-widget/`
