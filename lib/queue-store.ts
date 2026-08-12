const QUEUE_KEY = "wishbloom:queue";
const SEQUENCE_KEY = "wishbloom:queue:sequence";
const HEARTBEAT_PREFIX = "wishbloom:heartbeat:";
const TRIGGER_PREFIX = "wishbloom:trigger:";
// A familiar user completed the end-to-end flow in about 34 seconds. A
// one-minute turn leaves enough room for first-time users to read the guidance,
// grant microphone permission, and complete their wish.
const HEARTBEAT_TTL_SECONDS = 65;
export const ESTIMATED_TURN_SECONDS = 60;

type RedisValue = string | number | null;

export type QueueStatus = {
  active: boolean;
  position: number;
  peopleAhead: number;
  estimatedWaitSeconds: number;
};

function redisConfig() {
  const url =
    process.env.KV_REST_API_URL ??
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error("Queue storage is not configured.");
  }

  return { url: url.replace(/\/$/, ""), token };
}

async function command<T extends RedisValue | RedisValue[]>(parts: RedisValue[]): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parts),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Queue storage request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as { result?: T; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.result as T;
}

const joinScript = `
local queue = KEYS[1]
local heartbeat = KEYS[2]
local sequence = KEYS[3]
local sessionId = ARGV[1]
local now = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

redis.call('SET', heartbeat, now, 'EX', ttl)
if redis.call('ZSCORE', queue, sessionId) == false then
  local order = redis.call('INCR', sequence)
  redis.call('ZADD', queue, order, sessionId)
end

while true do
  local head = redis.call('ZRANGE', queue, 0, 0)[1]
  if not head then break end
  if redis.call('EXISTS', '${HEARTBEAT_PREFIX}' .. head) == 1 then break end
  redis.call('ZREM', queue, head)
end

local rank = redis.call('ZRANK', queue, sessionId)
return rank
`;

const statusScript = `
local queue = KEYS[1]
local heartbeat = KEYS[2]
local sessionId = ARGV[1]
local now = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

if redis.call('ZSCORE', queue, sessionId) == false then
  return -1
end

redis.call('SET', heartbeat, now, 'EX', ttl)

while true do
  local head = redis.call('ZRANGE', queue, 0, 0)[1]
  if not head then break end
  if redis.call('EXISTS', '${HEARTBEAT_PREFIX}' .. head) == 1 then break end
  redis.call('ZREM', queue, head)
end

local rank = redis.call('ZRANK', queue, sessionId)
if rank == false then return -1 end
return rank
`;

function formatStatus(rank: number): QueueStatus {
  const peopleAhead = Math.max(0, rank);
  return {
    active: rank === 0,
    position: rank + 1,
    peopleAhead,
    estimatedWaitSeconds: peopleAhead * ESTIMATED_TURN_SECONDS,
  };
}

export async function joinQueue(sessionId: string): Promise<QueueStatus> {
  const rank = await command<number>([
    "EVAL",
    joinScript,
    3,
    QUEUE_KEY,
    `${HEARTBEAT_PREFIX}${sessionId}`,
    SEQUENCE_KEY,
    sessionId,
    Date.now(),
    HEARTBEAT_TTL_SECONDS,
  ]);

  return formatStatus(Number(rank));
}

export async function getQueueStatus(sessionId: string): Promise<QueueStatus | null> {
  const rank = await command<number>([
    "EVAL",
    statusScript,
    2,
    QUEUE_KEY,
    `${HEARTBEAT_PREFIX}${sessionId}`,
    sessionId,
    Date.now(),
    HEARTBEAT_TTL_SECONDS,
  ]);

  return Number(rank) < 0 ? null : formatStatus(Number(rank));
}

export async function leaveQueue(sessionId: string): Promise<void> {
  await command<number>([
    "EVAL",
    "redis.call('ZREM', KEYS[1], ARGV[1]); redis.call('DEL', KEYS[2]); return 1",
    2,
    QUEUE_KEY,
    `${HEARTBEAT_PREFIX}${sessionId}`,
    sessionId,
  ]);
}

const reserveTriggerScript = `
local queue = KEYS[1]
local trigger = KEYS[2]
local sessionId = ARGV[1]

while true do
  local head = redis.call('ZRANGE', queue, 0, 0)[1]
  if not head then return 0 end
  if redis.call('EXISTS', '${HEARTBEAT_PREFIX}' .. head) == 1 then break end
  redis.call('ZREM', queue, head)
end

local head = redis.call('ZRANGE', queue, 0, 0)[1]
if head ~= sessionId then return 0 end
local triggerState = redis.call('GET', trigger)
if triggerState == 'published' then return 2 end
if triggerState == 'publishing' then return 3 end
redis.call('SET', trigger, 'publishing', 'EX', 30)
return 1
`;

export async function reserveWishTrigger(sessionId: string): Promise<"reserved" | "already-triggered" | "busy" | "not-active"> {
  const result = Number(await command<number>([
    "EVAL",
    reserveTriggerScript,
    2,
    QUEUE_KEY,
    `${TRIGGER_PREFIX}${sessionId}`,
    sessionId,
  ]));

  if (result === 1) return "reserved";
  if (result === 2) return "already-triggered";
  if (result === 3) return "busy";
  return "not-active";
}

export async function completeWishTrigger(sessionId: string): Promise<void> {
  await command<string>(["SET", `${TRIGGER_PREFIX}${sessionId}`, "published", "EX", 300]);
}

export async function releaseWishTriggerReservation(sessionId: string): Promise<void> {
  await command<number>(["DEL", `${TRIGGER_PREFIX}${sessionId}`]);
}
