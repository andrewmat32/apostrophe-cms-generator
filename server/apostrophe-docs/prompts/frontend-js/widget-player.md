# Frontend JavaScript: Widget Player Pattern

## ⚠️ CRITICAL RULES

**NEVER use inline `<script>` tags in templates!**

- ❌ **WRONG**: `<script>` tags in widget.html
- ❌ **WRONG**: Inline JavaScript in template files
- ❌ **WRONG**: Event handlers in HTML attributes (`onclick`, `onchange`, etc.)
- ✅ **CORRECT**: Separate `ui/src/index.js` file using widget player pattern
- ✅ **CORRECT**: Data attributes for configuration
- ✅ **CORRECT**: Event listeners in JavaScript file

**Why?** Apostrophe widgets can appear multiple times on a page. Inline scripts run multiple times causing conflicts. The widget player pattern ensures proper initialization for each instance.

---

## File Structure

When generating a widget with frontend JS, create these files:

```
modules/widgets/{widget-name}/
├── index.js                    # Backend schema
├── views/
│   └── widget.html            # Frontend template (NO <script> tags!)
└── ui/
    └── src/
        └── index.js           # Frontend JavaScript logic ← CREATE THIS!
```

---

## Pattern: Widget Player System

### ui/src/index.js Structure

```javascript
export default () =>
{
    // Register widget player
    apos.util.widgetPlayers.{widgetName}Widget = {
        selector: '[data-{widget-name}-widget]',
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

    // Find elements within THIS widget instance
    const container = widgetElement.querySelector( '.widget-container' );

    if( !container )
    {
        console.warn( '{WidgetName}Widget: container not found' );
        return;
    }

    // Get configuration from data attributes
    const enabled = widgetElement.dataset.enabled === 'true';
    const speed = parseInt( widgetElement.dataset.speed, 10 );

    // Setup event handlers
    container.addEventListener( 'click', ( event ) =>
    {
        // Handle click within this widget instance
    } );
}
```

**Key Points**:
- Export default function
- Register using `apos.util.widgetPlayers.{camelCaseName}Widget`
- Selector matches data attribute on root element
- Player function receives the widget DOM element
- All logic scoped to that widget instance

---

## Template Integration

### Template (views/widget.html)

```html
<div class="{module-name}" data-{module-name}-widget
     data-enabled="{{ data.widget.enabled }}"
     data-speed="{{ data.widget.speed }}">
    <div class="{module-name}__container">
        <!-- Widget content here -->
        <button class="{module-name}__button" data-button>Click me</button>
    </div>
</div>
```

**Requirements**:
- Root element must have `data-{module-name}-widget` attribute
- Pass backend config via data attributes
- Use semantic classes for styling (BEM recommended)
- NO <script> tags!
- NO inline event handlers!

---

## Passing Data from Backend to Frontend

### Method 1: Data Attributes (Recommended)

**Backend** (index.js):
```javascript
fields: {
    add: {
        enabled: {
            type: 'boolean',
            def: true
        },
        speed: {
            type: 'integer',
            def: 1000
        }
    }
}
```

**Template** (views/widget.html):
```html
<div class="my-widget"
     data-my-widget
     data-enabled="{{ data.widget.enabled }}"
     data-speed="{{ data.widget.speed }}">
</div>
```

**Frontend JS** (ui/src/index.js):
```javascript
function initMyWidget( widgetElement )
{
    // Read configuration from data attributes
    const enabled = widgetElement.dataset.enabled === 'true';  // Boolean
    const speed = parseInt( widgetElement.dataset.speed, 10 ); // Number

    console.log( `Config: enabled=${enabled}, speed=${speed}` );
}
```

**Data Attribute Naming**:
- `data-allow-multiple` in HTML → `dataset.allowMultiple` in JS (camelCase conversion)
- Booleans: Compare with `=== 'true'` (all data attributes are strings)
- Numbers: Use `parseInt()` or `parseFloat()`

### Method 2: JSON in Data Attribute (Complex Data)

For complex objects or arrays:

**Template**:
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

**Widget JS Example** (`modules/widgets/my-widget/ui/src/index.js`):
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
- **Always check available functions first** using MCP tool
- **Only import functions that exist** in the project

### Checking Available Functions (MCP Tool)

Before generating imports, use the MCP tool to check what's available:

**Tool**: `list_available_asset_functions`

**If project has no asset module**:
- Don't generate any imports
- Don't reference `Modules/asset/index.js`

**Usage in Generation**:
1. Call `list_available_asset_functions` with the selected project
2. Check if `available` is true
3. Only import functions that exist in the `functions` array
4. If `available` is false, don't generate any imports

---

## Best Practices

### 1. Error Handling

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

### 2. Accessibility

Always include proper ARIA attributes:

```javascript
// Setup button accessibility
btn.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
btn.setAttribute( 'aria-controls', contentId );
content.setAttribute( 'aria-hidden', isOpen ? 'false' : 'true' );
content.id = contentId;
```

### 3. Data Attribute Parsing

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

### 4. Event Cleanup (for editor)

For widgets that may be removed in the editor:

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

---

## Scoping to Widget Instance

**Always** query elements within the widget instance, not globally:

```javascript
// ✅ GOOD - Scoped to widget
function initMyWidget( widgetElement )
{
    const items = widgetElement.querySelectorAll( '.item' );
    // Only finds .item elements within THIS widget
}

// ❌ BAD - Global query (affects all widgets)
function initMyWidget( widgetElement )
{
    const items = document.querySelectorAll( '.item' );
    // Finds ALL .item elements on entire page!
}
```

---

## Example: Simple Interactive Widget

### Backend (index.js)
```javascript
export default {
    extend: '@apostrophecms/widget-type',
    fields: {
        add: {
            buttonText: {
                type: 'string',
                label: 'Button Text',
                def: 'Click Me'
            },
            message: {
                type: 'string',
                label: 'Alert Message',
                def: 'Button clicked!'
            }
        }
    },
    group: {
        basics: {
            label: 'Basics',
            fields: ['buttonText', 'message']
        }
    }
};
```

### Template (views/widget.html)
```html
<div class="click-widget" data-click-widget
     data-message="{{ data.widget.message }}">
    <button class="click-widget__button" data-button>
        {{ data.widget.buttonText }}
    </button>
</div>
```

### Frontend JS (ui/src/index.js)
```javascript
export default () =>
{
    apos.util.widgetPlayers.clickWidget = {
        selector: '[data-click-widget]',
        player: function( el )
        {
            initClickWidget( el );
        }
    };
};

function initClickWidget( widgetElement )
{
    const button = widgetElement.querySelector( '[data-button]' );
    const message = widgetElement.dataset.message;

    if( !button )
    {
        return;
    }

    button.addEventListener( 'click', ( event ) =>
    {
        event.preventDefault();
        alert( message );
    } );
}
```

---

## When to Include Frontend JS

**Include frontend JS ONLY when:**
- User explicitly requests "with JavaScript logic" or "interactive"
- Widget is inherently interactive (accordion, tabs, slider, modal, dropdown)
- Widget requires client-side behavior (show/hide, toggle, animation)
- Widget needs event handlers (click, scroll, resize)

**Do NOT include frontend JS for:**
- Simple display widgets (testimonials, cards, banners)
- Widgets that only render content
- Static layouts without interaction

---

## Common Widget Types Requiring Frontend JS

### Interactive Components
- **Accordion / Collapsible**: Toggle show/hide content, manage open/close states
- **Tabs**: Switch between tab panels, update active states
- **Slider / Carousel**: Initialize libraries (Splide), handle navigation
- **Modal / Lightbox**: Open/close modal, trap focus, handle escape key
- **Dropdown / Menu**: Show/hide on click, handle outside clicks

### Form Enhancements
- **Custom Validation**: Client-side validation before submit
- **AJAX Submission**: Submit forms without page reload
- **Dynamic Fields**: Show/hide fields based on other field values

### Content Loading
- **Infinite Scroll**: Detect scroll position, load additional content
- **Load More**: Button to load more items via AJAX
- **Image Gallery**: Lightbox functionality, thumbnail navigation

---

## Output Format

When generating a widget with frontend JS, return THREE files:

```json
{
  "files": [
    {
      "path": "modules/widgets/{name}/index.js",
      "content": "export default { extend: '@apostrophecms/widget-type', ... };"
    },
    {
      "path": "modules/widgets/{name}/views/widget.html",
      "content": "<div data-{name}-widget>...</div>"
    },
    {
      "path": "modules/widgets/{name}/ui/src/index.js",
      "content": "export default () => { apos.util.widgetPlayers.{name}Widget = { ... }; };"
    }
  ]
}
```

**Critical**: Template file must have NO <script> tags!
