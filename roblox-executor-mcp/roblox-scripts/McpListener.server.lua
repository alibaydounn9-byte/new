--!strict
-- McpListener.server.lua
-- Place this Script inside ServerScriptService in your Roblox game.
--
-- It listens on the "mcp-execute" Messaging topic, runs the received
-- Luau code with loadstring(), and writes the result back to the
-- "McpResults" DataStore so the MCP server can poll it.
--
-- Requirements:
--   • Enable "Allow HTTP Requests" in Game Settings → Security
--   • Enable "Enable Studio Access to API Services" if testing in Studio
--   • Your Open Cloud API key must have DataStore + Messaging read/write
--     scopes for this universe.

local MessagingService = game:GetService("MessagingService")
local DataStoreService = game:GetService("DataStoreService")

local TOPIC = "mcp-execute"
local STORE_NAME = "McpResults"

local resultStore = DataStoreService:GetDataStore(STORE_NAME)

local function writeResult(jobId: string, ok: boolean, output: string)
	local payload = game:GetService("HttpService"):JSONEncode({ ok = ok, output = output })
	local success, err = pcall(function()
		resultStore:SetAsync(jobId, payload)
	end)
	if not success then
		warn("[McpListener] Failed to write result for", jobId, "-", err)
	end
end

local function handleMessage(message: { Data: string })
	local ok, parsed = pcall(function()
		return game:GetService("HttpService"):JSONDecode(message.Data)
	end)
	if not ok or type(parsed) ~= "table" then
		warn("[McpListener] Bad message payload:", message.Data)
		return
	end

	local jobId = tostring(parsed.jobId or "")
	local script = tostring(parsed.script or "")

	if jobId == "" or script == "" then
		warn("[McpListener] Missing jobId or script in payload")
		return
	end

	print("[McpListener] Executing job", jobId)

	local fn, compileErr = loadstring(script)
	if not fn then
		writeResult(jobId, false, "Compile error: " .. tostring(compileErr))
		return
	end

	-- Capture output via print override
	local outputLines: { string } = {}
	local origPrint = print
	local env = setmetatable({
		print = function(...)
			local parts: { string } = {}
			for i = 1, select("#", ...) do
				parts[i] = tostring(select(i, ...))
			end
			local line = table.concat(parts, "\t")
			table.insert(outputLines, line)
			origPrint(...)
		end,
	}, { __index = getfenv(0) })

	setfenv(fn, env)

	local runOk, runErr = pcall(fn)
	if not runOk then
		table.insert(outputLines, "Runtime error: " .. tostring(runErr))
	end

	local output = #outputLines > 0 and table.concat(outputLines, "\n") or "(no output)"
	writeResult(jobId, runOk, output)
	print("[McpListener] Job", jobId, "complete.")
end

local subOk, subErr = pcall(function()
	MessagingService:SubscribeAsync(TOPIC, handleMessage)
end)

if subOk then
	print("[McpListener] Subscribed to topic:", TOPIC)
else
	warn("[McpListener] Failed to subscribe:", subErr)
end
