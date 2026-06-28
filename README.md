# roblox-executor-mcp

An MCP (Model Context Protocol) server that exposes Roblox script execution tools to Claude Code and other MCP-compatible AI clients.

## Tools

| Tool | Description |
|------|-------------|
| `execute_script` | Execute a Luau script in the Roblox environment |
| `validate_script` | Validate Luau syntax without executing |
| `get_services` | List available Roblox services |
| `get_script_template` | Get a starter template for LocalScript / Script / ModuleScript |

## Requirements

- Node.js ≥ 18
- pnpm (or npm / yarn)

## Setup

### 1. Clone and build

```bash
git clone https://github.com/alibaydounn9-byte/new.git
cd new/roblox-executor-mcp
pnpm install
pnpm run build
```

### 2. Add the MCP server

Run this command in your terminal (replace the path with the actual location):

```bash
claude mcp add roblox-executor-mcp -- node /path/to/roblox-executor-mcp/dist/index.js
```

This adds the server to your local project config (`.claude/settings.local.json`). To add it globally instead:

```bash
claude mcp add --global roblox-executor-mcp -- node /path/to/roblox-executor-mcp/dist/index.js
```

### 3. Verify

Start Claude Code and run:

```
/mcp
```

You should see `roblox-executor-mcp` listed with a status of `connected`. If it shows `failed`:

- Make sure you ran `pnpm install && pnpm run build` first
- Check that the path to `dist/index.js` is correct
- Ensure Node.js ≥ 18 is installed

## Managing the server

```bash
# List configured MCP servers
claude mcp list

# Remove the server
claude mcp remove roblox-executor-mcp
```

## Project structure

```
roblox-executor-mcp/
├── src/
│   └── index.ts      # MCP server entry point
├── dist/             # Compiled output (after build)
├── package.json
└── tsconfig.json
```
