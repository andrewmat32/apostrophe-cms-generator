# Generation Checklist

Before returning your JSON response, verify ALL of these:

## Code Quality
- [ ] Using ESM syntax (`export default`) NOT CommonJS (`module.exports`)
- [ ] All field names match USER INSTRUCTIONS exactly
- [ ] NO extra "helpful" fields added
- [ ] NO placeholder or demo content

## File Paths
- [ ] File paths match `{CORRECT_PATH}` exactly
- [ ] Using correct subdirectory (widgets/, pages/, or pieces/)
- [ ] Template files in views/ subdirectory (if applicable)

## Template Requirements
- [ ] NO `<script>` tags in templates
- [ ] NO `<style>` tags in templates
- [ ] NO inline event handlers (`onclick`, `onchange`, etc.)
- [ ] HTML displays ONLY schema fields (nothing extra)

## Piece-Specific Rules
- [ ] If generating piece: NO template files (pieces have NO views/)
- [ ] If generating piece: NO SCSS files (pieces are backend-only)
- [ ] If generating piece: Return ONLY index.js

## Output Format
- [ ] Valid JSON (no syntax errors)
- [ ] NO markdown code blocks (```json or ```)
- [ ] Starts with `{` immediately (no text before)
- [ ] Has required structure: `{ "files": [...] }`

## Widget Player Pattern (if interactive widget)
- [ ] Frontend JS in ui/src/index.js (NOT in template)
- [ ] Uses widget player pattern (`apos.util.widgetPlayers`)
- [ ] Template has data-{widget-name}-widget attribute
- [ ] Imports only available functions (checked via MCP tool)
