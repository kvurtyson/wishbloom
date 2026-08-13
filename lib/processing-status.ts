function mqttConfig() {
  const brokerUrl = process.env.MQTT_BROKER_URL_windows ?? process.env.MQTT_BROKER_URL;
  const username = process.env.MQTT_USERNAME_windows ?? process.env.MQTT_USERNAME;
  const password = process.env.MQTT_PASSWORD_windows ?? process.env.MQTT_PASSWORD;
  const statusTopic =
    process.env.MQTT_DANDELION_STATUS_TOPIC_windows ??
    process.env.MQTT_DANDELION_STATUS_TOPIC ??
    "/dandelion/status";

  if (!brokerUrl || !username || !password) throw new Error("MQTT is not configured.");
  return { brokerUrl, username, password, statusTopic };
}

export async function processingFlowersAreReady(): Promise<boolean> {
  const { brokerUrl, username, password, statusTopic } = mqttConfig();
  const broker = new URL(brokerUrl);
  const topicPath = statusTopic
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const response = await fetch(
    `https://${broker.host}/broker/${topicPath}?retained=true`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    },
  );

  if (!response.ok) throw new Error(`Processing status request failed with ${response.status}.`);
  return (await response.text()).trim() === "ready";
}
