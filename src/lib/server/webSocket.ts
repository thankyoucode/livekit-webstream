/**
 * Deprecated: Custom WebSocket Implementation
 *
 * This file previously contained a custom WebSocket server
 * for managing one-to-one or one-to-many connections.
 *
 * We no longer use this approach, since maintaining connection logic,
 * scaling, and broadcasting was complex and inefficient.
 *
 * Replaced by:
 * - LiveKit (direct integration) which provides a more powerful
 *   and production-ready real-time communication framework.
 *
 * Note:
 * - This file remains here for historical context only.
 * - Do not use it in new development.
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

export function createWebSocketServer(httpServer: http.Server) {
	const wss = new WebSocketServer({ server: httpServer });

	let streamer: WebSocket | null = null;
	const viewers = new Set<WebSocket>();

	wss.on('connection', (ws, req) => {
		console.log('New connection from', req.socket.remoteAddress);

		ws.on('message', (data) => {
			let msg;
			try {
				msg = JSON.parse(data.toString());
			} catch {
				ws.send(JSON.stringify({ error: 'Invalid JSON' }));
				return;
			}

			if (!msg.type || typeof msg.type !== 'string') {
				ws.send(JSON.stringify({ error: 'Missing or invalid message type' }));
				return;
			}

			switch (msg.type) {
				case 'streamer':
					if (streamer) {
						ws.send(JSON.stringify({ error: 'Streamer already connected' }));
						ws.close(4000, 'Streamer already connected');
						return;
					}
					streamer = ws;
					ws.send(JSON.stringify({ type: 'streamer-ack' }));
					console.log('Streamer connected');
					break;

				case 'viewer':
					viewers.add(ws);
					ws.send(JSON.stringify({ type: 'viewer-ack' }));
					console.log('Viewer connected, total:', viewers.size);
					break;

				default:
					// If message comes from streamer, broadcast to all viewers
					if (ws === streamer) {
						viewers.forEach((viewer) => {
							if (viewer.readyState === WebSocket.OPEN) {
								viewer.send(data);
							}
						});
					} else {
						// If message comes from a viewer, send only to streamer
						if (streamer && streamer.readyState === WebSocket.OPEN) {
							streamer.send(data);
						}
					}
					break;
			}
		});

		ws.on('close', () => {
			if (ws === streamer) {
				streamer = null;
				// Notify viewers streamer closed
				viewers.forEach((viewer) => {
					if (viewer.readyState === WebSocket.OPEN) {
						viewer.send(JSON.stringify({ type: 'broadcaster-closed' }));
					}
				});
				console.log('Streamer disconnected, notified viewers');
			} else {
				viewers.delete(ws);
				console.log('Viewer disconnected, total:', viewers.size);
			}
		});

		ws.on('error', (error) => {
			console.error('WebSocket error:', error);
		});
	});

	console.log('WebSocket signaling server running');
	return wss;
}
