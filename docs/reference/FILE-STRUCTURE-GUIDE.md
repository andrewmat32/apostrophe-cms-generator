# File Structure Guide

## ⚠️ CRITICAL RULE

**NEVER put `<script>` or `<style>` tags in template files!**

Templates (.html files) should ONLY contain:
- HTML markup
- Nunjucks template syntax (`{% %}`, `{{ }}`)
- Data attributes for frontend JS (`data-*`)
- BEM CSS classes

## File Structure by Module Type

### 1. Simple Widget (NO frontend JS)

**When to use**: Display-only widgets (testimonials, cards, hero banners)

```
modules/widgets/hero-banner/
├── index.js                    # Schema: fields, groups
└── views/
    └── widget.html            # HTML + Nunjucks (NO <script>!)
```

**Generated Files**: 2
- `index.js` - Backend schema
- `views/widget.html` - Template

### 2. Interactive Widget (WITH frontend JS)

**When to use**: User requests "with JavaScript", "interactive", "filter", "search", "accordion", etc.

```
modules/widgets/product-filter-widget/
├── index.js                    # Schema: fields, groups
├── views/
│   └── widget.html            # HTML + data attributes (NO <script>!)
└── ui/
    └── src/
        └── index.js           # Frontend JS using widget player pattern
```

**Generated Files**: 3
- `index.js` - Backend schema
- `views/widget.html` - Template with `data-{widget-name}-widget` attribute
- `ui/src/index.js` - Frontend JavaScript

**Template Example**:
```html
<!-- views/widget.html -->
<div class="product-filter-widget" data-product-filter-widget>
  <input type="text" data-search-input>
  <div data-products-container>
    {% for item in data.widget._pieces %}
      <div data-product-item data-title="{{ item.title }}">
        {{ item.title }}
      </div>
    {% endfor %}
  </div>
</div>
<!-- NO <script> tags here! -->
```

**Frontend JS Example**:
```javascript
// ui/src/index.js
export default () => {
  apos.util.widgetPlayers.productFilterWidget = {
    selector: '[data-product-filter-widget]',
    player: function(el) {
      const searchInput = el.querySelector('[data-search-input]');
      const items = el.querySelectorAll('[data-product-item]');

      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        items.forEach(item => {
          const title = item.dataset.title.toLowerCase();
          item.style.display = title.includes(term) ? '' : 'none';
        });
      });
    }
  };
};
```

### 3. Piece (Backend Only)

**When to use**: Content types (blog posts, products, events)

```
modules/pieces/product/
└── index.js                    # Schema ONLY
```

**Generated Files**: 1
- `index.js` - Backend schema

**NO templates, NO views folder, NO SCSS**

### 4. Page Type

**When to use**: Custom page types (landing page, home page, etc.)

```
modules/pages/landing-page/
├── index.js                    # Schema: areas, fields
└── views/
    └── page.html              # {% extends 'layout.html' %} (NO <script>!)
```

**Generated Files**: 2
- `index.js` - Backend schema
- `views/page.html` - Template

### 5. Piece-Page Type (Bundle)

**When to use**: Displaying pieces on pages (blog page showing blog posts)

```
modules/pieces/blog-module/
├── index.js                    # Parent module (container)
├── modules.js                  # Registers internal modules
├── blog/                       # Piece
│   └── index.js
└── blog-page/                  # Piece-page-type
    ├── index.js
    ├── views/
    │   ├── index.html         # Listing page (NO <script>!)
    │   └── show.html          # Detail page (NO <script>!)
```

**Generated Files**: 5
- Parent `index.js`
- Parent `modules.js`
- `blog/index.js` - Piece schema
- `blog-page/index.js` - Page schema
- `blog-page/views/index.html` - Listing template
- `blog-page/views/show.html` - Detail template

## SCSS Files

SCSS files are generated separately and live in `modules/asset/`:

```
modules/asset/ui/src/
├── index.scss                  # Main file (auto-import added)
└── scss/
    ├── components/
    │   ├── _hero-banner.scss
    │   └── _product-filter-widget.scss
    └── pages/
        └── _landing-page.scss
```

**Rules**:
- Widgets → `scss/components/_name.scss`
- Pages → `scss/pages/_name.scss`
- Pieces → NO SCSS (backend only)

## Frontend JS Integration

### Data Attributes Pattern

**Template sets data, JS reads data:**

```html
<!-- Template -->
<div data-my-widget data-max-items="5" data-auto-play="true">
  ...
</div>
```

```javascript
// ui/src/index.js
const maxItems = parseInt(el.dataset.maxItems); // 5
const autoPlay = el.dataset.autoPlay === 'true'; // true
```

### Widget Player Pattern

**Required structure:**

```javascript
export default () => {
  apos.util.widgetPlayers.{widgetName}Widget = {
    selector: '[data-{widget-name}-widget]',
    player: function(el) {
      // Initialize this widget instance
      // 'el' is the widget container element
    }
  };
};
```

**Key points:**
- Exported function wraps everything
- Widget player registered on `apos.util.widgetPlayers`
- Selector matches data attribute on template root
- Player function receives widget element
- Scope all queries to `el` (widget instance)

## Complete File Output Examples

### Simple Widget (Testimonial)

**Request**: "Create a testimonial widget with author, quote, and rating"

**Files Generated**: 2
1. `modules/widgets/testimonial/index.js`
2. `modules/widgets/testimonial/views/widget.html`

### Interactive Widget (Product Filter)

**Request**: "Create a product widget with frontend filtering by price and search"

**Files Generated**: 3
1. `modules/widgets/product-widget/index.js`
2. `modules/widgets/product-widget/views/widget.html` (with data attributes, NO `<script>`)
3. `modules/widgets/product-widget/ui/src/index.js` (widget player pattern)

**Plus SCSS**: `modules/asset/ui/src/scss/components/_product-widget.scss`

### Bundle (Product System)

**Request**: "Create product piece with title, price, description and a product widget to display them"

**Files Generated**: 7
1. `modules/pieces/product-module/index.js` (parent)
2. `modules/pieces/product-module/modules.js` (registration)
3. `modules/pieces/product-module/product/index.js` (piece schema)
4. `modules/pieces/product-module/product-widget/index.js` (widget schema)
5. `modules/pieces/product-module/product-widget/views/widget.html` (template)
6. `modules/pieces/product-module/product-widget/ui/src/index.js` (frontend JS)
7. `modules/asset/ui/src/scss/components/_product-widget.scss` (SCSS)

## Common Mistakes to Avoid

### ❌ WRONG: Inline Script in Template

```html
<div class="my-widget">
  <button id="btn">Click</button>
</div>
<script>
  document.getElementById('btn').click();
</script>
```

**Problems**:
- Breaks with multiple widget instances
- Doesn't work in admin editor
- Violates Apostrophe architecture

### ✅ CORRECT: Widget Player Pattern

**Template**:
```html
<div class="my-widget" data-my-widget>
  <button data-button>Click</button>
</div>
```

**Frontend JS**:
```javascript
export default () => {
  apos.util.widgetPlayers.myWidget = {
    selector: '[data-my-widget]',
    player: function(el) {
      const btn = el.querySelector('[data-button]');
      btn.addEventListener('click', () => {
        // Handle click
      });
    }
  };
};
```

## Checklist

Before generating code, verify:

- [ ] Templates have NO `<script>` tags
- [ ] Templates have NO `<style>` tags
- [ ] Templates have NO inline event handlers (onclick, etc.)
- [ ] Frontend JS uses widget player pattern in ui/src/index.js
- [ ] Pieces have NO templates (only index.js)
- [ ] Widget player selector matches data attribute on template
- [ ] All queries in JS are scoped to widget instance (el.querySelector)
- [ ] SCSS files are in modules/asset/ui/src/scss/
- [ ] Each file has correct path structure
