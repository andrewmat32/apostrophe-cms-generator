# Documentation Organization

This directory contains organized documentation for the Health Check Tool Generator project.

## Directory Structure

```
docs/
├── README.md                    # This file
├── changelog/                   # Historical fix and improvement docs
└── reference/                   # Reference documentation
    ├── patterns/                # Legacy JSON pattern files
    ├── AUTO-REGISTRATION.md     # Auto-registration feature docs
    ├── AUTO-SCSS.md             # SCSS generation feature docs
    ├── DOCS_MAP.md              # Documentation map
    ├── INTEGRATION.md           # Integration documentation
    ├── RELATIONSHIP-PATTERN.md  # Relationship examples
    ├── SAFE_CLEANUP_VERIFICATION.md  # Cleanup verification
    └── COMPLETE_DOCUMENTATION_AUDIT.md  # Documentation audit

server/apostrophe-docs/          # Active MCP documentation (loaded by generator.js)
├── README.md
└── prompts/
    ├── FRONTEND-JAVASCRIPT-PATTERN.md  # ✅ Loaded by MCP (conditional)
    ├── bem-guidance.md                  # ✅ Loaded by MCP (conditional)
    ├── common-rules.md                  # ✅ Loaded by MCP (always)
    ├── page-prompt.md                   # ✅ Loaded by MCP (pages)
    ├── parse-request.md                 # ✅ Loaded by MCP (chat mode)
    ├── piece-prompt.md                  # ✅ Loaded by MCP (pieces)
    └── widget-prompt.md                 # ✅ Loaded by MCP (widgets)
```

## Documentation Categories

### Active MCP Documentation (`server/apostrophe-docs/`)

**These files are actively loaded by the MCP server** and guide Claude's code generation:

1. **`prompts/common-rules.md`** - Always loaded for all module types
   - ESM syntax requirements
   - Bundle generation warnings
   - Widget naming conventions
   - Field organization patterns

2. **`prompts/widget-prompt.md`** - Loaded when generating widgets
   - Widget schema structure (group inside fields)
   - Widget naming requirements (-widget suffix)
   - Data attribute naming

3. **`prompts/page-prompt.md`** - Loaded when generating pages
   - Page schema structure
   - Widget references in areas (full name with -widget)

4. **`prompts/piece-prompt.md`** - Loaded when generating pieces
   - Piece schema structure
   - No templates for pieces

5. **`prompts/bem-guidance.md`** - Loaded when BEM styles requested
   - BEM methodology guidance

6. **`prompts/parse-request.md`** - Loaded for chat mode
   - Natural language parsing instructions

7. **`prompts/FRONTEND-JAVASCRIPT-PATTERN.md`** - Loaded when interactive keywords detected
   - Widget player pattern
   - Selector naming (full name with -widget)

**⚠️ CRITICAL**: Do not move or rename these files - they are referenced by `mcp-server/generator.js`

### Reference Documentation (`docs/reference/`)

Developer reference documentation that is **not loaded by MCP** but useful for understanding features:

- **AUTO-REGISTRATION.md** - Auto-registration feature explanation
- **AUTO-SCSS.md** - SCSS generation feature explanation
- **INTEGRATION.md** - Integration documentation
- **RELATIONSHIP-PATTERN.md** - Relationship examples
- **DOCS_MAP.md** - Documentation map
- **SAFE_CLEANUP_VERIFICATION.md** - Cleanup verification from doc audit
- **COMPLETE_DOCUMENTATION_AUDIT.md** - Full documentation audit

### Legacy Patterns (`docs/reference/patterns/`)

Legacy JSON pattern files (not loaded by MCP):

- **nested-modules-pattern.json**
- **pages-patterns.json**
- **pieces-patterns.json**
- **project-structure.json**
- **widgets-patterns.json**

### Changelog Documentation (`docs/changelog/`)

Historical fix and improvement tracking documents. All changes documented here have already been applied to the active MCP documentation:

**Widget Fixes:**
- **FIX_WIDGET_NAMING_EVERYWHERE.md** - Widget -widget suffix requirement
- **FIX_WIDGET_SCHEMA_STRUCTURE.md** - Widget schema structure (group inside fields)

**Bundle Generation Fixes:**
- **FIX_DUPLICATES_AND_EXTRAS.md** - Prevent duplicate module generation

**UI Improvements:**
- **IMPROVEMENT_BUNDLE_PREVIEW.md** - Bundle file preview UI
- **IMPROVEMENT_CARD_SELECTION.md** - Card-based module selection
- **IMPROVEMENT_GROUPED_PREVIEWS.md** - File preview grouping

**Bug Fixes:**
- **BUGFIX_UNDEFINED_SCSS.md** - Undefined bug fix

**Reviews:**
- **COMPREHENSIVE_REVIEW.md** - Comprehensive review
- **MCP_GENERATION_REVIEW.md** - MCP generation review

## How Documentation is Used

### By MCP Server

The MCP server (`mcp-server/generator.js`) loads documentation using `loadPromptTemplate()`:

```javascript
// Line 304-308: Load prompts
const commonRules = loadPromptTemplate('prompts/common-rules.md');
const typePrompt = loadPromptTemplate(`prompts/${type}-prompt.md`);

// Line 283: Load BEM guidance (conditional)
const bemGuidance = loadPromptTemplate('bem-guidance.md');

// Line 398: Load frontend JS pattern (conditional)
const frontendPattern = loadPromptTemplate('FRONTEND-JAVASCRIPT-PATTERN.md');

// Line 579: Load parse request (chat mode)
const parseRequest = loadPromptTemplate('prompts/parse-request.md');
```

### By Developers

Reference documentation helps developers:
- Understand features (AUTO-REGISTRATION.md, AUTO-SCSS.md)
- See relationship examples (RELATIONSHIP-PATTERN.md)
- Navigate documentation (DOCS_MAP.md)
- Understand integration (INTEGRATION.md)

### By Maintainers

Changelog documentation helps maintainers:
- Track what fixes have been applied
- Understand the evolution of generation quality
- Reference historical decisions

## Updating Documentation

### To Update Active MCP Documentation:

1. Edit files in `server/apostrophe-docs/prompts/`
2. Changes take effect immediately (MCP loads from disk)
3. Test with the UI to verify changes

### To Add Reference Documentation:

1. Add new .md files to `docs/reference/`
2. Update this README with a description

### To Add Changelog Entries:

1. Add new changelog .md files to `docs/changelog/`
2. Include what was changed and where it's now documented
3. Update this README

## Verification

All FIX/IMPROVEMENT documentation has been verified to ensure information is preserved in active MCP prompts. See:
- `docs/reference/SAFE_CLEANUP_VERIFICATION.md`
- `docs/reference/COMPLETE_DOCUMENTATION_AUDIT.md`
