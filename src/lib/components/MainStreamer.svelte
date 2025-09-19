<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let remoteStream: MediaStream | null = null;
	let pc: RTCPeerConnection | null = null;
	let ws: WebSocket | null = null;
	let videoElem: HTMLVideoElement | null = null;

	let isStreaming = false;
	let isPreviewing = false;
	let localStream: MediaStream | null = null;
	let bufferedCandidates: RTCIceCandidateInit[] = [];

	// Bind remoteStream to video element srcObject reactively
	$: if (videoElem) {
		videoElem.srcObject = remoteStream;
	}

	// Start local screen capture preview
	async function startPreview() {
		if (isPreviewing) return;

		try {
			localStream = await (navigator.mediaDevices as any).getDisplayMedia({
				video: true,
				audio: false
			});

			remoteStream = localStream;
			isPreviewing = true;

			// Add tracks immediately after preview start for better flow
			if (pc && localStream) {
				localStream.getTracks().forEach((track) => pc!.addTrack(track, localStream!));
			}
		} catch (error) {
			console.error('Could not start preview:', error);
			alert('Failed to start screen preview. Please allow screen sharing.');
		}
	}

	// Start streaming process, create offer and send via WS
	async function startStreaming(): Promise<void> {
		if (!isPreviewing || isStreaming || !pc || !ws || !localStream) return;

		isStreaming = true;

		try {
			// Create offer after tracks already added (should already be via startPreview)
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);

			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'offer', offer }));
			} else {
				throw new Error('WebSocket is not open.');
			}
		} catch (error) {
			console.error('Error during streaming start:', error);
			isStreaming = false;
		}
	}

	// Stop streaming and clean up resources
	function stopStreaming(): void {
		if (pc) {
			pc.getSenders().forEach((sender) => sender.track?.stop());
			pc.close();
			pc = null;
		}

		if (localStream) {
			localStream.getTracks().forEach((track) => track.stop());
			localStream = null;
		}

		if (videoElem) {
			videoElem.srcObject = null;
		}

		if (ws) {
			ws.close();
			ws = null;
		}

		remoteStream = null;
		isStreaming = false;
		isPreviewing = false;
		bufferedCandidates = [];
	}

	// Initialize WebRTC peer connection and signaling WS on component mount
	onMount(() => {
		pc = new RTCPeerConnection({
			iceServers: [] // Empty for LAN/offline, or add STUN/TURN as needed
		});

		pc.onicecandidate = (event) => {
			if (event.candidate && ws?.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ type: 'candidate', candidate: event.candidate }));
			}
		};

		pc.onconnectionstatechange = () => {
			console.log('[PC] connectionState:', pc?.connectionState);
			if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected') {
				stopStreaming();
			}
		};

		ws = new WebSocket(`ws://${location.hostname}:8080`);

		ws.onopen = () => {
			if (ws) {
				ws.send(JSON.stringify({ type: 'streamer' }));
				console.log('[WS] Signaling connection opened as streamer');
			} else {
				console.log('[WS] Is not find');
			}
		};

		ws.onmessage = async (event) => {
			try {
				const message = JSON.parse(event.data);

				switch (message.type) {
					case 'streamer-ack':
						console.log('Streamer connection acknowledged');
						break;

					case 'answer':
						if (!pc) return;
						await pc.setRemoteDescription(new RTCSessionDescription(message.answer));

						for (const candidate of bufferedCandidates) {
							await pc.addIceCandidate(new RTCIceCandidate(candidate));
						}
						bufferedCandidates = [];
						break;

					case 'candidate':
						if (!pc) return;

						if (pc.remoteDescription) {
							try {
								await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
							} catch (error) {
								console.error('[PC] Error adding ICE candidate:', error);
							}
						} else {
							bufferedCandidates.push(message.candidate);
						}
						break;

					case 'broadcaster-closed':
						console.log('[WS] Received broadcaster-closed message');
						stopStreaming();
						break;

					default:
						console.warn('[WS] Unknown message type:', message.type);
				}
			} catch (error) {
				console.error('[WS] Error parsing message:', error);
			}
		};

		ws.onerror = (event) => {
			console.error('[WS] WebSocket error:', event);
		};

		ws.onclose = () => {
			console.log('[WS] WebSocket connection closed');
			stopStreaming();
		};
	});

	// Cleanup on component unload
	onDestroy(() => {
		stopStreaming();
	});
</script>

<div class="flex flex-col h-screen bg-[#1e1e1e] text-white font-sans">
	<div class="flex-1 relative bg-black">
		<video autoplay muted playsinline class="w-full h-full object-cover" bind:this={videoElem}
		></video>
	</div>

	<div
		class="flex items-center justify-center bg-[#2c2c2c] border-t border-[#333] p-3 select-none"
		style="min-height: 60px;"
	>
		{#if !isPreviewing && !isStreaming}
			<button
				on:click={startPreview}
				class="rounded-full bg-green-500 hover:bg-green-600 px-6 py-2 text-sm font-semibold transition-colors"
				aria-label="Preview Screen"
			>
				Preview
			</button>
		{:else if isPreviewing && !isStreaming}
			<button
				on:click={startStreaming}
				class="rounded-full bg-green-500 hover:bg-green-600 px-6 py-2 text-sm font-semibold transition-colors"
				aria-label="Start Streaming"
			>
				Start Streaming
			</button>
		{:else if isStreaming}
			<button
				on:click={stopStreaming}
				class="rounded-full bg-red-600 hover:bg-red-700 px-6 py-2 text-sm font-semibold transition-colors"
				aria-label="Stop Streaming"
			>
				Stop
			</button>
		{/if}
	</div>
</div>
