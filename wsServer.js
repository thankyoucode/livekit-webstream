import express from 'express';
import { createServer } from 'http';
import { handler } from './build/handler.js';
import { createWebSocketServer } from './src/lib/server/webSocket.ts';

const app = express();
app.use(handler);

const httpServer = createServer(app);

// 🔌 Attach your WebSocket server to port 8080
createWebSocketServer(httpServer);

const PORT = 8080;
const HOST = '0.0.0.0'; // Allow access from LAN (TV, phone, etc.)

httpServer.listen(PORT, HOST, () => {
	console.log(`✅ Server running at http://${HOST}:${PORT}`);
});
