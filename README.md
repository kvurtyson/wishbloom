# WishBloom

Interactive mobile prototype implemented from the Figma page `Page 3/CODEX/JULIA`.

## Requirements

- Node.js 20 or newer
- npm

## Start locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

## Prototype behavior

- Start joins a shared first-in, first-out queue.
- The first visitor moves to microphone permission while later visitors remain on the waiting screen.
- Queue position and estimated wait update automatically, and the next visitor is released when the active visitor finishes or disconnects.
- An active turn expires after two minutes without a tap, key press, or detected breath; the expired screen is shown and the next visitor is released.
- Enable requests microphone access through `getUserMedia`.
- A five-second preparation countdown displays after microphone permission is granted.
- During the active session, microphone intensity drives continuous blow progress.
- Completing the blow sends a server-side MQTT message (`1` on `/dandelion`) before the flying screen appears.
- The small dots in the bottom-right corner provide direct access to all six reference screens for review.
- No audio is recorded, stored, or transmitted.

## Queue storage

The shared queue uses an Upstash Redis database connected to Vercel. Configure either of these environment-variable pairs:

- `KV_REST_API_URL` and `KV_REST_API_TOKEN`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_KV_REST_API_URL` and `UPSTASH_REDIS_REST_KV_REST_API_TOKEN`

The Processing installation trigger uses these server-only variables:

- `MQTT_BROKER_URL`
- `MQTT_USERNAME`
- `MQTT_PASSWORD`

The original exported Figma artwork is stored under `public/assets`.
