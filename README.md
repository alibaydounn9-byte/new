# roblox-executor-mcp

An MCP server that connects Claude Code to a **live Roblox game** via the
[Open Cloud API](https://create.roblox.com/docs/cloud/open-cloud).
Scripts are dispatched through Messaging Service, executed server-side by a
listener Script, and results are returned through DataStore polling.

## Architecture

```
Claude Code
    │  MCP (stdio)
    ▼
roblox-executor-mcp (Node.js)
    │  Open Cloud REST API (HTTPS)
    ▼
Roblox Messaging Service  ──►  McpListener.server.lua  (inside your game)
                                        │
                          loadstring() executes the script
                                        │
                          DataStore "McpResults"  ◄──  MCP polls for result
```

## Tools

| Tool | Description |
|------|-------------|
| `execute_script` | Execute Luau on the live server; returns stdout |
| `validate_script` | Syntax-check a script locally (no execution) |
| `get_universe_info` | Fetch universe metadata via Open Cloud |
| `list_places` | List all places in the universe |
| `send_message` | Publish a raw payload to any Messaging topic |
| `get_script_template` | Starter template for LocalScript / Script / ModuleScript |

## Requirements

- Node.js ≥ 18
- pnpm (or npm)
- A Roblox account with a game (universe) you own
- An **Open Cloud API key** with these scopes:
  - `universe-messaging-service:publish`
  - `universe-datastores:read`
  - `universe-datastores:write`

## Setup

### 1. Get your credentials

1. Go to [create.roblox.com/credentials](https://create.roblox.com/credentials)
2. Create an API key — enable **Messaging Service** (publish) and
   **DataStores** (read + write) for your universe
3. Note your **Universe ID** (the number in your game's URL on the Creator Hub)

### 2. Set environment variables

```bash
export ROBLOX_API_KEY="your-api-key-here"
export ROBLOX_UNIVERSE_ID="your-universe-id-here"
```

Add these to your shell profile or pass them when registering the MCP server.

### 3. Install the in-game listener

1. Open **Roblox Studio** for your game
2. In **ServerScriptService**, create a new `Script`
3. Paste the contents of `roblox-scripts/McpListener.server.lua`
4. In **Game Settings → Security**, enable:
   - ✅ Allow HTTP Requests
   - ✅ Enable Studio Access to API Services (for Studio testing)
5. Publish and start a server

### 4. Build and register the MCP server

```bash
git clone https://github.com/alibaydounn9-byte/new.git
cd new/roblox-executor-mcp
pnpm install
pnpm run build

# Register with Claude Code (replace path)
claude mcp add roblox-executor-mcp \
  -e ROBLOX_API_KEY="your-key" \
  -e ROBLOX_UNIVERSE_ID="your-universe-id" \
  -- node /path/to/roblox-executor-mcp/dist/index.js
```

### 5. Verify

Start Claude Code and run:

```
/mcp
```

`roblox-executor-mcp` should show `connected`. Then ask Claude:

> "Use execute_script to print all player names in the game"

## Managing the server

```bash
claude mcp list
claude mcp remove roblox-executor-mcp
```

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ROBLOX_API_KEY env var is not set` | Pass `-e` flags to `claude mcp add` or export the vars before starting Claude |
| `Messaging Service error 403` | API key missing `universe-messaging-service:publish` scope |
| `Script execution timed out` | McpListener Script not running — check the game server is live and the Script is in ServerScriptService |
| `Compile error: …` | Syntax error in your Luau script |

## Project structure

```
roblox-executor-mcp/
├── src/
│   ├── index.ts          # MCP server + tool handlers
│   └── roblox.ts         # Open Cloud API client
├── roblox-scripts/
│   └── McpListener.server.lua  # Drop this into ServerScriptService
├── dist/                 # Compiled output (after build)
├── package.json
└── tsconfig.json
```
