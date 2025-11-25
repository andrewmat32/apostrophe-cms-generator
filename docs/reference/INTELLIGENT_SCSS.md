# Intelligent SCSS Generation ✅

The code generator now generates SCSS **after** analyzing the actual HTML structure, creating perfectly matching styles instead of generic BEM templates!

## The Problem We Solved

### Before (Generic SCSS):
```
1. Predefined BEM classes sent to Claude
   → Claude forced to use specific class names
   → Generic SCSS generated with those exact classes
   → Mismatch if Claude deviated or added custom classes
```

**Issues**:
- ❌ Rigid class structure - Claude couldn't be creative
- ❌ Generic styles that didn't match actual content
- ❌ SCSS created before seeing HTML
- ❌ Potential class mismatches

### After (Intelligent SCSS):
```
1. BEM methodology guidance (not requirements)
   ↓
2. Claude generates semantic, appropriate HTML classes
   ↓
3. Parse HTML to extract all classes used
   ↓
4. Generate SCSS that matches **actual** HTML structure
   ↓
5. Add intelligent defaults based on class names
```

**Benefits**:
- ✅ Flexible - Claude chooses semantic class names
- ✅ Matching - SCSS always matches HTML
- ✅ Intelligent - Styles based on element semantics
- ✅ Relevant - No unused generic styles

## How It Works

### 1. Flexible Prompt Guidance

**Old Prompt** (Strict):
```javascript
CRITICAL BEM CLASS STRUCTURE (use these exact classes):
- .shopping-cart
- .shopping-cart__container
- .shopping-cart__title
// ... must use these exact classes
```

**New Prompt** (Flexible):
```javascript
BEM CLASS NAMING GUIDELINES:
- Use BEM methodology for class names
- Block: .shopping-cart (main container)
- Elements: .shopping-cart__element-name (child elements)
- Choose semantic, descriptive element names
- SCSS will be generated automatically based on your HTML classes
```

### 2. HTML Class Extraction

```javascript
function extractClassesFromHtml(html) {
  const classPattern = /class=["']([^"']+)["']/g;
  const allClasses = new Set();

  let match;
  while ((match = classPattern.exec(html)) !== null) {
    const classes = match[1].split(/\s+/);
    classes.forEach(c => {
      // Skip Nunjucks variables and empty strings
      if (!c.includes('{{') && !c.includes('{%') && c.trim()) {
        allClasses.add(c.trim());
      }
    });
  }

  return Array.from(allClasses).sort();
}
```

**Example**:
```html
<div class="shopping-cart shopping-cart--compact">
  <div class="shopping-cart__header">
    <h3 class="shopping-cart__title">Cart</h3>
  </div>
  <div class="shopping-cart__items">
    <div class="shopping-cart__item">Item 1</div>
  </div>
  <button class="shopping-cart__checkout-btn">Checkout</button>
</div>
```

**Extracted Classes**:
```javascript
[
  'shopping-cart',
  'shopping-cart--compact',
  'shopping-cart__header',
  'shopping-cart__title',
  'shopping-cart__items',
  'shopping-cart__item',
  'shopping-cart__checkout-btn'
]
```

### 3. Intelligent SCSS Generation

```javascript
function generateScssFromClasses(moduleName, moduleType, classes, htmlContent) {
  // Categorize by BEM pattern
  const blockClass = classes.find(c => c === moduleName);
  const elementClasses = classes.filter(c => c.startsWith(`${moduleName}__`));
  const modifierClasses = classes.filter(c => c.startsWith(`${moduleName}--`));

  // Build SCSS with intelligent defaults
  let scss = `.${blockClass} {\n`;

  elementClasses.forEach(elementClass => {
    const elementName = elementClass.replace(`${moduleName}__`, '');
    scss += `  &__${elementName} {\n`;

    // Add intelligent defaults based on element name
    if (elementName.includes('title')) {
      scss += `    font-size: 1.5rem;\n`;
      scss += `    font-weight: bold;\n`;
    } else if (elementName.includes('button') || elementName.includes('btn')) {
      scss += `    padding: 0.5rem 1rem;\n`;
      scss += `    border-radius: 0.25rem;\n`;
    } else if (elementName.includes('image')) {
      scss += `    width: 100%;\n`;
      scss += `    height: auto;\n`;
    }
    // ... more intelligent defaults
  });
}
```

**Generated SCSS** (for shopping cart example):
```scss
// Styles for shopping-cart
// Generated from actual HTML structure
//
// Classes found in HTML:
// - .shopping-cart
// - .shopping-cart--compact
// - .shopping-cart__header
// - .shopping-cart__title
// - .shopping-cart__items
// - .shopping-cart__item
// - .shopping-cart__checkout-btn

.shopping-cart {
  // Main widget container
  display: block;

  &__header {
    // Header element
    margin-bottom: 1rem;
  }

  &__title {
    // Title element
    font-size: 1.5rem;
    font-weight: bold;
  }

  &__items {
    // Items element
    // Add styles here
  }

  &__item {
    // Item element
    // Add styles here
  }

  &__checkout-btn {
    // Checkout btn element
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
  }

  // Modifiers
  &--compact {
    // Compact variant
    // Add variant styles here
  }
}
```

### 4. Intelligent Default Styles

The generator adds smart defaults based on element names:

| Element Name Contains | Styles Applied |
|----------------------|----------------|
| `container`, `wrapper` | `padding: 1rem;` |
| `title`, `heading` | `font-size: 1.5rem;`<br>`font-weight: bold;` |
| `content`, `body` | `line-height: 1.6;` |
| `image`, `img` | `width: 100%;`<br>`height: auto;` |
| `button`, `btn`, `cta` | `padding: 0.5rem 1rem;`<br>`border-radius: 0.25rem;` |
| `header` | `margin-bottom: 1rem;` |
| `footer` | `margin-top: 1rem;` |

## Updated Generation Flow

### New Timeline:
```
1. Init (0%)
   ↓
2. Validating (10%)
   ↓
3. Prompt Building (20%)
   → BEM guidelines (not requirements)
   ↓
4. Claude AI (30%)
   → Generates HTML with semantic BEM classes
   ↓
5. Parsing (70%)
   → Parse Claude's JSON response
   ↓
6. Analyzing HTML (80%) ⭐ NEW
   → Extract all classes from generated HTML
   ↓
7. Generating SCSS (90%) ⭐ UPDATED
   → Create SCSS matching actual HTML classes
   → Add intelligent defaults
   ↓
8. Complete (100%)
```

### Code Flow:

```javascript
// mcp-server/generator.js

export async function generateModule(options) {
  // 1. Build flexible BEM guidance
  const bemGuidance = buildBemGuidance(name, type);

  // 2. Generate with Claude
  const result = await callClaude(prompt);

  // 3. Parse response
  const parsedResult = JSON.parse(response);

  // 4. Find HTML template
  const templateFile = parsedResult.files.find(f =>
    f.path.includes('/views/widget.html') ||
    f.path.includes('/views/page.html')
  );

  // 5. Extract classes from HTML
  const classes = extractClassesFromHtml(templateFile.content);

  // 6. Generate matching SCSS
  const scssContent = generateScssFromClasses(
    name,
    type,
    classes,
    templateFile.content
  );

  // 7. Add SCSS file to results
  result.files.push({
    path: `modules/asset/ui/src/scss/components/_${name}.scss`,
    content: scssContent
  });

  return result;
}
```

## Example Comparison

### Shopping Cart Widget

**HTML Generated by Claude**:
```html
<div class="shopping-cart">
  <div class="shopping-cart__header">
    <h3 class="shopping-cart__title">{{ data.widget.title }}</h3>
    <span class="shopping-cart__item-count">{{ data.widget._items | length }}</span>
  </div>

  <div class="shopping-cart__items">
    {% for item in data.widget._items %}
      <div class="shopping-cart__item">
        <img class="shopping-cart__item-image" src="{{ item.image.url }}" />
        <span class="shopping-cart__item-name">{{ item.name }}</span>
        <span class="shopping-cart__item-price">${{ item.price }}</span>
      </div>
    {% endfor %}
  </div>

  <div class="shopping-cart__footer">
    <button class="shopping-cart__checkout-btn">Checkout</button>
  </div>
</div>
```

**Old Approach** (Generic SCSS):
```scss
// Would have predefined classes that might not match
.shopping-cart {
  &__container { } // Not used in HTML!
  &__content { }   // Not used in HTML!
  &__button { }    // HTML uses __checkout-btn instead!
}
```

**New Approach** (Intelligent SCSS):
```scss
// Perfectly matches HTML structure
.shopping-cart {
  display: block;

  &__header {
    margin-bottom: 1rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: bold;
  }

  &__item-count {
    // Add styles here
  }

  &__items {
    // Add styles here
  }

  &__item {
    // Add styles here
  }

  &__item-image {
    width: 100%;
    height: auto;
  }

  &__item-name {
    // Add styles here
  }

  &__item-price {
    // Add styles here
  }

  &__footer {
    margin-top: 1rem;
  }

  &__checkout-btn {
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
  }
}
```

## Benefits

### 1. Perfect Matching
Every class in HTML has a corresponding SCSS rule. No unused styles, no missing styles.

### 2. Semantic Freedom
Claude can choose class names that make sense:
- `.shopping-cart__item-count` instead of generic `.shopping-cart__counter`
- `.shopping-cart__checkout-btn` instead of generic `.shopping-cart__button`

### 3. Intelligent Defaults
Styles are added based on semantics:
- Titles get `font-size` and `font-weight`
- Buttons get `padding` and `border-radius`
- Images get `width` and `height`

### 4. Maintainability
Developer can see **exactly** which HTML elements each SCSS rule targets:
```scss
// Classes found in HTML:
// - .shopping-cart
// - .shopping-cart__header
// - .shopping-cart__title
// ...
```

## Updated Progress UI

The loading modal now shows the new flow:

```
Init → Prompt → Claude → Analyzing HTML → SCSS → Done
🚀     📝       🤖       🔍              🎨      ✨
```

**"Analyzing HTML" Stage (80%)**:
- Icon: 🔍 (magnifying glass)
- Message: "Analyzing HTML structure..."
- Action: Extracting classes from generated HTML

**"SCSS" Stage (90%)**:
- Icon: 🎨 (art palette)
- Message: "Generating SCSS to match HTML classes..."
- Action: Creating intelligent SCSS based on extracted classes

## Files Changed

```
mcp-server/generator.js
├── generateModule()           ← Added HTML analysis + SCSS generation
├── extractClassesFromHtml()  ← NEW: Extract classes from HTML
├── generateScssFromClasses()  ← NEW: Generate matching SCSS
├── buildBemGuidance()         ← UPDATED: Flexible guidance
└── buildPrompt()              ← UPDATED: Use bemGuidance

server/index.js
└── /generate/stream endpoint  ← Updated progress messages

public/index.html
└── Loading modal             ← Added "Analyzing" stage

public/js/code-generator.js
└── updateLoadingProgress()   ← Added analyzing stage + icon
```

## Summary

🎯 **The Big Idea**: Generate SCSS **after** seeing the HTML, not before!

✅ **Flexible prompts** - Claude chooses semantic class names
✅ **HTML analysis** - Extract all classes actually used
✅ **Intelligent SCSS** - Matching styles with smart defaults
✅ **Perfect sync** - HTML and SCSS always match
✅ **Better UX** - Progress shows HTML analysis step
✅ **Maintainable** - Clear mapping between HTML and SCSS

Instead of forcing Claude into a rigid BEM structure, we let it generate semantic HTML and then **intelligently adapt** the SCSS to match! 🚀
