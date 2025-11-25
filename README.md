# Apostrophe Code Generator

AI-powered code generator for Apostrophe CMS modules using Claude AI and MCP (Model Context Protocol) architecture.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)
![Apostrophe](https://img.shields.io/badge/apostrophe-3.x%20%7C%204.x-purple.svg)

---

## Quick Start (TL;DR)

```bash
# 1. Ensure prerequisites are installed
node --version    # Must be >= 18
claude --version  # Must have Claude Code CLI

# 2. Install
./install.sh      # Linux/macOS
# OR manually:
npm install && cd mcp-server && npm install

# 3. Run
npm start

# 4. Open browser
# http://localhost:3031
```

**That's it!** Select a project, choose module type, configure, generate.

---

## Overview

The Apostrophe Code Generator is a web-based tool that leverages Claude AI to generate production-ready Apostrophe CMS modules. It provides an intuitive wizard interface for creating pieces, pages, widgets, and complete bundles with AI-powered SCSS generation using your project's design tokens.

### Key Features

- **Piece Generator**: Create content types stored in the database
- **Page Generator**: Generate page types with content areas and piece relationships
- **Widget Generator**: Create reusable UI components with relationship patterns
- **Bundle Generator**: Generate complete feature sets (piece + page + widget) in one go
- **Design Token Extraction**: Automatically extracts and uses your project's design tokens for SCSS
- **BEM Methodology**: Optional SCSS generation following BEM naming conventions (experimental)
- **Auto-Registration**: Automatically registers generated modules in your project's `modules.js`
- **SCSS Integration**: Creates and imports SCSS files automatically
- **Generation History**: Browse and re-use previously generated modules

> **Note**: CSS/SCSS generation is experimental. Results may vary depending on project complexity and design token availability. Always review generated styles before deploying to production.

---

## Prerequisites

Before installing, ensure you have the following:

### Required

| Prerequisite | Version | Description |
|-------------|---------|-------------|
| **Node.js** | >= 18.x | JavaScript runtime |
| **npm** | >= 9.x | Node package manager (comes with Node.js) |
| **Claude Code** | Latest | Anthropic's CLI for AI-powered code generation |

### Installing Claude Code

Claude Code is **required** for the AI-powered code generation. The application calls the `claude` CLI directly to generate Apostrophe modules.

```bash
# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Configure with your Anthropic API key
claude configure
```

You'll need an Anthropic API key. Get one at: https://console.anthropic.com/

To verify Claude Code is installed correctly:
```bash
claude --version
```

### ESM (ES Modules) Requirement

**Important:** This tool generates code using **ES Module syntax** (`export default`) rather than CommonJS (`module.exports`). Your Apostrophe project must be configured for ESM.

Ensure your project's `package.json` contains:
```json
{
  "type": "module"
}
```

**Generated code syntax:**
```javascript
// ✅ This tool generates (ESM):
export default {
  extend: '@apostrophecms/widget-type',
  fields: { ... }
};

// ❌ NOT CommonJS:
module.exports = {
  extend: '@apostrophecms/widget-type',
  fields: { ... }
};
```

If your project uses CommonJS, you'll need to either:
1. **Convert to ESM** (recommended for Apostrophe 3.x/4.x)
2. Manually convert generated `export default` to `module.exports`

### Apostrophe CMS Projects

The tool automatically discovers Apostrophe CMS projects in the **parent directory**. A folder is recognized as an Apostrophe project if it contains an `app.js` file with a `shortName` property.

Example directory structure:
```
/projects/                           # Parent directory
├── apostrophe-code-generator/       # This tool
├── my-apostrophe-site/              # ✓ Discovered (has app.js with shortName)
├── another-apostrophe-project/      # ✓ Discovered
└── some-other-folder/               # ✗ Ignored (no app.js with shortName)
```

---

## Installation

### Quick Install (Recommended)

```bash
# Clone or download the repository
cd /path/to/apostrophe-code-generator

# Run the install script
./install.sh
```

The install script will:
1. Check for Node.js and npm
2. Install main application dependencies
3. Install MCP server dependencies
4. Optionally configure Claude Code integration

### Manual Installation

If you prefer to install manually:

```bash
# Navigate to the project directory
cd /path/to/apostrophe-code-generator

# Install main dependencies
npm install

# Install MCP server dependencies
cd mcp-server
npm install
cd ..
```

---

## Usage

### Starting the Application

```bash
# From the project root directory
npm start

# Or for development with auto-reload
npm run dev
```

The server will start on **http://localhost:3031**

### Using the Web Interface

1. **Open your browser** and navigate to `http://localhost:3031`

2. **Select a Project**: Choose an Apostrophe project from the dropdown. Projects are automatically discovered from the parent directory.

3. **Choose Module Type**: Select what you want to generate:
   - **Piece**: Content type stored in the database
   - **Page**: Page type with content areas
   - **Widget**: Reusable UI component
   - **Bundle**: Complete feature set (piece + page + widget)

4. **Configure Options**: Fill in the module details:
   - Module name
   - Description
   - Fields and relationships
   - Styling options (BEM, design tokens)

5. **Generate**: Click "Generate Code" and watch the AI create your module

6. **Save to Project**: Review the generated code and save it directly to your project

### Generation History

All generated modules are saved to the history. You can:
- View previously generated modules
- Re-generate with modified settings
- Copy code to clipboard
- Delete from history

---

## Advanced: Direct Claude Code MCP Integration

> **This section is optional.** The web UI at `localhost:3031` is the primary way to use this tool. This MCP integration is only for advanced users who want to call the generator directly from Claude Code CLI without using the web interface.

### Why Use This?

If you're already working in a Claude Code session on your Apostrophe project, you can generate modules directly by asking Claude Code to use the generator tools - no need to switch to the browser.

**Example:** In Claude Code, you could say:
> "Use the apostrophe-generator to create a widget called news-feed for my-project"

### Configuration

1. **Locate your Claude Code settings file**:
   - Linux/macOS: `~/.claude/settings.json`
   - Windows: `%USERPROFILE%\.claude\settings.json`

2. **Add the MCP server configuration**:

```json
{
  "mcpServers": {
    "apostrophe-generator": {
      "command": "node",
      "args": ["/absolute/path/to/apostrophe-code-generator/mcp-server/index.js"],
      "env": {},
      "description": "Apostrophe CMS code generation tools"
    }
  }
}
```

Replace `/absolute/path/to/` with the actual path to your installation.

3. **Restart Claude Code** to load the new MCP server

### Available MCP Tools

Once configured, the following tools are available in Claude Code:

| Tool | Description |
|------|-------------|
| `list_apostrophe_projects` | List all discovered Apostrophe projects |
| `generate_piece` | Generate a piece module |
| `generate_page` | Generate a page module |
| `generate_widget` | Generate a widget module |
| `generate_bundle` | Generate a complete bundle |
| `save_generated_code` | Save generated code to project |

---

## Generated Module Structure

This section details exactly what files are generated for each module type and their structure.

### Piece Module

Pieces are content types stored in the database (like articles, products, team members).

**Generated Files:**
```
modules/pieces/{piece-name}/
└── index.js              # Schema definition with fields
```

**No templates** - Pieces are data-only; they're displayed through piece-pages or widgets.

**index.js Structure:**
```javascript
export default {
  extend: '@apostrophecms/piece-type',
  options: {
    label: 'Piece Name',
    pluralLabel: 'Piece Names',
    seoFields: false,
    openGraph: false
  },
  fields: {
    add: {
      // Custom fields defined here
      description: { type: 'string', label: 'Description' },
      featuredImage: {
        type: 'area',
        label: 'Featured Image',
        options: {
          widgets: { '@apostrophecms/image': {} }
        }
      }
    },
    group: {
      basics: {
        label: 'Basics',
        fields: ['title', 'description', 'featuredImage']
      }
    }
  }
};
```

### Page Module

Pages are URL-routable content that can display pieces (piece-pages) or standalone content.

**Generated Files:**
```
modules/pages/{page-name}/
├── index.js              # Schema definition
└── views/
    ├── index.html        # List view (for piece-pages)
    └── show.html         # Detail view (for piece-pages)
```

**For standalone pages**, only `page.html` is generated instead of index/show.

**index.js Structure:**
```javascript
export default {
  extend: '@apostrophecms/piece-page-type',  // or '@apostrophecms/page-type'
  options: {
    label: 'Page Name',
    pieceModuleName: 'piece-name'  // For piece-pages only
  },
  fields: {
    add: {
      // Page-specific fields
    },
    group: {
      // Field groups
    }
  }
};
```

### Widget Module

Widgets are reusable UI components that can be placed in content areas.

**Generated Files:**
```
modules/widgets/{widget-name}-widget/
├── index.js              # Schema definition
└── views/
    └── widget.html       # Widget template
```

**Note:** Widget folder names always end with `-widget` suffix.

**index.js Structure:**
```javascript
export default {
  extend: '@apostrophecms/widget-type',
  fields: {
    add: {
      heading: { type: 'string', label: 'Heading' },
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
        fields: ['heading', 'content']
      }
    }
  }
};
```

**widget.html Template:**
```html
<div class="widget-name-widget" data-widget-name-widget>
  <h2>{{ data.widget.heading }}</h2>
  {% area data.widget, 'content' %}
</div>
```

### Bundle Module

Bundles generate a complete feature set: piece + piece-page + widget in one operation.

**Generated Files:**
```
modules/
├── pieces/{name}/
│   └── index.js
├── pages/{name}-page/
│   ├── index.js
│   └── views/
│       ├── index.html
│       └── show.html
└── widgets/{name}-widget/
    ├── index.js
    └── views/
        └── widget.html
```

**Bundle Relationships:**
- The widget automatically includes a `_pieces` relationship field to reference the piece
- The page is configured as a piece-page for the piece type

---

## SCSS Generation (Optional)

When **BEM Styles** is enabled, additional SCSS files are generated.

### Generated SCSS Files

```
modules/asset/ui/src/scss/
├── components/
│   └── _{widget-name}.scss    # For widgets
└── pages/
    └── _{page-name}.scss      # For pages
```

### SCSS Features

- **BEM Methodology**: Block-Element-Modifier naming convention
- **Design Token Integration**: Uses your project's existing design tokens (colors, spacing, typography)
- **Auto-Import**: SCSS files are automatically imported into your main stylesheet

**Example Generated SCSS:**
```scss
// _news-widget.scss
.news-widget {
  padding: $spacing-lg;
  background-color: $color-background;

  &__heading {
    font-size: $font-size-xl;
    color: $color-text-primary;
    margin-bottom: $spacing-md;
  }

  &__content {
    line-height: $line-height-relaxed;
  }

  &__item {
    border-bottom: 1px solid $color-border;
    padding: $spacing-md 0;

    &:last-child {
      border-bottom: none;
    }
  }
}
```

### Design Token Extraction

The generator automatically scans your project for design tokens in:
- `modules/asset/ui/src/scss/_settings.scss`
- `modules/asset/ui/src/scss/_variables.scss`
- Any file matching `*variables*` or `*tokens*` pattern

Extracted token types:
- Colors (`$color-*`)
- Spacing (`$spacing-*`)
- Typography (`$font-*`, `$line-height-*`)
- Breakpoints (`$breakpoint-*`)

---

## Auto-Registration

Generated modules are automatically registered in your project's `modules.js` file.

### What Gets Added

```javascript
// modules.js
module.exports = {
  // ... existing modules ...

  // Auto-added by Code Generator:
  'news': {},                    // Piece
  'news-page': {},               // Page
  'news-widget': {},             // Widget
};
```

### SCSS Import

If SCSS is generated, an import statement is added to your main SCSS file:

```scss
// In _components.scss or main.scss
@import 'components/_news-widget';
```

---

## History Storage

All generated modules are saved to the `history/` folder for reference and re-use.

### History Folder Structure

```
history/
└── 2025-11-18_14-30-45_news-widget/
    ├── metadata.json
    └── modules/
        └── widgets/
            └── news-widget/
                ├── index.js
                └── views/
                    └── widget.html
```

### Metadata Format

```json
{
  "moduleName": "news-widget",
  "moduleType": "widget",
  "projectName": "my-apostrophe-project",
  "fileCount": 2,
  "fullDesign": false,
  "description": "A widget to display latest news items",
  "timestamp": "2025-11-18T14:30:45.123Z"
}
```

### History Features

- **View**: Browse previously generated modules
- **Re-generate**: Use previous settings as a starting point
- **Copy**: Copy code directly to clipboard
- **Delete**: Remove entries from history (does not affect saved project files)

---

## API Endpoints

The Express server exposes these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List discovered Apostrophe projects |
| `/api/generate` | POST | Generate a module |
| `/api/save` | POST | Save generated files to project |
| `/api/delete` | POST | Delete saved files from project |
| `/api/history` | GET | List generation history |
| `/api/history/:id` | GET | Get specific history entry |
| `/api/history/:id` | DELETE | Delete history entry |

### Generate Request Format

```json
{
  "projectId": "my-project",
  "type": "widget",
  "name": "news",
  "label": "News Widget",
  "description": "Display latest news with images and summaries",
  "includeBemStyles": true,
  "fullDesign": false
}
```

### Generate Response Format

```json
{
  "success": true,
  "files": [
    {
      "path": "modules/widgets/news-widget/index.js",
      "content": "export default { ... }"
    },
    {
      "path": "modules/widgets/news-widget/views/widget.html",
      "content": "<div class=\"news-widget\">...</div>"
    }
  ],
  "registrationNote": "Module registered in modules.js",
  "historyId": "2025-11-18_14-30-45_news-widget"
}
```

---

## Field Types Reference

Available field types for module schemas:

| Type | Description | Example |
|------|-------------|---------|
| `string` | Single-line text | `{ type: 'string', label: 'Title' }` |
| `area` | Rich content area | `{ type: 'area', options: { widgets: {...} } }` |
| `boolean` | Checkbox (true/false) | `{ type: 'boolean', label: 'Featured' }` |
| `select` | Dropdown menu | `{ type: 'select', choices: [...] }` |
| `checkboxes` | Multiple selection | `{ type: 'checkboxes', choices: [...] }` |
| `relationship` | Link to other pieces | `{ type: 'relationship', withType: 'article' }` |
| `array` | Repeating field group | `{ type: 'array', fields: { add: {...} } }` |
| `date` | Date picker | `{ type: 'date', label: 'Publish Date' }` |
| `time` | Time picker | `{ type: 'time', label: 'Event Time' }` |
| `url` | URL input | `{ type: 'url', label: 'Website' }` |
| `email` | Email input | `{ type: 'email', label: 'Contact Email' }` |
| `integer` | Whole number | `{ type: 'integer', label: 'Quantity' }` |
| `float` | Decimal number | `{ type: 'float', label: 'Price' }` |
| `slug` | URL-safe string | `{ type: 'slug', following: 'title' }` |
| `color` | Color picker | `{ type: 'color', label: 'Background Color' }` |
| `range` | Slider input | `{ type: 'range', min: 0, max: 100 }` |
| `attachment` | File upload | `{ type: 'attachment', label: 'Document' }` |

### Reserved Field Names

**Never use these names** - they are reserved by Apostrophe:

- `type`, `_id`, `slug`, `published`, `archived`
- `trash`, `visibility`, `createdAt`, `updatedAt`
- `metaType`, `aposMode`, `aposLocale`

**Alternatives:**
- Instead of `type` → use `category`, `kind`, `itemType`
- Instead of `status` → use `currentStatus`, `statusLabel`

---

## Project Structure

```
apostrophe-code-generator/
├── server/                     # Express server
│   ├── index.js               # Main server entry point
│   ├── mcp-client.js          # MCP client for AI generation
│   └── apostrophe-docs/       # Apostrophe documentation & patterns
├── mcp-server/                 # MCP server for Claude Code
│   ├── index.js               # MCP server entry point
│   ├── generator.js           # Code generation logic
│   ├── design-token-parser.js # Design token extraction
│   ├── package.json           # MCP server dependencies
│   └── mcp-config.json        # Example MCP configuration
├── public/                     # Web UI
│   ├── index.html             # Main wizard interface
│   ├── css/                   # Stylesheets
│   └── js/                    # Client-side JavaScript
├── docs/                       # Documentation
├── history/                    # Generated module history
├── install.sh                  # Installation script
├── package.json               # Main dependencies
└── README.md                  # This file
```

---

## Configuration

### Server Port

The default port is `3031`. To change it, set the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Project Discovery

By default, the tool looks for Apostrophe projects in the parent directory. This behavior is automatic and requires no configuration.

---

## Troubleshooting

### Common Issues

#### "Cannot find module '@modelcontextprotocol/sdk'"

The MCP server dependencies are not installed. Run:
```bash
cd mcp-server
npm install
```

#### "No projects found"

Ensure your Apostrophe projects are in the parent directory and contain an `app.js` file with a `shortName` property:
```javascript
// app.js
module.exports = require('apostrophe')({
  shortName: 'my-project',
  // ...
});
```

#### "Claude API timeout" or generation fails

1. Ensure Claude Code is installed: `claude --version`
2. Ensure Claude Code is configured: `claude configure`
3. Check your Anthropic API key is valid
4. Try a simpler module description
5. Check your internet connection

#### "MCP server failed"

1. Check that the MCP server path in your Claude settings is correct
2. Ensure all dependencies are installed
3. Check the Node.js version (>= 18 required)

#### Port already in use

Another application is using port 3031. Either:
- Stop the other application
- Use a different port: `PORT=3032 npm start`

### Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal for server-side errors
3. Ensure all prerequisites are met
4. Verify project structure matches expected format

---

## Architecture

### Components

1. **Express Server** (`server/index.js`)
   - Serves the web UI
   - Handles API requests
   - Manages project discovery
   - Communicates with MCP server

2. **MCP Server** (`mcp-server/index.js`)
   - Provides AI-powered code generation
   - Integrates with Claude AI
   - Exposes tools for Claude Code integration

3. **Web UI** (`public/`)
   - Wizard-style interface
   - Real-time generation progress
   - History management

### Data Flow

```
User Input → Express Server → MCP Server → Claude AI
                                    ↓
User ← Web UI ← Express Server ← Generated Code
```

---

## Development

### Running in Development Mode

```bash
npm run dev
```

This starts the server with auto-reload on file changes.

### Building Tailwind CSS

If you modify the styles:
```bash
./tailwindcss-linux-x64 -i public/css/input.css -o public/css/styles.css --watch
```

---

## Contributing

Contributions are welcome! Please ensure:
1. Code follows existing patterns
2. New features are documented
3. Tests pass (if applicable)

---

## Windows Installation

The `install.sh` script is for Linux/macOS. Windows users should install manually:

### Using Command Prompt

```cmd
cd path\to\apostrophe-code-generator

:: Install main dependencies
npm install

:: Install MCP server dependencies
cd mcp-server
npm install
cd ..

:: Start the server
npm start
```

### Using PowerShell

```powershell
cd path\to\apostrophe-code-generator

# Install main dependencies
npm install

# Install MCP server dependencies
cd mcp-server
npm install
cd ..

# Start the server
npm start
```

### Windows Prerequisites

1. **Node.js**: Download from https://nodejs.org/ (v18+)
2. **Claude Code**: `npm install -g @anthropic-ai/claude-code`
3. Configure Claude: `claude configure`

---

## Compatibility

### Apostrophe CMS Versions

| Apostrophe Version | Supported |
|-------------------|-----------|
| 4.x (A4)          | ✅ Yes    |
| 3.x (A3)          | ✅ Yes    |
| 2.x (A2)          | ❌ No     |

This tool generates code for **Apostrophe 3.x and 4.x**. The module structure, field types, and template syntax are compatible with both A3 and A4.

### Node.js Versions

| Node.js Version | Supported |
|-----------------|-----------|
| 22.x            | ✅ Yes    |
| 20.x            | ✅ Yes    |
| 18.x            | ✅ Yes    |
| 16.x and below  | ❌ No     |

### Operating Systems

| OS | Supported |
|----|-----------|
| Linux | ✅ Yes |
| macOS | ✅ Yes |
| Windows 10/11 | ✅ Yes |
| WSL/WSL2 | ✅ Yes |

---

## Known Limitations

### SCSS Generation (Experimental)

- SCSS generation works best when your project has well-defined design tokens
- Generated SCSS may contain undefined variables if tokens don't exist in your project
- Always review generated SCSS before compiling
- Complex layouts may require manual adjustment

### AI Generation

- Results depend on the quality of your description
- Very complex modules may require multiple generations or manual editing
- Generation time varies (typically 10-60 seconds depending on complexity)
- Occasional JSON parsing errors may require retry

### Project Discovery

- Only discovers projects in the **parent directory**
- Projects must have `app.js` with `shortName` property
- Symlinked projects may not be discovered

### Bundle Generation

- Bundles generate 3 modules at once - this can take longer
- All 3 modules share the same base name
- Cannot customize individual module names within a bundle

---

## FAQ

### General

**Q: Do I need an Anthropic API key?**
A: Yes. Claude Code requires an API key from https://console.anthropic.com/

**Q: How much does it cost to use?**
A: The tool itself is free. You pay for Claude API usage through your Anthropic account. Each generation typically uses 1,000-5,000 tokens.

**Q: Can I use this offline?**
A: No. The tool requires internet access to communicate with Claude AI.

### Projects

**Q: Why doesn't my project appear in the dropdown?**
A: Ensure your project:
- Is in the parent directory of this tool
- Has an `app.js` file
- Contains `shortName: 'your-project'` in app.js

**Q: Can I change the project discovery location?**
A: Currently no. Projects must be in the parent directory. This may be configurable in a future version.

### Generation

**Q: The generated code has errors. What do I do?**
A: Try:
1. Simplify your description
2. Generate again (AI responses vary)
3. Manually edit the generated code
4. Check for reserved field names

**Q: Can I edit the generated code before saving?**
A: Not in the UI currently. Generate, save, then edit in your IDE.

**Q: How do I regenerate a module?**
A: Use the History feature to view previous generations and regenerate with modified settings.

### Styling

**Q: The SCSS has undefined variables. Why?**
A: The generator uses your project's design tokens. If a token doesn't exist, the variable will be undefined. Replace with actual values or add the tokens to your project.

**Q: Can I disable SCSS generation?**
A: Yes. Uncheck "Include BEM Styles" when configuring your module.

---

## Uninstalling

To remove the Code Generator:

```bash
# Simply delete the folder
rm -rf /path/to/apostrophe-code-generator

# Optional: Remove global Claude Code if no longer needed
npm uninstall -g @anthropic-ai/claude-code
```

Generated modules in your Apostrophe projects are **not affected** by uninstalling this tool.

---

## License

MIT License - see LICENSE file for details.

---

## Credits

**Created by**: Andrei Mateas
**For**: GLOOBUS A-Team

Built with Claude AI & MCP (Model Context Protocol)

---

## Changelog

### v1.0.0
- Initial release
- Piece, Page, Widget, and Bundle generators
- Design token extraction
- BEM SCSS generation (experimental)
- Generation history
- Claude Code MCP integration
