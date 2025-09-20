/**
 * Deprecated: Legacy WebSocket Server Entrypoint
 *
 * This script was used to run a custom WebSocket server
 * alongside the SvelteKit app.
 *
 * We have since moved to LiveKit, which fully replaces
 * this functionality with a simpler, scalable solution.
 *
 * Why keep this file?
 * - For project history and as a point of reference.
 * - To avoid confusion for developers exploring the repo.
 *
 * * Additional note:
 * - This file should be placed at the project root if used.
 * - It was originally meant to work together with the SvelteKit
 *   Node adapter (`adapter-node`) using `./build/handler.js`
 *   after running `npm run build`.
 *
 * Current usage:
 * - None. LiveKit is the recommended way forward.
 */

import express from 'express';
import { createServer } from 'http';
import { handler } from '../../../build/handler.js';
import { createWebSocketServer } from './webSocket.js';

const app = express();
app.use(handler);

const httpServer = createServer(app);

// 🔌 Attach your WebSocket server to port 8080
createWebSocketServer(httpServer);

const PORT = 8080;
const HOST = '0.0.0.0'; // Allow access from LAN (TV, phone, etc.)

httpServer.listen(PORT, HOST, () => {
	console.log(` Server running at http://${HOST}:${PORT}`);
});
