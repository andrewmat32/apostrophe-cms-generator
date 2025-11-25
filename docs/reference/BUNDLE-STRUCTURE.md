# Bundle Structure Documentation

## What is a Bundle?

A **bundle** is a collection of related Apostrophe modules that work together:
- **Real Bundle**: Piece + (Widget and/or Page) - nested in `modules/pieces/{name}-module/`
- **Separate Modules**: Widget and/or Page only (no piece) - each in their own directory

## Real Bundle Structure (Piece + Widget/Page)

### Example: Product Bundle (piece + widget)

```
modules/
├── pieces/
│   ├── modules.js                          ← Registration: 'product-module': {}
│   └── product-module/                     ← Bundle container
│       ├── index.js                        ← Parent module (just a container)
│       ├── modules.js                      ← Registers: product, product-widget
│       ├── product/                        ← Piece (sibling to widget)
│       │   └── index.js
│       └── product-widget/                 ← Widget (sibling to piece)
│           ├── index.js
│           ├── views/widget.html
│           └── ui/src/index.js             ← Optional: frontend JS
└── asset/
    └── ui/src/
        ├── index.scss                      ← Import added
        └── scss/components/
            └── _product-widget.scss        ← SCSS stays here (NOT in bundle)
```

**Key Points**:
1. **Bundle container**: `modules/pieces/{name}-module/`
2. **Internal modules are SIBLINGS**: piece and widget are at the same level
3. **SCSS files stay in `modules/asset/`**: They are NOT moved into the bundle
4. **Parent index.js**: Just a container with `ignoreNoCodeWarning: true`
5. **Internal modules.js**: Registers all internal modules

### Example: Blog Bundle (piece + widget + page)

```
modules/
└── pieces/
    └── blog-module/
        ├── index.js                        ← Parent
        ├── modules.js                      ← Registers: blog, blog-widget, blog-page
        ├── blog/                           ← Piece
        │   └── index.js
        ├── blog-widget/                    ← Widget
        │   ├── index.js
        │   └── views/widget.html
        └── blog-page/                      ← Page (piece-page-type)
            ├── index.js
            ├── views/index.html
            └── views/show.html
```

## Separate Modules (No Bundle)

### Example: Widget + Page (no piece)

```
modules/
├── widgets/
│   ├── modules.js                          ← Registration: 'testimonial-widget': {}
│   └── testimonial-widget/
│       ├── index.js
│       └── views/widget.html
└── pages/
    ├── modules.js                          ← Registration: 'testimonial-page': {}
    └── testimonial-page/
        ├── index.js
        └── views/page.html
```

**Not a bundle** because there's no piece. Each module is registered independently.

## File Path Adjustments (Real Bundles Only)

When generating a real bundle, file paths are adjusted:

### Before Adjustment (individual modules)
```
modules/pieces/product/index.js
modules/widgets/product-widget/index.js
modules/widgets/product-widget/views/widget.html
modules/asset/ui/src/scss/components/_product-widget.scss
```

### After Adjustment (nested in bundle)
```
modules/pieces/product-module/product/index.js                    ← Moved
modules/pieces/product-module/product-widget/index.js             ← Moved
modules/pieces/product-module/product-widget/views/widget.html    ← Moved
modules/asset/ui/src/scss/components/_product-widget.scss         ← STAYS HERE
```

## Chat Mode Bundle Detection

The `parse-request.md` template detects bundles:

**Bundle**: Request mentions BOTH piece/content AND widget/page
- "product piece with widget" → BUNDLE
- "blog piece and blog page" → BUNDLE
- "FAQ content with FAQ widget" → BUNDLE

**Not Bundle**: Request mentions only one type
- "product piece" → PIECE only
- "testimonial widget" → WIDGET only
- "blog page" → PAGE only

## Generated Files

### Piece (backend only)
- `index.js` - Schema only
- **NO** templates
- **NO** SCSS

### Widget (frontend display)
- `index.js` - Schema
- `views/widget.html` - Template
- `ui/src/index.js` - Optional frontend JS
- `modules/asset/ui/src/scss/components/_name.scss` - SCSS

### Page (full page type)
- `index.js` - Schema
- `views/page.html` - Template (or index.html + show.html for piece-page-type)
- `modules/asset/ui/src/scss/pages/_name.scss` - SCSS

## Tree View Structure

The tree view should render bundles like this:

```
📦 Project Root
├── modules/
│   ├── pieces/
│   │   ├── modules.js ✏️ UPDATED
│   │   └── product-module/ 📁 NEW BUNDLE
│   │       ├── index.js ✅ (parent module)
│   │       ├── modules.js ✅ (registers internal modules)
│   │       ├── product/ (piece)
│   │       │   └── index.js ✅
│   │       └── product-widget/ (widget)
│   │           ├── index.js ✅
│   │           └── views/widget.html ✅
│   │
│   └── asset/ui/src/
│       ├── index.scss ✏️ UPDATED
│       └── scss/components/
│           └── _product-widget.scss 🎨
```

**Notice**:
- Piece and widget are at the same indentation level (siblings)
- SCSS is shown separately under `modules/asset/`
- Widget files are indented under `product-widget/`, not under `product/`
