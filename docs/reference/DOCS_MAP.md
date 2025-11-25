# Documentation Dependency Map

This file maps which documentation files are loaded during code generation.

## Always Loaded (for all generations)

### Core Rules
- **`prompts/common-rules.md`** - Universal rules for all module types
  - ESM syntax requirements
  - Output format specification
  - No inline scripts/styles policy

## Type-Specific (loaded by module type)

### Widgets
- **`prompts/widget-prompt.md`** - Widget generation instructions
  - Schema structure (extend @apostrophecms/widget-type)
  - Template requirements (views/widget.html)
  - Field types available
  - Example widgets

### Pages
- **`prompts/page-prompt.md`** - Page generation instructions
  - Schema structure (extend @apostrophecms/page-type or piece-page-type)
  - Template requirements (views/page.html or index.html + show.html)
  - Area fields guidance
  - Example pages

### Pieces
- **`prompts/piece-prompt.md`** - Piece generation instructions
  - Schema structure (extend @apostrophecms/piece-type)
  - Built-in fields (title, slug, published)
  - NO templates for pieces!
  - Example piece types (blog, product, event)

## Conditional (loaded only when needed)

### BEM Styles
**When**: `includeBemStyles=true`
**File**: `prompts/bem-guidance.md`
**Purpose**: BEM CSS naming methodology and class structure

### Frontend JavaScript
**When**: User mentions interactive keywords (accordion, slider, tab, modal, etc.)
**File**: `prompts/frontend-js/widget-player.md` (optimized)
**Old File**: `FRONTEND-JAVASCRIPT-PATTERN.md` (867 lines - being split)
**Purpose**: Widget player pattern for interactive widgets

### Parse Request
**When**: Chat mode / natural language generation
**File**: `prompts/parse-request.md`
**Purpose**: Extract module type, name, and field requirements from natural language

## Reference Only (not loaded by generator)

These files exist for developer reference and documentation:

- **`RELATIONSHIP-PATTERN.md`** - How to implement piece relationships
- **`AUTO-REGISTRATION.md`** - How auto-registration works
- **`AUTO-SCSS.md`** - How SCSS generation works
- **`INTEGRATION.md`** - Setup and integration guide
- **`README.md`** - Documentation overview

## Loading Flow

```
buildPrompt() in generator.js
    ↓
Load common-rules.md (always)
    ↓
Load type-specific prompt (widget/page/piece)
    ↓
Conditional: Load bem-guidance.md? (if includeBemStyles)
    ↓
Conditional: Load frontend-js docs? (if interactive keywords detected)
    ↓
Conditional: Load bundle-specific sections? (if isPartOfBundle)
    ↓
Replace all placeholders ({MODULE_NAME}, {USER_INSTRUCTIONS}, etc.)
    ↓
Send to Claude CLI
```

## Optimization Notes

### Current State (Before)
- `FRONTEND-JAVASCRIPT-PATTERN.md`: 867 lines (loaded even when not needed)
- Total prompt size: ~1500-2000 lines per generation
- Loading time: Reads 4-5 files per generation

### Optimized State (After)
- Frontend JS split into modular files (50-100 lines each)
- Only load what's needed (widget-player.md when interactive)
- Total prompt size: ~800-1200 lines per generation
- Loading time: Same (4-5 files) but smaller file sizes

### Benefits
1. **Faster generation** - Less text to process
2. **Easier maintenance** - Smaller, focused files
3. **Better reusability** - Shared snippets across prompts
4. **Clearer structure** - Each file has one purpose

## Version Control

| File | Version | Last Updated | Status |
|------|---------|--------------|--------|
| common-rules.md | 1.0 | 2025-11-17 | Stable |
| widget-prompt.md | 1.0 | 2025-11-17 | Stable |
| page-prompt.md | 1.0 | 2025-11-17 | Stable |
| piece-prompt.md | 1.0 | 2025-11-17 | Stable |
| bem-guidance.md | 1.0 | 2025-11-17 | Stable |
| FRONTEND-JS (old) | 1.0 | 2025-11-17 | Being Split |
| frontend-js/*.md | 2.0 | 2025-11-17 | New (Optimized) |

## Future Enhancements

- [ ] Add validation checklist sections to all prompts
- [ ] Create shared snippets for repeated content
- [ ] Add common mistakes section to each prompt
- [ ] Create interactive prompt builder UI
- [ ] Add A/B testing for prompt variations
