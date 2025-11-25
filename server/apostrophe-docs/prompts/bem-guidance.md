# BEM Class Naming Guidelines

> **Note**: SCSS/CSS generation is experimental. Results may vary depending on project complexity and design token availability. Always review generated styles before use in production.

## Overview

Use BEM (Block Element Modifier) methodology for CSS class names.

## Pattern

- **Block**: `.{MODULE_NAME}` (main container)
- **Elements**: `.{MODULE_NAME}__element-name` (child elements)
- **Modifiers**: `.{MODULE_NAME}--variant-name` (variations)

## Guidelines

- Choose semantic, descriptive element names based on the module's purpose
- SCSS will be generated automatically based on your HTML classes
- Use lowercase with hyphens (kebab-case)

## Example for Widget

```html
<div class="{MODULE_NAME}">
  <div class="{MODULE_NAME}__container">
    <h3 class="{MODULE_NAME}__title">{{ data.widget.title }}</h3>
    <div class="{MODULE_NAME}__content">
      <!-- Your widget content -->
    </div>
  </div>
</div>
```

## Example for Page

```html
<div class="{MODULE_NAME}">
  <div class="{MODULE_NAME}__header">
    <h1 class="{MODULE_NAME}__title">{{ data.page.title }}</h1>
  </div>
  <div class="{MODULE_NAME}__content">
    <!-- Your page content -->
  </div>
</div>
```

## Common Element Names

### Structure
- `__container` - Main content wrapper
- `__header` - Top section
- `__footer` - Bottom section
- `__content` - Main content area
- `__body` - Alternative to content
- `__section` - Content sections

### Typography
- `__title` - Main heading
- `__heading` - Secondary heading
- `__subtitle` - Subheading
- `__text` - Body text
- `__label` - Labels

### Media
- `__image` - Images
- `__figure` - Image with caption
- `__video` - Video elements
- `__icon` - Icons

### Interactive
- `__button` - Buttons
- `__link` - Links
- `__cta` - Call-to-action elements
- `__form` - Forms
- `__input` - Input fields

### Layout
- `__grid` - Grid containers
- `__row` - Rows
- `__col` - Columns
- `__aside` - Sidebar content
- `__list` - Lists
- `__item` - List items

## Modifiers

Use modifiers for variations:

- `--large` - Larger variant
- `--small` - Smaller variant
- `--dark` - Dark theme
- `--light` - Light theme
- `--primary` - Primary style
- `--secondary` - Secondary style
- `--active` - Active state
- `--disabled` - Disabled state

## Important Notes

**NOTE**: SCSS will be automatically generated to match whatever classes you use in your HTML.
Choose class names that make sense for this specific {MODULE_TYPE}.

The generated SCSS will include:
- Block class with nested elements
- Element classes with semantic naming
- Modifier classes for variations
- Intelligent default styles based on element names
