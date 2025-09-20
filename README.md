# Live Web Video Streaming with SvelteKit & LiveKit

A lightweight, real-time video streaming app built on SvelteKit and powered by LiveKit.

---

## What It Is

This project lets you stream live video directly in web browsers using WebRTC via LiveKit. It combines a fast, modern SvelteKit frontend with LiveKit’s scalable real-time media server for seamless interactive streaming.

---

## Why This Project Exists

Building reliable live streaming from scratch is complex—managing connections, scaling, media relay, and latency gets hard fast. LiveKit takes care of all that heavy lifting:

- Handles many-to-many real-time video/audio with ultra low latency
- WebRTC native solution, built for media streaming and real-time use cases
- Scales effortlessly from a few users to thousands on the same stream
- Provides simple client/server SDKs to rapidly build streaming experiences

This project demonstrates how to set up LiveKit and SvelteKit to create a smooth live streaming app with minimal fuss.

---

## Basic Usage

Run development:

```bash
npm install
npm run dev
```

Run production build and preview:

```bash
npm run build
npm run preview
```

Also run LiveKit in both case
```bash
livekit-server --dev
```

---

## About the Makefile

This project includes a Makefile with convenience commands to:

- Start/stop the LiveKit server automatically alongside SvelteKit
- Run locally or on your LAN with `NETWORK=host`

You don’t have to use the Makefile — feel free to run scripts manually if you prefer, but it makes local development cleaner.

---

## Project Stack

- **LiveKit**: Real-time media server + SDKs for video/audio streaming over WebRTC.
- **SvelteKit**: Frontend framework providing reactive UI and routing.
- **TailwindCSS**: Utility-first CSS framework for styling.
- **Node.js / Express**: Underlying server platform (legacy WebSocket is deprecated).

---

## Notes

- The old custom WebSocket server was replaced by LiveKit for reliability and simplicity.
- This project is for hands-on experimentation and learning how to integrate LiveKit into a modern web app.
- For production, ensure you configure and secure your LiveKit server properly.

---

## Resources

- [LiveKit docs](https://livekit.io/docs)
- [SvelteKit docs](https://kit.svelte.dev)
- [WebRTC basics](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

---

Build your own live streaming experiences without headaches—this project shows you how to get started with the best tools available today.
