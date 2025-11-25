# Frontend JavaScript Pattern for Apostrophe Widgets

## Overview

This document describes how to add frontend JavaScript logic to Apostrophe widgets when needed. **Do NOT add frontend JS automatically** - only when explicitly requested by the user or when the widget functionality requires it (e.g., interactive components like accordions, sliders, tabs, modals).

## ⚠️ CRITICAL RULES

**NEVER use inline `<script>` tags in templates!**

- ❌ **WRONG**: `<script>` tags in widget.html
- ❌ **WRONG**: Inline JavaScript in template files
- ❌ **WRONG**: Event handlers in HTML attributes (`onclick`, `onchange`, etc.)
- ✅ **CORRECT**: Separate `ui/src/index.js` file using widget player pattern
- ✅ **CORRECT**: Data attributes for configuration
- ✅ **CORRECT**: Event listeners in JavaScript file

**Why?** Apostrophe widgets can appear multiple times on a page. Inline scripts run multiple times causing conflicts. The widget player pattern ensures proper initialization for each instance.

### ❌ WRONG Example (DO NOT DO THIS)

```html
<!-- widget.html - WRONG! -->
<div class="my-widget">
  <button id="myButton">Click me</button>
</div>

<script>
  // ❌ NEVER PUT SCRIPTS IN TEMPLATES!
  document.getElementById('myButton').addEventListener('click', () => {
    alert('clicked');
  });
</script>
```

**Problems**:
- Runs every time widget appears (broken with multiple instances)
- Doesn't work in admin editor
- Hard to debug and maintain
- Violates Apostrophe architecture

### ✅ CORRECT Example (USE THIS)

**Template (widget.html)**:
```html
<div class="my-widget" data-my-widget>
  <button class="my-widget__button" data-button>Click me</button>
</div>
```

**JavaScript (ui/src/index.js)**:
```javascript
export default () => {
  apos.util.widgetPlayers.myWidget = {
    selector: '[data-my-widget]',
    player: function(el) {
      const button = el.querySelector('[data-button]');
      button.addEventListener('click', () => {
        alert('clicked');
      });
    }
  };
};
```

**Benefits**:
- ✅ Works with multiple instances
- ✅ Works in admin editor
- ✅ Properly scoped to widget instance
- ✅ Follows Apostrophe conventions

---

## When to Include Frontend JS

**Include frontend JS when:**
- User explicitly requests "with JavaScript logic" or "interactive"
- Widget is inherently interactive (accordion, tabs, slider, modal, dropdown)
- Widget requires client-side behavior (show/hide, toggle, animation)
- Widget needs event handlers (click, scroll, resize)
- Widget uses third-party libraries (Splide, Alpine.js, etc.)

**Do NOT include frontend JS for:**
- Simple display widgets (testimonials, cards, banners)
- Widgets that only render content
- Static layouts without interaction

---

## File Structure

### Required Files for Widget with Frontend JS

```
modules/widgets/{widget-name}/
├── index.js                    # Backend schema
├── views/
│   └── widget.html            # Frontend template
└── ui/
    └── src/
        └── index.js           # Frontend JavaScript logic ← NEW!
```

---

## Pattern: Widget Player System

Apostrophe uses the **Widget Player** pattern for initialization. This ensures your JS runs when widgets are loaded, including in the admin editor.

### ui/src/index.js Structure

```javascript
export default () =>
{
    // Register widget player
    // IMPORTANT: Selector MUST match full widget name including -widget suffix
    apos.util.widgetPlayers.{widgetName}Widget = {
        selector: '[data-{widget-name}-widget]',  // ← Must use full name with -widget
        player: function( el )
        {
            init{WidgetName}Widget( el );
        }
    };
};

function init{WidgetName}Widget( widgetElement )
{
    // Your initialization logic here
    // widgetElement is the DOM element with data-{widget-name}-widget attribute
}
```

### Example: Accordion Widget

```javascript
export default () =>
{
    // Use ApostropheCMS widget player pattern for initialization
    apos.util.widgetPlayers.accordionWidget = {
        selector: '[data-accordion-widget]',
        player: function( el )
        {
            initAccordionWidget( el );
        }
    };
};

function initAccordionWidget( widgetElement )
{
    // Find elements within THIS widget instance
    const accordionBox = widgetElement.querySelector( '.accordion-box' );

    if( !accordionBox )
    {
        return;
    }

    // Get configuration from data attributes
    const allowMultiple = accordionBox.dataset.allowMultiple === 'true';

    // Setup event handlers, etc.
    // ...
}
```

**Key Points**:
- Export default function
- Register using `apos.util.widgetPlayers.{camelCaseName}Widget`
- Selector matches data attribute on root element
- Player function receives the widget DOM element
- All logic scoped to that widget instance

---

## Passing Data from Backend to Frontend

### Method 1: Data Attributes (Recommended)

**Backend** (index.js):
```javascript
fields: {
    add: {
        allowMultiple: {
            type: 'boolean',
            def: true
        },
        autoplay: {
            type: 'boolean',
            def: false
        },
        speed: {
            type: 'integer',
            def: 1000
        }
    }
}
```

**Frontend Template** (views/widget.html):
```html
<div class="my-widget"
     data-my-widget
     data-allow-multiple="{{ data.widget.allowMultiple }}"
     data-autoplay="{{ data.widget.autoplay }}"
     data-speed="{{ data.widget.speed }}">
    <!-- Widget content -->
</div>
```

**Frontend JS** (ui/src/index.js):
```javascript
function initMyWidget( widgetElement )
{
    // Read configuration from data attributes
    const allowMultiple = widgetElement.dataset.allowMultiple === 'true';
    const autoplay = widgetElement.dataset.autoplay === 'true';
    const speed = parseInt( widgetElement.dataset.speed, 10 );

    console.log( `Config: allowMultiple=${allowMultiple}, speed=${speed}` );
}
```

**Data Attribute Naming**:
- `data-allow-multiple` in HTML → `dataset.allowMultiple` in JS (camelCase conversion)
- Booleans: Compare with `=== 'true'` (all data attributes are strings)
- Numbers: Use `parseInt()` or `parseFloat()`

### Method 2: JSON in Data Attribute (Complex Data)

For complex objects or arrays:

**Frontend Template**:
```html
<div class="slider-widget"
     data-slider-widget
     data-config="{{ data.widget | dump | escape }}">
    <!-- Widget content -->
</div>
```

**Frontend JS**:
```javascript
function initSliderWidget( widgetElement )
{
    // Parse entire widget data as JSON
    try
    {
        const config = JSON.parse( widgetElement.dataset.config );
        console.log( 'Items:', config.items );
        console.log( 'Settings:', config.settings );
    }
    catch( error )
    {
        console.error( 'Failed to parse widget config:', error );
    }
}
```

**Warning**: This passes ALL widget data to frontend. Only use if needed.

---

## Importing Shared Functions

### From Global Asset Module

**IMPORTANT**: Before importing functions, **check what's available in the selected project** using the MCP tool `list_available_asset_functions`. Each project has different utility functions available.

**Pattern**: Import functions from `modules/asset/ui/src/index.js`

⚠️ **ADDING NEW COMMON FUNCTIONS TO GLOBAL ASSET MODULE** ⚠️

When you need to add NEW shared/common functions that will be reused across multiple widgets:

- ✅ **CAN** include `modules/asset/ui/src/index.js` in your files array to ADD new functions
- ✅ The file will be **appended to**, not overwritten (existing functions preserved)
- ✅ Only include the NEW function(s) you're adding, not the entire file
- ✅ Generate widget-specific `ui/src/index.js` files in widget directories
- ✅ Import existing functions using `list_available_asset_functions` to check what exists

**🚨 CRITICAL EXPORT PATTERN DIFFERENCE:**

**Global Asset Module** (`modules/asset/ui/src/index.js`):
- ✅ **MUST use NAMED EXPORTS**: `export function functionName() { ... }`
- ❌ **NEVER use default export**: `export default () => { ... }`
- ❌ **NEVER use default export with function**: `export default function() { ... }`
- ❌ **NEVER wrap in default export**: `export default () => { function x() {} }`

**Widget-Specific Files** (`modules/widgets/[name]/ui/src/index.js`):
- ✅ **MUST use DEFAULT EXPORT**: `export default () => { ... }`
- This registers the widget player with Apostrophe

**Why the difference?**
- Global asset module exports reusable functions that other modules import
- Widget-specific files export initialization code that Apostrophe runs automatically

**When to add to global asset module:**
- Function will be reused by multiple widgets/pages
- Utility function (toggleClass, getCookie, etc.)
- Complex initialization (slider setup, form handling)

**When NOT to add (keep in widget):**
- Widget-specific logic that won't be reused
- Simple one-off interactions

The system automatically appends new functions to preserve existing ones!

**Example: Existing functions in Global Asset Module** (`modules/asset/ui/src/index.js`):
```javascript
// Example functions that might already exist in the project
export function fixSplideTrackAccessibility( splide )
{
    const track = splide.root.querySelector( '.splide__track' );
    if( track )
    {
        track.removeAttribute( 'tabindex' );
        track.setAttribute( 'role', 'presentation' );
    }
}

export function toggleClass( element, className, toggleAllOccurrences )
{
    if( toggleAllOccurrences )
    {
        document.querySelectorAll( `.${ className }` ).forEach( el =>
        {
            el.classList.toggle( className );
        } );
    }
    else
    {
        element.classList.toggle( className );
    }
}

export function initializeSplideSlider( config )
{
    // Initialize Splide with config
    // ...
}
```

**Example: Adding a NEW common function:**

❌ **WRONG - DO NOT DO THIS:**
```javascript
// WRONG: Using default export in global asset module
export default () => {
  const initShoppingListFilter = () => {
    // ... implementation
  };
};

// WRONG: Not exporting at all
function initShoppingListFilter() {
  // ... implementation
}

// WRONG: Using default export with function
export default function initShoppingListFilter() {
  // ... implementation
}
```

✅ **CORRECT - DO THIS:**
```javascript
// File to include in your files array:
// { "path": "modules/asset/ui/src/index.js", "content": "..." }

// CORRECT: Named export - can be imported by other modules
export function initShoppingListFilter(filterContainer) {
  const select = filterContainer.querySelector('[data-filter-select]');
  const piecesContainer = document.querySelector('[data-pieces-container]');

  if (!select || !piecesContainer) return;

  // Collect all unique types from pieces
  const pieces = piecesContainer.querySelectorAll('[data-piece-type]');
  const types = new Set();

  pieces.forEach(piece => {
    const type = piece.getAttribute('data-piece-type');
    if (type) types.add(type);
  });

  // Populate select with unique types
  types.forEach(type => {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });

  // Filter pieces when select changes
  select.addEventListener('change', (e) => {
    const selectedType = e.target.value;
    pieces.forEach(piece => {
      const pieceType = piece.getAttribute('data-piece-type');
      if (selectedType === '' || pieceType === selectedType) {
        piece.classList.remove('hidden');
      } else {
        piece.classList.add('hidden');
      }
    });
  });
}

// Another example of a utility function
export function initializeAccordion(element, options) {
  const items = element.querySelectorAll('.accordion-item');
  // ... implementation
}
```

**Widget JS** (`modules/widgets/my-widget/ui/src/index.js`):
```javascript
// Import functions from global asset module
import { fixSplideTrackAccessibility, initializeSplideSlider } from 'Modules/asset/index.js';

export default () =>
{
    apos.util.widgetPlayers.myWidget = {
        selector: '[data-my-widget]',
        player: function( el )
        {
            initMyWidget( el );
        }
    };
};

function initMyWidget( widgetElement )
{
    const slider = initializeSplideSlider( {
        type: 'loop',
        perPage: 3
    } );

    // Use imported function
    fixSplideTrackAccessibility( slider );
}
```

**Key Points**:
- Import path: `'Modules/asset/index.js'` (capital M)
- Use named imports: `{ functionName }`
- Functions must be exported from asset/ui/src/index.js
- Allows code reuse across widgets

### Checking Available Functions (MCP Tool)

**Before generating imports**, use the MCP tool to check what's available:

**Tool**: `list_available_asset_functions`

**Example Response**:
```json
{
  "success": true,
  "available": true,
  "projectId": "abendsonneafrika",
  "projectName": "Abendsonneafrika",
  "assetPath": "modules/asset/ui/src/index.js",
  "functions": [
    "fixSplideTrackAccessibility",
    "getCookie",
    "getCookieHighestLevel",
    "getOrSetCookie",
    "handlePaginationClasses",
    "handleSortingLabel",
    "initializeCardSlider",
    "initializeGallerySlider",
    "initializePortraitSlider",
    "initializeProductImageSlider",
    "initializeProductSlider",
    "isSafari",
    "loadRecaptchaScript",
    "navigateToReiseanfrageForm",
    "setCookie",
    "toggleClass",
    "updateCookie"
  ],
  "count": 17,
  "importPath": "Modules/asset/index.js",
  "message": "Found 17 exported function(s) in Abendsonneafrika"
}
```

**If project has no asset module**:
```json
{
  "success": true,
  "available": false,
  "functions": [],
  "message": "No asset index.js file found in this project"
}
```

**Usage in Generation**:
1. Call `list_available_asset_functions` with the selected project
2. Check if `available` is true
3. Only import functions that exist in the `functions` array
4. If `available` is false, don't generate any imports

### Common Shared Functions (Project-Specific)

**Note**: These are examples. Actual functions vary by project. Always check with `list_available_asset_functions` first!

```javascript
// modules/asset/ui/src/index.js (Example functions that might already exist)

// Utility functions
export function toggleClass( element, className, toggleAllOccurrences ) { }
export function getCookie( cookieName ) { }
export function setCookie( name, value, days ) { }

// Slider initialization
export function initializeSplideSlider( config ) { }
export function fixSplideTrackAccessibility( splide ) { }

// Form handling
export function loadRecaptchaScript( formId ) { }
export function handleFormValidation( form ) { }

// Navigation
export function navigateToSection( sectionId ) { }
export function scrollToElement( element ) { }
```

**Remember**: Check `list_available_asset_functions` to see what exists. Only add new functions if they'll be reused!

---

## Real-World Example: Accordion Widget

### Backend (index.js)

```javascript
export default {
    extend: '@apostrophecms/widget-type',
    options: {
        label: 'Accordion Widget'
    },
    fields: {
        add: {
            allowMultiple: {
                label: 'Allow Multiple Open',
                type: 'boolean',
                def: true,
                help: 'If checked, multiple items can be open at once'
            },
            defaultOpenIndex: {
                label: 'Default Open Item',
                type: 'select',
                def: 'first',
                choices: [
                    { label: 'None', value: 'none' },
                    { label: 'First Item', value: 'first' }
                ],
                if: {
                    allowMultiple: false
                }
            },
            accordionItems: {
                label: 'Accordion Items',
                type: 'array',
                titleField: 'title',
                fields: {
                    add: {
                        title: {
                            label: 'Title',
                            type: 'string',
                            required: true
                        },
                        content: {
                            label: 'Content',
                            type: 'area',
                            options: {
                                widgets: {
                                    '@apostrophecms/rich-text': {}
                                }
                            }
                        },
                        defaultOpen: {
                            label: 'Open by default',
                            type: 'boolean',
                            def: false
                        }
                    }
                }
            }
        }
    }
};
```

### Frontend Template (views/widget.html)

```html
{% if data.widget.accordionItems and data.widget.accordionItems.length > 0 %}
    <section class="accordion-section" data-accordion-widget>
        <div class="auto-container">
            <ul class="accordion-box"
                data-allow-multiple="{{ data.widget.allowMultiple }}">
                {% for item in data.widget.accordionItems %}
                    {% set shouldOpen = false %}
                    {% if data.widget.allowMultiple %}
                        {% set shouldOpen = item.defaultOpen %}
                    {% elif data.widget.defaultOpenIndex == 'first' and loop.first %}
                        {% set shouldOpen = true %}
                    {% endif %}

                    <li class="accordion block{% if shouldOpen %} active-block{% endif %}">
                        <button type="button" class="acc-btn reset-button"
                                aria-expanded="{{ 'true' if shouldOpen else 'false' }}"
                                aria-controls="accordion-content-{{ loop.index }}">
                            <div class="icon-outer"></div>
                            <div class="acc-title h5">{{ item.title }}</div>
                        </button>
                        <div class="acc-content" id="accordion-content-{{ loop.index }}">
                            <div class="text">
                                {% area item, 'content' %}
                            </div>
                        </div>
                    </li>
                {% endfor %}
            </ul>
        </div>
    </section>
{% endif %}
```

**Key Template Features**:
- Root element has `data-accordion-widget` (selector)
- Backend config passed via `data-allow-multiple`
- Server-side logic determines initial state (`shouldOpen`)
- Accessibility attributes (aria-expanded, aria-controls)
- Unique IDs using `loop.index`

### Frontend JS (ui/src/index.js)

```javascript
export default () =>
{
    // Register widget player
    apos.util.widgetPlayers.accordionWidget = {
        selector: '[data-accordion-widget]',
        player: function( el )
        {
            initAccordionWidget( el );
        }
    };
};

function initAccordionWidget( widgetElement )
{
    // Find the accordion box within THIS widget
    const accordionBox = widgetElement.querySelector( '.accordion-box' );

    if( !accordionBox )
    {
        return;
    }

    // Get configuration from data attributes
    const allowMultiple = accordionBox.dataset.allowMultiple === 'true';

    // Get all accordion items
    const accordionItems = accordionBox.querySelectorAll( '.accordion.block' );

    accordionItems.forEach( item =>
    {
        const content = item.querySelector( '.acc-content' );
        const btn = item.querySelector( '.acc-btn' );

        if( !content || !btn )
        {
            return;
        }

        // Setup accessibility
        const contentId = content.id || `acc-content-${ Math.random().toString( 36 ).substr( 2, 9 ) }`;
        content.id = contentId;

        // Initialize display state based on active-block class
        const isActive = item.classList.contains( 'active-block' );
        content.style.display = isActive ? 'block' : 'none';
        btn.classList.toggle( 'active', isActive );
        btn.setAttribute( 'aria-expanded', isActive ? 'true' : 'false' );
        btn.setAttribute( 'aria-controls', contentId );
        content.setAttribute( 'aria-hidden', isActive ? 'false' : 'true' );

        // Click event handler
        btn.addEventListener( 'click', ( event ) =>
        {
            event.preventDefault();
            toggleAccordionItem( item, accordionBox, allowMultiple );
        } );
    } );
}

function toggleAccordionItem( item, accordionBox, allowMultiple )
{
    const isActive = item.classList.contains( 'active-block' );

    // If not allowing multiple, close all others first
    if( !allowMultiple && !isActive )
    {
        const allItems = accordionBox.querySelectorAll( '.accordion.block' );
        allItems.forEach( otherItem =>
        {
            if( otherItem !== item && otherItem.classList.contains( 'active-block' ) )
            {
                closeAccordionItem( otherItem );
            }
        } );
    }

    // Toggle the clicked item
    if( isActive )
    {
        closeAccordionItem( item );
    }
    else
    {
        openAccordionItem( item );
    }
}

function closeAccordionItem( item )
{
    const btn = item.querySelector( '.acc-btn' );
    const content = item.querySelector( '.acc-content' );

    item.classList.remove( 'active-block' );
    btn.classList.remove( 'active' );
    content.style.display = 'none';
    btn.setAttribute( 'aria-expanded', 'false' );
    content.setAttribute( 'aria-hidden', 'true' );
}

function openAccordionItem( item )
{
    const btn = item.querySelector( '.acc-btn' );
    const content = item.querySelector( '.acc-content' );

    item.classList.add( 'active-block' );
    btn.classList.add( 'active' );
    content.style.display = 'block';
    btn.setAttribute( 'aria-expanded', 'true' );
    content.setAttribute( 'aria-hidden', 'false' );
}
```

**Key JS Features**:
- Widget player registration
- Scoped to widget instance (multiple accordions on page work independently)
- Reads config from data attributes
- Accessibility support (ARIA attributes)
- Event delegation
- Helper functions for open/close
- Respects `allowMultiple` setting

---

## Best Practices

### 1. Scope to Widget Instance

**Always** query elements within the widget instance, not globally:

```javascript
// ✅ GOOD - Scoped to widget
function initMyWidget( widgetElement )
{
    const items = widgetElement.querySelectorAll( '.item' );
}

// ❌ BAD - Global query (affects all widgets)
function initMyWidget( widgetElement )
{
    const items = document.querySelectorAll( '.item' );
}
```

### 2. Accessibility

Always include proper ARIA attributes:

```javascript
// Setup button accessibility
btn.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
btn.setAttribute( 'aria-controls', contentId );
content.setAttribute( 'aria-hidden', isOpen ? 'false' : 'true' );
content.id = contentId;
```

### 3. Event Cleanup

For widgets that may be removed (in editor), clean up events:

```javascript
function initMyWidget( widgetElement )
{
    const handler = ( event ) =>
    {
        // Handle event
    };

    widgetElement.addEventListener( 'click', handler );

    // Store handler for cleanup
    widgetElement.__cleanupHandler = () =>
    {
        widgetElement.removeEventListener( 'click', handler );
    };
}
```

### 4. Error Handling

Guard against missing elements:

```javascript
function initMyWidget( widgetElement )
{
    const container = widgetElement.querySelector( '.container' );

    if( !container )
    {
        console.warn( 'Widget container not found' );
        return;
    }

    // Continue with initialization
}
```

### 5. Data Attribute Parsing

Convert string data attributes properly:

```javascript
// Booleans
const enabled = element.dataset.enabled === 'true';

// Numbers
const count = parseInt( element.dataset.count, 10 );
const speed = parseFloat( element.dataset.speed );

// JSON
try
{
    const config = JSON.parse( element.dataset.config );
}
catch( error )
{
    console.error( 'Invalid JSON in data-config' );
}
```

---

## Common Widget Types Requiring Frontend JS

### Accordion / Collapsible
- Toggle show/hide content
- Manage open/close states
- Handle keyboard navigation

### Tabs
- Switch between tab panels
- Update active states
- Handle keyboard navigation (arrow keys)

### Slider / Carousel
- Initialize Splide or similar library
- Handle navigation clicks
- Manage autoplay

### Modal / Lightbox
- Open/close modal
- Trap focus
- Handle escape key

### Form Enhancements
- Custom validation
- AJAX submission
- Dynamic field visibility

### Infinite Scroll / Load More
- Detect scroll position
- Load additional content
- Update pagination

### Image Gallery
- Lightbox functionality
- Thumbnail navigation
- Keyboard controls

---

## Template for Widget with Frontend JS

Use this as starting point when user requests interactive widget:

### ui/src/index.js Template

```javascript
export default () =>
{
    // Register widget player
    apos.util.widgetPlayers.{camelCaseName}Widget = {
        selector: '[data-{kebab-case-name}-widget]',
        player: function( el )
        {
            init{PascalCaseName}Widget( el );
        }
    };
};

function init{PascalCaseName}Widget( widgetElement )
{
    // Find elements
    const container = widgetElement.querySelector( '.widget-container' );

    if( !container )
    {
        console.warn( '{PascalCaseName}Widget: container not found' );
        return;
    }

    // Get configuration from data attributes
    const config = {
        // Parse data attributes here
        // Example: enabled: container.dataset.enabled === 'true'
    };

    // Setup event handlers
    setupEventHandlers( widgetElement, container, config );
}

function setupEventHandlers( widgetElement, container, config )
{
    // Add your event listeners here
    // Example:
    // container.addEventListener( 'click', ( event ) => {
    //     // Handle click
    // } );
}

// Additional helper functions as needed
```

---

## Summary

**When to Generate Frontend JS**:
- Only when explicitly requested or widget is inherently interactive
- Interactive widgets: accordion, tabs, slider, modal, dropdown, etc.

**File to Create**:
- `ui/src/index.js` in the widget directory

**Pattern to Use**:
- Widget player registration with `apos.util.widgetPlayers`
- Selector matches `data-{widget-name}-widget` attribute
- Pass config via data attributes on template elements
- Import shared functions from `Modules/asset/index.js`

**Key Principles**:
- **NEVER use inline `<script>` tags** - always use ui/src/index.js
- **NEVER use inline event handlers** - use addEventListener in JS file
- Scope all queries to widget instance
- Support multiple instances on same page
- Include accessibility (ARIA) attributes
- Handle errors gracefully
- Use semantic HTML with data attributes for configuration
