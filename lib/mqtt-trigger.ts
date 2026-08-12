import mqtt from "mqtt";

const TOPIC = "/dandelion";
const PAYLOAD = "1";

function mqttConfig() {
  const url = process.env.MQTT_BROKER_URL;
  const username = process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD;

  if (!url || !username || !password) {
    throw new Error("MQTT is not configured.");
  }

  return { url, username, password };
}

export async function publishWishTrigger(): Promise<void> {
  const { url, username, password } = mqttConfig();
  const client = await mqtt.connectAsync(url, {
    username,
    password,
    clientId: `wishbloom-vercel-${crypto.randomUUID()}`,
    clean: true,
    connectTimeout: 8_000,
    reconnectPeriod: 0,
  });

  try {
    await client.publishAsync(TOPIC, PAYLOAD, { qos: 1, retain: false });
  } finally {
    await client.endAsync();
  }
}
