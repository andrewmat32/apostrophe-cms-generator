# Prompt Templates

This directory contains prompt templates used by the MCP server to generate Apostrophe modules with Claude AI.

## Files

### Core Templates

1. **`common-rules.md`** - Rules that apply to ALL module types
   - ESM syntax requirements
   - Output format specification
   - JSON structure
   - No extra features policy

2. **`bem-guidance.md`** - BEM CSS naming methodology
   - Block, Element, Modifier patterns
   - Common element names
   - Modifier conventions
   - SCSS generation info

### Module-Specific Templates

3. **`widget-prompt.md`** - Widget generation prompt
   - Widget schema structure
   - Template requirements
   - Field types
   - Example widgets

4. **`page-prompt.md`** - Page generation prompt
   - Page schema structure
   - Template requirements (extends layout.html)
   - Area patterns
   - Example pages

5. **`piece-prompt.md`** - Piece type generation prompt
   - Piece schema structure
   - Built-in fields (title, slug)
   - Common piece types (blog, product, event)
   - No template needed

## Template Variables

Templates use placeholder variables that are replaced at runtime:

| Variable | Description | Example |
|----------|-------------|---------|
| `{MODULE_NAME}` | Kebab-case module name | `shopping-cart` |
| `{MODULE_LABEL}` | Human-readable label | `Shopping Cart` |
| `{MODULE_TYPE}` | Module type | `widget`, `page`, `piece` |
| `{CORRECT_PATH}` | File path | `modules/widgets/shopping-cart` |
| `{USER_INSTRUCTIONS}` | User's description | Custom field requirements |
| `{BEM_GUIDANCE}` | BEM methodology guide | Inserted if includeBemStyles=true |
| `{BEM_CLASSES}` | BEM class instructions | Usage notes |
| `{BUNDLE_CONTEXT}` | Bundle-specific text | For bundles only |
| `{BUNDLE_RELATIONSHIP}` | Piece relationship code | For bundle widgets/pages |
| `{BUNDLE_TEMPLATES}` | Template requirements | For bundle pages |
| `{EXTEND_TYPE}` | Extend type | `@apostrophecms/page-type` or `@apostrophecms/piece-page-type` |

## How Prompts Are Built

The generator (`mcp-server/generator.js`) assembles prompts by:

1. **Reading base template** for the module type
2. **Reading common rules** and optionally BEM guidance
3. **Substituting variables** with actual values
4. **Adding bundle context** if generating as part of a bundle
5. **Sending to Claude CLI** for generation

## Editing Prompts

To modify generation behavior:

1. Edit the relevant `.md` file
2. Keep the variable placeholders (in `{curly braces}`)
3. Test by generating a module
4. NO code changes needed!

## Example: Adding a New Rule

To add a new rule for all module types:

```markdown
<!-- Edit common-rules.md -->

## CRITICAL RULES

1. ESM ONLY: ...
2. FOLLOW USER INSTRUCTIONS: ...
3. NEW RULE HERE: Always add help text to fields  ← ADD THIS
```

Next generation will include this rule automatically.

## Benefits

- ✅ **Non-developers can improve prompts** - Just edit markdown
- ✅ **Version controlled** - Track changes over time
- ✅ **Module-specific guidance** - Different rules for different types
- ✅ **Easy to test** - Edit and regenerate immediately
- ✅ **No code deployment** - Changes take effect immediately

## Related Files

These prompt templates work with:

- **Pattern files**: `../widgets-patterns.json`, `../pages-patterns.json`, etc.
- **Documentation**: `../RELATIONSHIP-PATTERN.md`, `../AUTO-REGISTRATION.md`, etc.
- **Generator**: `../../../mcp-server/generator.js` (loads and processes these templates)

## Testing Changes

After editing a prompt template:

```bash
# Restart the server
cd /home/andrei/health-check-tool-generator
npm start

# Generate a test module
# Visit http://localhost:3031
# Try generating a widget/page/piece
# Verify the output includes your changes
```

## Best Practices

- Keep prompts concise but complete
- Use examples liberally
- Mark critical requirements with **BOLD** or CAPS
- Test changes with actual generation
- Document why you made changes (commit messages)

## Future Enhancements

Potential improvements:

- Load pattern JSON directly in prompts (currently unused)
- Add conditional sections based on user choices
- Create prompt variants for different experience levels
- A/B test different prompting strategies
