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

				case 'offer':
					// Relay streamer offer to all viewers
					viewers.forEach((viewer) => {
						if (viewer.readyState === WebSocket.OPEN) {
							viewer.send(JSON.stringify(msg));
						}
					});
					break;

				case 'answer':
					// Relay viewer answer to streamer
					if (streamer && streamer.readyState === WebSocket.OPEN) {
						streamer.send(JSON.stringify(msg));
					}
					break;

				case 'candidate':
					// Relay ICE candidates appropriately
					if (streamer === ws) {
						// From streamer to viewers
						viewers.forEach((viewer) => {
							if (viewer.readyState === WebSocket.OPEN) {
								viewer.send(JSON.stringify(msg));
							}
						});
					} else {
						// From viewer to streamer
						if (streamer && streamer.readyState === WebSocket.OPEN) {
							streamer.send(JSON.stringify(msg));
						}
					}
					break;

				default:
					ws.send(JSON.stringify({ error: 'Unknown message type' }));
			}
		});

		ws.on('close', () => {
			if (ws === streamer) {
				streamer = null;
				// Notify all viewers that broadcaster closed
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
