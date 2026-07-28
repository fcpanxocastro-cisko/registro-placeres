type PresaveSession = {
  source: string;
  createdAt: string;
  confirmedAt?: string;
  usedAt?: string;
};

export type Registration = {
  id: string;
  name: string;
  email: string;
  source: string;
  createdAt: string;
};

type MemoryStore = {
  strings: Map<string, string>;
  counters: Map<string, number>;
  hashes: Map<string, Map<string, number>>;
  lists: Map<string, string[]>;
};

const globalStore = globalThis as typeof globalThis & { __placeresStore?: MemoryStore };

function memoryStore() {
  globalStore.__placeresStore ??= {
    strings: new Map(),
    counters: new Map(),
    hashes: new Map(),
    lists: new Map(),
  };
  return globalStore.__placeresStore;
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis<T>(command: Array<string | number>): Promise<T> {
  const config = redisConfig();
  if (!config) throw new Error("REDIS_NOT_CONFIGURED");
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`REDIS_${response.status}`);
  const payload = await response.json() as { result: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result;
}

function useMemory() {
  return !redisConfig() && process.env.NODE_ENV !== "production";
}

async function getString(key: string) {
  if (useMemory()) return memoryStore().strings.get(key) ?? null;
  return redis<string | null>(["GET", key]);
}

async function setString(key: string, value: string, options: Array<string | number> = []) {
  if (useMemory()) {
    const store = memoryStore();
    if (options.includes("NX") && store.strings.has(key)) return null;
    store.strings.set(key, value);
    return "OK";
  }
  return redis<string | null>(["SET", key, value, ...options]);
}

async function deleteKey(key: string) {
  if (useMemory()) return memoryStore().strings.delete(key) ? 1 : 0;
  return redis<number>(["DEL", key]);
}

async function increment(key: string) {
  if (useMemory()) {
    const next = (memoryStore().counters.get(key) ?? 0) + 1;
    memoryStore().counters.set(key, next);
    return next;
  }
  return redis<number>(["INCR", key]);
}

async function getCounter(key: string) {
  if (useMemory()) return memoryStore().counters.get(key) ?? 0;
  return Number((await redis<string | null>(["GET", key])) ?? 0);
}

async function hashIncrement(key: string, field: string) {
  if (useMemory()) {
    const hash = memoryStore().hashes.get(key) ?? new Map<string, number>();
    hash.set(field, (hash.get(field) ?? 0) + 1);
    memoryStore().hashes.set(key, hash);
    return;
  }
  await redis<number>(["HINCRBY", key, field, 1]);
}

async function hashEntries(key: string) {
  if (useMemory()) {
    return [...(memoryStore().hashes.get(key) ?? new Map()).entries()]
      .map(([source, registrations]) => ({ source, registrations }));
  }
  const values = await redis<string[]>(["HGETALL", key]);
  const result: Array<{ source: string; registrations: number }> = [];
  for (let index = 0; index < values.length; index += 2) {
    result.push({ source: values[index], registrations: Number(values[index + 1] || 0) });
  }
  return result.sort((a, b) => b.registrations - a.registrations);
}

async function listPush(key: string, value: string) {
  if (useMemory()) {
    const list = memoryStore().lists.get(key) ?? [];
    list.unshift(value);
    memoryStore().lists.set(key, list);
    return list.length;
  }
  return redis<number>(["LPUSH", key, value]);
}

async function listRange(key: string, start: number, end: number) {
  if (useMemory()) return (memoryStore().lists.get(key) ?? []).slice(start, end < 0 ? undefined : end + 1);
  return redis<string[]>(["LRANGE", key, start, end]);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function isAdmin(request: Request) {
  const supplied = request.headers.get("x-admin-key") || "";
  return Boolean(process.env.ADMIN_KEY && supplied && supplied === process.env.ADMIN_KEY);
}

export async function startPresave(source: string) {
  const token = crypto.randomUUID();
  const session: PresaveSession = { source, createdAt: new Date().toISOString() };
  await setString(`placeres:presave:${token}`, JSON.stringify(session), ["EX", 7200]);
  await increment("placeres:metric:presave_clicks");
  return token;
}

export async function confirmPresave(token: string) {
  const raw = await getString(`placeres:presave:${token}`);
  if (!raw) return false;
  const session = JSON.parse(raw) as PresaveSession;
  if (session.usedAt || Date.now() - new Date(session.createdAt).getTime() > 7_200_000) return false;
  session.confirmedAt = new Date().toISOString();
  await setString(`placeres:presave:${token}`, JSON.stringify(session), ["EX", 7200]);
  return true;
}

export async function trackEvent(eventType: string) {
  await increment(`placeres:metric:${eventType}`);
}

export async function createRegistration(input: Omit<Registration, "id" | "createdAt"> & { presaveToken: string }) {
  const sessionKey = `placeres:presave:${input.presaveToken}`;
  const raw = await getString(sessionKey);
  if (!raw) return { status: "presave" as const };
  const session = JSON.parse(raw) as PresaveSession;
  if (!session.confirmedAt || session.usedAt) return { status: "presave" as const };

  const emailKey = `placeres:email:${await sha256(input.email)}`;
  const claimed = await setString(emailKey, "1", ["NX"]);
  if (!claimed) return { status: "duplicate" as const };

  const registration: Registration = {
    id: crypto.randomUUID(),
    name: input.name,
    email: input.email,
    source: input.source,
    createdAt: new Date().toISOString(),
  };
  try {
    await listPush("placeres:registrations", JSON.stringify(registration));
    await increment("placeres:metric:registrations");
    await hashIncrement("placeres:registration_sources", input.source);
    session.usedAt = new Date().toISOString();
    await setString(sessionKey, JSON.stringify(session), ["EX", 7200]);
    return { status: "ok" as const };
  } catch (error) {
    await deleteKey(emailKey);
    throw error;
  }
}

export async function getSummary() {
  const [registrations, pageViews, presaveClicks, sources, recentRaw] = await Promise.all([
    getCounter("placeres:metric:registrations"),
    getCounter("placeres:metric:page_view"),
    getCounter("placeres:metric:presave_clicks"),
    hashEntries("placeres:registration_sources"),
    listRange("placeres:registrations", 0, 99),
  ]);
  const recent = recentRaw.map((row) => JSON.parse(row) as Registration);
  return {
    registrations,
    pageViews,
    presaveClicks,
    conversion: pageViews ? Number(((registrations / pageViews) * 100).toFixed(1)) : 0,
    sources,
    recent,
  };
}

export async function getAllRegistrations() {
  return (await listRange("placeres:registrations", 0, -1))
    .map((row) => JSON.parse(row) as Registration)
    .reverse();
}
