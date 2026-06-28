import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import {
  executeScript,
  getUniverseInfo,
  listPlaces,
  publishMessage,
} from "./roblox.js";

const server = new Server(
  { name: "roblox-executor-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const tools: Tool[] = [
  {
    name: "execute_script",
    description:
      "Execute a Luau script on the live Roblox game server via Open Cloud Messaging. " +
      "Requires ROBLOX_API_KEY and ROBLOX_UNIVERSE_ID env vars, and the listener Script inside the game.",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "Luau script to execute" },
        context: {
          type: "string",
          enum: ["LocalScript", "Script", "ModuleScript"],
          description: "Execution context hint (informational; server-side only)",
          default: "Script",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "validate_script",
    description: "Check Luau script for obvious issues without executing it",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "Luau script to validate" },
      },
      required: ["script"],
    },
  },
  {
    name: "get_universe_info",
    description: "Return metadata about the configured Roblox universe/game",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_places",
    description: "List all places inside the configured Roblox universe",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "send_message",
    description: "Publish a raw message to an Open Cloud Messaging topic",
    inputSchema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Messaging topic name" },
        message: { type: "string", description: "Message payload (string)" },
      },
      required: ["topic", "message"],
    },
  },
  {
    name: "get_script_template",
    description: "Get a starter Luau template",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["LocalScript", "Script", "ModuleScript"],
        },
      },
      required: ["type"],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "execute_script": {
        const script = args?.script as string;
        const context = (args?.context as string) ?? "Script";
        const output = await executeScript(script, context);
        return { content: [{ type: "text", text: output }] };
      }

      case "validate_script": {
        const script = args?.script as string;
        const issues: string[] = [];
        if (!script.trimStart().startsWith("--!strict")) {
          issues.push("Tip: add --!strict at the top for stronger type checking.");
        }
        const balanced = checkBalanced(script);
        if (balanced) issues.push(balanced);
        const msg =
          issues.length === 0
            ? `No issues found. (${script.length} chars)`
            : issues.join("\n");
        return { content: [{ type: "text", text: msg }] };
      }

      case "get_universe_info": {
        const info = await getUniverseInfo();
        const text = [
          `Name:        ${info.name}`,
          `ID:          ${info.id}`,
          `Creator:     ${info.creatorName} (${info.creatorType})`,
          `Active:      ${info.isActive}`,
          `Playing now: ${info.playing}`,
          `Total visits:${info.visits}`,
          `Max players: ${info.maxPlayers}`,
          `Created:     ${info.created}`,
          `Updated:     ${info.updated}`,
          `Description: ${info.description || "(none)"}`,
        ].join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "list_places": {
        const places = await listPlaces();
        if (places.length === 0) {
          return { content: [{ type: "text", text: "No places found." }] };
        }
        const text = places.map((p) => `• [${p.id}] ${p.name}`).join("\n");
        return { content: [{ type: "text", text }] };
      }

      case "send_message": {
        const topic = args?.topic as string;
        const message = args?.message as string;
        await publishMessage(topic, message);
        return {
          content: [
            { type: "text", text: `Message published to topic "${topic}".` },
          ],
        };
      }

      case "get_script_template": {
        const type = args?.type as string;
        const templates: Record<string, string> = {
          LocalScript: `--!strict
local Players = game:GetService("Players")
local player = Players.LocalPlayer
print("Hello from", player.Name)
`,
          Script: `--!strict
local Players = game:GetService("Players")
Players.PlayerAdded:Connect(function(player)
  print(player.Name, "joined")
end)
`,
          ModuleScript: `--!strict
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { content: [{ type: "text", text: `Error: ${msg}` }], isError: true };
  }
});

function checkBalanced(script: string): string | null {
  let depth = 0;
  for (const ch of script) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (depth < 0) return "Unbalanced brackets detected.";
  }
  if (depth !== 0) return "Unbalanced brackets detected.";
  return null;
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("roblox-executor-mcp running (Open Cloud connected)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
