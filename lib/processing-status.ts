import { connectAsync } from "mqtt";

function mqttConfig() {
  const url = process.env.MQTT_BROKER_URL_windows ?? process.env.MQTT_BROKER_URL;
  const username = process.env.MQTT_USERNAME_windows ?? process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD_windows ?? process.env.MQTT_PASSWORD;
  const statusTopic =
    process.env.MQTT_DANDELION_STATUS_TOPIC_windows ??
    process.env.MQTT_DANDELION_STATUS_TOPIC ??
    "/dandelion/status";

  if (!url || !username || !password) throw new Error("MQTT is not configured.");
  return { url, username, password, statusTopic };
}

export async function processingFlowersAreReady(): Promise<boolean> {
  const { url, username, password, statusTopic } = mqttConfig();
  const client = await connectAsync(url, {
    username,
    password,
    clientId: `wishbloom-ready-${crypto.randomUUID()}`,
    clean: true,
    reconnectPeriod: 0,
    connectTimeout: 5_000,
  });

  try {
    return await new Promise<boolean>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Processing status timed out.")), 4_000);
      client.once("message", (_topic, payload) => {
        clearTimeout(timeout);
        resolve(payload.toString().trim() === "ready");
      });
      void client.subscribeAsync(statusTopic, { qos: 1 }).catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  } finally {
    await client.endAsync().catch(() => undefined);
  }
}
