import { connectAsync } from "mqtt";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function mqttConfig() {
  const url = process.env.MQTT_BROKER_URL_windows ?? process.env.MQTT_BROKER_URL;
  const username = process.env.MQTT_USERNAME_windows ?? process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD_windows ?? process.env.MQTT_PASSWORD;

  if (!url || !username || !password) {
    throw new Error("MQTT is not configured.");
  }

  return {
    url,
    username,
    password,
    topic:
      process.env.MQTT_DANDELION_TOPIC_windows ??
      process.env.MQTT_DANDELION_TOPIC ??
      "/dandelion",
  };
}

export async function POST(request: NextRequest) {
  let client: Awaited<ReturnType<typeof connectAsync>> | null = null;

  try {
    const body = (await request.json()) as { sessionId?: unknown };
    if (typeof body.sessionId !== "string" || !/^[a-f0-9-]{36}$/i.test(body.sessionId)) {
      return NextResponse.json({ error: "Invalid session." }, { status: 400 });
    }

    const { url, username, password, topic } = mqttConfig();
    client = await connectAsync(url, {
      username,
      password,
      clientId: `wishbloom-${crypto.randomUUID()}`,
      clean: true,
      reconnectPeriod: 0,
      connectTimeout: 10_000,
    });

    await client.publishAsync(topic, "1", { qos: 0, retain: false });
    await client.endAsync();
    client = null;

    return NextResponse.json({ sent: true, topic });
  } catch (error) {
    console.error("Dandelion MQTT trigger failed", error);
    if (client) await client.endAsync().catch(() => undefined);
    return NextResponse.json(
      { error: "Processing trigger is temporarily unavailable." },
      { status: 503 },
    );
  }
}
