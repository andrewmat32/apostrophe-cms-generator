#!/bin/bash

# ============================================================================
# Apostrophe Code Generator - Installation Script
# ============================================================================
# This script installs all dependencies for the Apostrophe Code Generator
# including the main application and the MCP server component.
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}"
echo "============================================================================"
echo "       Apostrophe Code Generator - Installation"
echo "============================================================================"
echo -e "${NC}"

# ----------------------------------------------------------------------------
# Check Prerequisites
# ----------------------------------------------------------------------------
echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed.${NC}"
    echo "Please install Node.js v18 or higher from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}ERROR: Node.js version 18 or higher is required.${NC}"
    echo "Current version: $(node -v)"
    echo "Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}  Node.js $(node -v) found${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}  npm $(npm -v) found${NC}"

# Check for Claude Code CLI
if ! command -v claude &> /dev/null; then
    echo -e "${RED}ERROR: Claude Code CLI is not installed.${NC}"
    echo ""
    echo "Claude Code is required for AI-powered code generation."
    echo "Install it with:"
    echo -e "  ${BLUE}npm install -g @anthropic-ai/claude-code${NC}"
    echo ""
    echo "Then configure it with:"
    echo -e "  ${BLUE}claude configure${NC}"
    echo ""
    echo "You'll need an Anthropic API key from: https://console.anthropic.com/"
    exit 1
fi

echo -e "${GREEN}  Claude Code CLI found${NC}"

# ----------------------------------------------------------------------------
# Install Dependencies
# ----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Installing main application dependencies...${NC}"
cd "$SCRIPT_DIR"
npm install

echo ""
echo -e "${YELLOW}Installing MCP server dependencies...${NC}"
cd "$SCRIPT_DIR/mcp-server"
npm install

# ----------------------------------------------------------------------------
# Success Message
# ----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}============================================================================${NC}"
echo -e "${GREEN}       Installation Complete!${NC}"
echo -e "${GREEN}============================================================================${NC}"
echo ""
echo -e "To start the application:"
echo -e "  ${BLUE}cd $SCRIPT_DIR${NC}"
echo -e "  ${BLUE}npm start${NC}"
echo ""
echo -e "Then open your browser to: ${BLUE}http://localhost:3031${NC}"
echo ""

# ----------------------------------------------------------------------------
# Claude Code Integration (Optional)
# ----------------------------------------------------------------------------
echo -e "${YELLOW}Would you like to configure Claude Code MCP integration? (y/n)${NC}"
read -r CONFIGURE_MCP

if [[ "$CONFIGURE_MCP" =~ ^[Yy]$ ]]; then
    MCP_PATH="$SCRIPT_DIR/mcp-server"

    echo ""
    echo -e "${BLUE}MCP Server Configuration${NC}"
    echo "========================="
    echo ""
    echo "Add the following to your Claude Code settings file:"
    echo ""
    echo -e "${YELLOW}Location:${NC}"
    echo "  - Linux/macOS: ~/.claude/settings.json"
    echo "  - Windows: %USERPROFILE%\\.claude\\settings.json"
    echo ""
    echo -e "${YELLOW}Configuration to add:${NC}"
    echo ""
    cat << EOF
{
  "mcpServers": {
    "apostrophe-generator": {
      "command": "node",
      "args": ["$MCP_PATH/index.js"],
      "env": {},
      "description": "Apostrophe CMS code generation tools"
    }
  }
}
EOF
    echo ""
    echo -e "${GREEN}Copy the above configuration to your Claude settings.${NC}"
fi

echo ""
echo -e "${GREEN}Setup complete! Happy coding!${NC}"
echo ""
