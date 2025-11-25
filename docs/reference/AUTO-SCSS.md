# Automatic SCSS File Generation

## Overview

The code generator now automatically creates SCSS files for any module that has HTML templates (views) and adds them to the centralized asset module. This follows the Apostrophe asset pipeline pattern.

## When It Happens

SCSS files are automatically created when:
- ✅ Generating a **widget** (always has views/widget.html)
- ✅ Generating a **page type** (always has views/page.html)
- ❌ Generating a **piece** (usually no views)

## File Location

All SCSS files are created in the **centralized asset module**:

```
modules/asset/ui/src/scss/{subdirectory}/_module-name.scss
```

### Directory Structure:

- **Widgets** → `modules/asset/ui/src/scss/components/_widget-name.scss`
- **Pages** → `modules/asset/ui/src/scss/pages/_page-name.scss`

### Examples:

**Widget:**
```
modules/asset/ui/src/
├── index.scss                           ← Main entry point
└── scss/
    └── components/
        └── _hero-banner-widget.scss     ← Automatically created!
```

**Page:**
```
modules/asset/ui/src/
├── index.scss                           ← Main entry point
└── scss/
    └── pages/
        └── _landing-page.scss           ← Automatically created!
```

## What Gets Created - Complete Tree View

### When Generating a Widget (e.g., "hero-banner-widget")

```
📦 Project Root
├── modules/
│   ├── widgets/
│   │   ├── modules.js                              ✏️ UPDATED - Registration added
│   │   │   export default {
│   │   │       'image-widget': {},
│   │   │       'hero-banner-widget': {}           ← Added automatically
│   │   │   };
│   │   │
│   │   └── hero-banner-widget/                     📁 NEW - Module directory
│   │       ├── index.js                            ✅ CREATED - Widget configuration
│   │       └── views/
│   │           └── widget.html                     ✅ CREATED - Nunjucks template
│   │
│   └── asset/
│       └── ui/
│           └── src/
│               ├── index.scss                      ✏️ UPDATED - Import added
│               │   //Components
│               │   @import "./scss/components/_hero-banner-widget";  ← Added
│               │
│               └── scss/
│                   └── components/
│                       └── _hero-banner-widget.scss  ✅ CREATED - Styles
```

### When Generating a Page (e.g., "landing-page")

```
📦 Project Root
├── modules/
│   ├── pages/
│   │   ├── modules.js                              ✏️ UPDATED - Registration added
│   │   │   export default {
│   │   │       'home-page': {},
│   │   │       'landing-page': {}                 ← Added automatically
│   │   │   };
│   │   │
│   │   └── landing-page/                           📁 NEW - Module directory
│   │       ├── index.js                            ✅ CREATED - Page configuration
│   │       └── views/
│   │           └── page.html                       ✅ CREATED - Nunjucks template
│   │
│   └── asset/
│       └── ui/
│           └── src/
│               ├── index.scss                      ✏️ UPDATED - Import added
│               │   //Pages
│               │   @import "./scss/pages/_landing-page";  ← Added
│               │
│               └── scss/
│                   └── pages/
│                       └── _landing-page.scss      ✅ CREATED - Styles
```

### When Generating a Piece (e.g., "product")

```
📦 Project Root
├── modules/
│   └── pieces/
│       ├── modules.js                              ✏️ UPDATED - Registration added
│       │   export default {
│       │       'blog': {},
│       │       'product': {}                       ← Added automatically
│       │   };
│       │
│       └── product/                                📁 NEW - Module directory
│           └── index.js                            ✅ CREATED - Piece configuration
│
│   (Note: Pieces usually don't have views, so no SCSS is created)
```

## Summary of Automatic Actions

| Action | Widget | Page | Piece |
|--------|--------|------|-------|
| Create module directory | ✅ | ✅ | ✅ |
| Create index.js | ✅ | ✅ | ✅ |
| Create views/template.html | ✅ | ✅ | ❌ |
| Update modules.js | ✅ | ✅ | ✅ |
| Create SCSS file | ✅ | ✅ | ❌ |
| Update index.scss | ✅ | ✅ | ❌ |

## Generated SCSS Content

The file is created with a helpful starter template:

```scss
// Styles for hero-banner-widget
// This file is automatically compiled by Apostrophe's asset pipeline

.hero-banner-widget {
  // Add your styles here
}
```

## How It Works

### 1. Detection
When saving files, the backend checks:
```javascript
const hasTemplate = files.some(f => f.path.includes('/views/'));
```

### 2. Path Determination
Based on module type:
```javascript
const scssSubdir = moduleType === 'page' ? 'pages' : 'components';
const scssFileName = `_${moduleName}.scss`;
const scssPath = join(project.path, 'modules', 'asset', 'ui', 'src', 'scss', scssSubdir, scssFileName);
```

### 3. File Creation
If SCSS file doesn't exist:
```javascript
writeFileSync(scssPath, scssContent, 'utf8');
```

### 4. Import Addition
Automatically adds import to main `index.scss`:
```scss
@import "./scss/components/hero-banner-widget";
```

### 5. Feedback
User sees: **"Saved X file(s), created SCSS file, and registered in modules.js"**

## Benefits

1. **Centralized Organization**: All SCSS in one location (modules/asset/ui/src/scss/)
2. **Automatic Import**: No manual @import needed in index.scss
3. **Proper Structure**: Follows production patterns (components/ and pages/)
4. **Ready for Styling**: SCSS file ready immediately with starter content
5. **Class Name Starter**: Includes main class selector
6. **No Manual Setup**: Directories and imports created automatically

## Apostrophe Asset Pipeline

SCSS files in `modules/asset/ui/src/scss/` are automatically:
- ✅ Imported into main index.scss
- ✅ Compiled to CSS by Apostrophe
- ✅ Bundled with other assets
- ✅ Minified in production
- ✅ Loaded on all pages

## Manual Override

If you don't want the SCSS file:
- Simply delete it after generation
- Or modify it to suit your needs
- The file won't be recreated if it already exists

## Advanced Usage

### Adding JavaScript

You can add client-side JavaScript in individual modules:

```
modules/widgets/hero-banner-widget/ui/src/
└── index.js    ← Client-side JavaScript (create manually)
```

### Importing Utilities

Use the centralized utilities in your SCSS:

```scss
// modules/asset/ui/src/scss/components/_hero-banner-widget.scss
.hero-banner-widget {
  // Variables and mixins from scss/utilities/ are available
  padding: $spacing-large;
  @include flex-center;
}
```

### Nested Selectors

Use BEM or nested selectors:

```scss
.hero-banner-widget {
  padding: 2rem;
  
  &__title {
    font-size: 2rem;
    font-weight: bold;
  }
  
  &__content {
    margin-top: 1rem;
  }
  
  &--large {
    padding: 4rem;
  }
}
```

## File Structure Comparison

### Before (Manual):
```
modules/asset/ui/src/scss/
├── components/
│   ├── _hero.scss
│   └── _buttons.scss
└── pages/
    └── _home.scss

❌ Need to manually create _hero-banner-widget.scss
❌ Need to manually add @import to index.scss
❌ Easy to forget or get path wrong
```

### After (Auto-Generated):
```
modules/asset/ui/src/
├── index.scss  ✅ Import added automatically!
└── scss/
    └── components/
        ├── _hero.scss
        ├── _buttons.scss
        └── _hero-banner-widget.scss  ✅ Created automatically!

✅ File created in correct location
✅ Import statement added to index.scss
✅ Starter content included
✅ Follows production patterns
```

## Implementation Details

### Backend Code (`server/index.js`, lines 4034-4090)

```javascript
// Auto-create SCSS file for modules with templates
const hasTemplate = files.some(f => f.path.includes('/views/'));
if (hasTemplate && moduleName && moduleType) {
    // Determine SCSS subdirectory based on module type
    const scssSubdir = moduleType === 'page' ? 'pages' : 'components';
    const scssFileName = `_${moduleName}.scss`;
    const scssPath = join(project.path, 'modules', 'asset', 'ui', 'src', 'scss', scssSubdir, scssFileName);
    const mainScssPath = join(project.path, 'modules', 'asset', 'ui', 'src', 'index.scss');

    // Only create if it doesn't exist
    if (!existsSync(scssPath)) {
        mkdirSync(dirname(scssPath), { recursive: true });

        const scssContent = `// Styles for ${moduleName}
// This file is automatically compiled by Apostrophe's asset pipeline

.${moduleName} {
  // Add your styles here
}
`;
        writeFileSync(scssPath, scssContent, 'utf8');
        console.log(`   ✅ Created scss/${scssSubdir}/${scssFileName}`);

        // Add import to main index.scss
        if (existsSync(mainScssPath)) {
            let mainScssContent = readFileSync(mainScssPath, 'utf8');
            const importStatement = `@import "./scss/${scssSubdir}/${moduleName}";`;

            if (!mainScssContent.includes(importStatement)) {
                // Find section comment and add import
                const sectionComment = scssSubdir === 'components' ? '//Components' : '//Pages';
                mainScssContent = mainScssContent.replace(
                    new RegExp(`(${sectionComment}[^]*?)((?://[A-Z]|$))`, 's'),
                    `$1${importStatement}\n$2`
                );
                writeFileSync(mainScssPath, mainScssContent, 'utf8');
                console.log(`   ✅ Added import to index.scss`);
            }
        }
    }
}
```

### Success Message (lines 4111-4120)

```javascript
let message = `Saved ${savedCount} file(s)`;
const extras = [];

if (createdScss) extras.push('created SCSS file');
if (updatedModulesJs) extras.push('registered in modules.js');

if (extras.length > 0) {
    message += ` and ${extras.join(' and ')}`;
}
```

## Testing

1. Generate a widget or page type
2. Click "Save to Project"
3. Check success message - should mention "created SCSS file"
4. Verify file exists:
   - Widget: `modules/asset/ui/src/scss/components/_widget-name.scss`
   - Page: `modules/asset/ui/src/scss/pages/_page-name.scss`
5. Verify import added to: `modules/asset/ui/src/index.scss`
6. Edit SCSS file and add your styles
7. Restart Apostrophe to compile assets

## Common Patterns

### Widget with Image

```scss
.hero-banner-widget {
  position: relative;
  
  .hero-banner-widget__image {
    width: 100%;
    height: 400px;
    object-fit: cover;
  }
  
  .hero-banner-widget__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
  }
}
```

### Responsive Widget

```scss
.hero-banner-widget {
  padding: 1rem;
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
  
  @media (min-width: 1024px) {
    padding: 4rem;
  }
}
```

### Widget with Variants

```scss
.hero-banner-widget {
  &--dark {
    background: #333;
    color: white;
  }
  
  &--light {
    background: #fff;
    color: #333;
  }
}
```
