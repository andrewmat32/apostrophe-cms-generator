# MCP Server Quick Start

## ✅ No API Keys Required!

You don't need any API keys to use this MCP server. It runs **locally** and is just a tool that Claude Code can call.

## Installation (Already Done! ✅)

```bash
cd /home/andrei/health-check-tool-generator/mcp-server
npm install  # ✅ Already completed
```

## Testing the MCP Server

Test that it works:

```bash
cd /home/andrei/health-check-tool-generator/mcp-server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js
```

You should see a JSON response with 4 tools listed.

## Connecting to Claude Code

### Method 1: Using airis-mcp-gateway (Recommended)

1. **Check if you have airis-mcp-gateway installed:**
   ```bash
   which airis-mcp-gateway
   ```

2. **If installed, add this to your gateway config:**

   The config is usually at `~/.config/airis-mcp-gateway/config.json` or similar.

   Add this entry:
   ```json
   {
     "mcpServers": {
       "apostrophe-generator": {
         "command": "node",
         "args": ["/home/andrei/health-check-tool-generator/mcp-server/index.js"],
         "env": {}
       }
     }
   }
   ```

3. **Restart airis-mcp-gateway**

### Method 2: Direct MCP Connection (If no gateway)

Claude Code can connect directly to MCP servers. Check your Claude Code documentation for how to configure MCP servers.

Typical configuration locations:
- `~/.config/claude-code/mcp.json`
- Or in Claude Code settings UI

Use this config:
```json
{
  "mcpServers": {
    "apostrophe-generator": {
      "command": "node",
      "args": ["/home/andrei/health-check-tool-generator/mcp-server/index.js"]
    }
  }
}
```

## Available Tools in Claude Code

Once connected, you can use these tools in your conversations:

### 1. **list_apostrophe_projects**
```
You: Show me my Apostrophe projects
Claude: [calls list_apostrophe_projects]
Response: List of projects with paths
```

### 2. **analyze_project_structure**
```
You: Analyze the wedive project structure
Claude: [calls analyze_project_structure with projectId: "wedive"]
Response: Shows all widgets, pages, and pieces in the project
```

### 3. **validate_module_name**
```
You: Check if "shopping-cart" is a valid widget name for wedive
Claude: [calls validate_module_name]
Response: Validation result (valid/invalid, exists/available)
```

### 4. **get_bem_structure**
```
You: Show me the BEM class structure for a shopping-cart widget
Claude: [calls get_bem_structure]
Response: Complete BEM class list with example HTML
```

## Example Conversation

```
You: I want to create a new widget for my wedive project.
     Can you help me check what's available?

Claude: I'll analyze your wedive project structure.
        [calls analyze_project_structure]

        Your project has:
        - Widgets: hero-banner, menu-widget, ...
        - Pages: article-page, ...
        - Pieces: article, author, ...

        What kind of widget do you want to create?

You: A shopping cart widget

Claude: Let me validate that name.
        [calls validate_module_name with "shopping-cart", "widget"]

        ✅ "shopping-cart" is valid and available!

        Would you like me to show you the BEM structure for it?

You: Yes please

Claude: [calls get_bem_structure]
        Here's the BEM class structure you should use:
        - .shopping-cart
        - .shopping-cart__container
        - .shopping-cart__header
        ...
```

## Advantages of MCP

**Before (HTTP Server):**
- Had to start a web server
- Port conflicts
- Manual JSON parsing
- Unstructured responses

**Now (MCP Server):**
- ✅ Direct integration with Claude Code
- ✅ Structured, type-safe tools
- ✅ No web server needed
- ✅ Better error handling
- ✅ Auto-discovery by Claude

## What's Next?

This is **Phase 1** - basic analysis tools.

**Phase 2** will add:
- Actual code generation (still needs Claude CLI)
- File writing tools
- Module registration automation

The advantage of MCP is that Claude Code can **intelligently use these tools** without you having to manually call a web API!

## Troubleshooting

**Q: Do I need Claude API keys?**
A: No! This MCP server doesn't need any keys. It just reads your local Apostrophe projects.

**Q: How do I know if it's working?**
A: Run the test command above. If you see JSON output with tool definitions, it's working.

**Q: Claude Code doesn't see the tools**
A: Make sure:
1. MCP server is in your config
2. Path is absolute (not relative)
3. You restarted Claude Code after config changes

**Q: Can I use this with the web UI?**
A: The web UI (`npm start` in the main directory) still works! The MCP server is an additional way to use the generator through Claude Code directly.
