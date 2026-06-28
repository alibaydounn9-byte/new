// Roblox Open Cloud API client
// Docs: https://create.roblox.com/docs/cloud/open-cloud

const BASE = "https://apis.roblox.com";

export interface RobloxConfig {
  apiKey: string;
  universeId: string;
}

function cfg(): RobloxConfig {
  const apiKey = process.env.ROBLOX_API_KEY;
  const universeId = process.env.ROBLOX_UNIVERSE_ID;
  if (!apiKey) throw new Error("ROBLOX_API_KEY env var is not set");
  if (!universeId) throw new Error("ROBLOX_UNIVERSE_ID env var is not set");
  return { apiKey, universeId };
}

// ── Messaging Service ────────────────────────────────────────────────────────

export async function publishMessage(topic: string, message: string): Promise<void> {
  const { apiKey, universeId } = cfg();
  const url = `${BASE}/messaging-service/v1/universes/${universeId}/topics/${encodeURIComponent(topic)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Messaging Service error ${res.status}: ${body}`);
  }
}

// ── DataStore (for reading back results) ────────────────────────────────────

export async function datastoreGet(
  datastoreName: string,
  key: string
): Promise<string | null> {
  const { apiKey, universeId } = cfg();
  const url =
    `${BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry` +
    `?datastoreName=${encodeURIComponent(datastoreName)}&entryKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { "x-api-key": apiKey },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DataStore GET error ${res.status}: ${body}`);
  }
  return res.text();
}

export async function datastoreSet(
  datastoreName: string,
  key: string,
  value: string
): Promise<void> {
  const { apiKey, universeId } = cfg();
  const url =
    `${BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry` +
    `?datastoreName=${encodeURIComponent(datastoreName)}&entryKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(value),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DataStore SET error ${res.status}: ${body}`);
  }
}

export async function datastoreDelete(
  datastoreName: string,
  key: string
): Promise<void> {
  const { apiKey, universeId } = cfg();
  const url =
    `${BASE}/datastores/v1/universes/${universeId}/standard-datastores/datastore/entries/entry` +
    `?datastoreName=${encodeURIComponent(datastoreName)}&entryKey=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`DataStore DELETE error ${res.status}: ${body}`);
  }
}

// ── Universe info ─────────────────────────────────────────────────────────────

export interface UniverseInfo {
  id: number;
  name: string;
  description: string;
  creatorType: string;
  creatorName: string;
  playing: number;
  visits: number;
  maxPlayers: number;
  created: string;
  updated: string;
  isActive: boolean;
}

export async function getUniverseInfo(): Promise<UniverseInfo> {
  const { apiKey, universeId } = cfg();
  const url = `${BASE}/cloud/v2/universes/${universeId}`;
  const res = await fetch(url, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Universe info error ${res.status}: ${body}`);
  }
  return res.json() as Promise<UniverseInfo>;
}

// ── Place publishing ──────────────────────────────────────────────────────────

export async function listPlaces(): Promise<{ id: number; name: string }[]> {
  const { apiKey, universeId } = cfg();
  const url = `${BASE}/cloud/v2/universes/${universeId}/places?maxPageSize=50`;
  const res = await fetch(url, {
    headers: { "x-api-key": apiKey },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`List places error ${res.status}: ${body}`);
  }
  const data = (await res.json()) as { places: { id: number; displayName: string }[] };
  return (data.places ?? []).map((p) => ({ id: p.id, name: p.displayName }));
}

// ── Script execution via Messaging + DataStore poll ───────────────────────────

const EXEC_TOPIC = "mcp-execute";
const RESULT_STORE = "McpResults";
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 15_000;

export async function executeScript(
  script: string,
  context: string
): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Clear any stale result
  await datastoreDelete(RESULT_STORE, jobId);

  // Send execution request to the game server
  await publishMessage(
    EXEC_TOPIC,
    JSON.stringify({ jobId, script, context })
  );

  // Poll DataStore for the result written by the in-game listener
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const raw = await datastoreGet(RESULT_STORE, jobId);
    if (raw !== null) {
      await datastoreDelete(RESULT_STORE, jobId).catch(() => {});
      try {
        const parsed = JSON.parse(raw) as { ok: boolean; output: string };
        return parsed.output;
      } catch {
        return raw;
      }
    }
  }

  throw new Error(
    `Script execution timed out after ${POLL_TIMEOUT_MS / 1000}s. ` +
      "Make sure the in-game listener Script is running (see README)."
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
