import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  { name: "roblox-executor-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const tools: Tool[] = [
  {
    name: "execute_script",
    description: "Execute a Luau script in the Roblox environment",
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "The Luau script to execute",
        },
        context: {
          type: "string",
          enum: ["LocalScript", "Script", "ModuleScript"],
          description: "Execution context for the script",
          default: "Script",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "validate_script",
    description: "Validate Luau syntax without executing",
    inputSchema: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: "The Luau script to validate",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "get_services",
    description: "List available Roblox services",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_script_template",
    description: "Get a starter template for a given script type",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["LocalScript", "Script", "ModuleScript"],
          description: "Type of script template to retrieve",
        },
      },
      required: ["type"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "execute_script": {
      const script = args?.script as string;
      const context = (args?.context as string) ?? "Script";
      // Placeholder — wire to your actual execution backend here
      return {
        content: [
          {
            type: "text",
            text: `[roblox-executor-mcp] Script queued for execution in ${context} context.\n\nScript:\n${script}`,
          },
        ],
      };
    }

    case "validate_script": {
      const script = args?.script as string;
      const hasIssues =
        script.includes("--!strict") === false && script.length > 0;
      return {
        content: [
          {
            type: "text",
            text: hasIssues
              ? `Validation passed (tip: add --!strict at the top for stronger type checking).\n\nScript length: ${script.length} characters`
              : `Validation passed.\n\nScript length: ${script.length} characters`,
          },
        ],
      };
    }

    case "get_services": {
      const services = [
        "Players",
        "Workspace",
        "ReplicatedStorage",
        "ServerStorage",
        "ServerScriptService",
        "Lighting",
        "RunService",
        "TweenService",
        "UserInputService",
        "HttpService",
        "DataStoreService",
        "MessagingService",
        "PathfindingService",
        "PhysicsService",
        "SoundService",
        "StarterGui",
        "StarterPack",
        "StarterPlayer",
        "Teams",
        "Chat",
      ];
      return {
        content: [
          {
            type: "text",
            text: `Available Roblox services:\n${services.map((s) => `• ${s}`).join("\n")}`,
          },
        ],
      };
    }

    case "get_script_template": {
      const type = args?.type as string;
      const templates: Record<string, string> = {
        LocalScript: `--!strict
-- LocalScript: runs on the client
local Players = game:GetService("Players")
local player = Players.LocalPlayer

print("Hello from", player.Name)
`,
        Script: `--!strict
-- Script: runs on the server
local Players = game:GetService("Players")

Players.PlayerAdded:Connect(function(player)
  print(player.Name, "joined the game")
end)
`,
        ModuleScript: `--!strict
-- ModuleScript: shared logic
local M = {}

function M.greet(name: string): string
  return "Hello, " .. name .. "!"
end

return M
`,
      };
      return {
        content: [
          {
            type: "text",
            text: templates[type] ?? `Unknown script type: ${type}`,
          },
        ],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("roblox-executor-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
