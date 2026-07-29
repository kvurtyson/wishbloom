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

- Start moves from the welcome screen to microphone permission.
- Enable requests microphone access through `getUserMedia`.
- A mocked queue displays for five seconds before the active session begins.
- During the active session, microphone intensity drives continuous blow progress.
- The small dots in the bottom-right corner provide direct access to all six reference screens for review.
- No audio is recorded, stored, or transmitted.

The original exported Figma artwork is stored under `public/assets`.
