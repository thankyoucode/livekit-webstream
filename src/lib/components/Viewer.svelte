<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let remoteStream: MediaStream | null = null;
	let pc: RTCPeerConnection | null = null;
	let ws: WebSocket | null = null;
	let videoElem: HTMLVideoElement | null = null;

	let isConnected = false;
	let bufferedCandidates: RTCIceCandidateInit[] = [];

	// Reactive binding of stream to video element
	$: if (videoElem) {
		videoElem.srcObject = remoteStream;
	}

	// Cleanup connections and streams
	function cleanup() {
		if (pc) {
			pc.ontrack = null;
			pc.onicecandidate = null;
			pc.onconnectionstatechange = null;
			pc.oniceconnectionstatechange = null;
			pc.close();
			pc = null;
		}

		if (ws) {
			ws.onopen = null;
			ws.onmessage = null;
			ws.onerror = null;
			ws.onclose = null;
			ws.close();
			ws = null;
		}

		if (remoteStream) {
			remoteStream.getTracks().forEach((track) => track.stop());
			remoteStream = null;
		}

		isConnected = false;
		bufferedCandidates = [];
	}

	onMount(() => {
		pc = new RTCPeerConnection({
			iceServers: [] // Use empty or add STUN servers if on internet
		});

		// Debug connection state changes
		pc.onconnectionstatechange = () => {
			console.log('[PC] Connection state change:', pc?.connectionState);
			if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected') {
				cleanup();
			}
		};

		// Debug ICE connection state changes
		pc.oniceconnectionstatechange = () => {
			console.log('[PC] ICE connection state:', pc?.iceConnectionState);
			if (pc?.iceConnectionState === 'failed' || pc?.iceConnectionState === 'disconnected') {
				cleanup();
			}
		};

		// When remote track arrives, update remoteStream
		pc.ontrack = (event) => {
			console.log('[PC] Track event:', event);
			// Assign latest stream — this triggers videoElem.srcObject update
			remoteStream = event.streams[0];
		};

		// Send ICE candidates to signaling server
		pc.onicecandidate = (event) => {
			if (event.candidate && ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
			}
		};

		ws = new WebSocket(`ws://${location.hostname}:8080`);

		ws.onopen = () => {
			if (ws) {
				console.log('[WS] Connected as viewer');
				ws.send(JSON.stringify({ type: 'viewer' }));
				isConnected = true;
			}
		};

		ws.onmessage = async (event) => {
			try {
				const message = JSON.parse(event.data);
				console.log('[WS] Message received:', message);

				switch (message.type) {
					case 'viewer-ack':
						// Server confirms viewer registered
						console.log('Viewer connection acknowledged');
						// Update UI or internal state here if needed
						break;

					case 'offer':
						if (pc && ws) {
							// Remote SDP offer from streamer
							await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
							// Create and set local answer SDP
							const answer = await pc.createAnswer();
							await pc.setLocalDescription(answer);
							// Send answer back via server to streamer
							ws.send(JSON.stringify({ type: 'answer', answer }));

							// Add buffered ICE candidates after setting remote description
							for (const candidate of bufferedCandidates) {
								await pc.addIceCandidate(new RTCIceCandidate(candidate));
							}
							bufferedCandidates = [];
						}
						break;

					case 'candidate':
						if (pc) {
							if (pc.remoteDescription) {
								try {
									await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
								} catch (e) {
									console.error('[PC] Error adding ICE candidate:', e);
								}
							} else {
								bufferedCandidates.push(message.candidate);
							}
						}
						break;

					case 'broadcaster-closed':
						console.log('[WS] Broadcaster closed');
						cleanup(); // Implement cleanup to stop stream, release resources
						break;

					default:
						console.warn('[WS] Unknown message type:', message.type);
				}
			} catch (err) {
				console.error('[WS] Error handling message:', err);
			}
		};

		ws.onerror = (err) => {
			console.error('[WS] WebSocket error:', err);
		};

		ws.onclose = () => {
			console.log('[WS] Disconnected');
			cleanup();
		};
	});

	onDestroy(() => {
		cleanup();
	});
</script>

<div class="flex flex-col items-center justify-center h-screen bg-[#121212] text-white p-4">
	<div
		class="bg-black rounded-lg shadow-2xl max-w-[90vw] max-h-[80vh] w-full aspect-video overflow-hidden flex items-center justify-center"
	>
		<video
			autoplay
			playsinline
			muted
			bind:this={videoElem}
			class="w-full h-full object-contain rounded-lg"
		></video>
	</div>
	<p class="mt-4 text-gray-400">{remoteStream ? 'Live Stream' : 'Waiting for broadcaster...'}</p>
</div>
