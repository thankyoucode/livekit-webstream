<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import type { Room as RoomType, LocalVideoTrack } from 'livekit-client';
	import { Room, createLocalScreenTracks } from 'livekit-client';

	let room: RoomType | null = null;
	let localTrack: LocalVideoTrack | null = null;
	let videoElem: HTMLVideoElement | null = null;
	let isStreaming = false;
	let viewerCount = 0;

	let wsUrl: string;

	onMount(() => {
		const hostname = window.location.hostname;
		const port = '7880'; // LiveKit default port

		// Add a path if your LiveKit expects this eg: '/ws'
		const WS_PATH = '/ws';
		wsUrl =
			hostname === 'localhost' || hostname === '127.0.0.1'
				? `ws://localhost:${port}${WS_PATH}`
				: `ws://${hostname}:${port}${WS_PATH}`;
	});

	async function fetchToken(identity = 'streamer123', room = 'default-room'): Promise<string> {
		const res = await fetch(`/api/token?identity=${identity}&room=${room}`);
		if (!res.ok) {
			const errMsg = await res.text();
			throw new Error(`Token fetch failed: ${errMsg}`);
		}
		const data = await res.json();
		if (!data.token) throw new Error('No token received from server');
		return data.token;
	}

	async function startStreaming(): Promise<void> {
		if (isStreaming) return;
		try {
			const screenTracks = await createLocalScreenTracks({ audio: false });
			localTrack = screenTracks[0] as LocalVideoTrack;
			if (videoElem && localTrack.mediaStreamTrack) {
				if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
					alert('Your browser does not support mediaDevices API or secure context is required.');
					return;
				}
				videoElem.srcObject = new MediaStream([localTrack.mediaStreamTrack]);
			}
			room = new Room();
			const token = await fetchToken();
			await room.connect(wsUrl, token);
			await room.localParticipant.publishTrack(localTrack);

			room.on('disconnected', () => {
				isStreaming = false;
			});

			// Example viewer count subscriptions:
			room.on('participantConnected', () => {
				viewerCount = room!.remoteParticipants.size;
			});
			room.on('participantDisconnected', () => {
				viewerCount = room!.remoteParticipants.size;
			});

			isStreaming = true;
		} catch (err) {
			console.error('Streaming error:', err);
			await stopStreaming();
		}
	}

	async function stopStreaming(): Promise<void> {
		if (room) {
			await room.disconnect();
			room = null;
		}
		if (localTrack) {
			localTrack.stop();
			localTrack = null;
		}
		isStreaming = false;
		viewerCount = 0;
		if (videoElem) videoElem.srcObject = null;
	}

	onDestroy(() => {
		stopStreaming();
	});
</script>

<div class="relative w-screen h-screen bg-black overflow-hidden text-white">
	<video
		autoplay
		muted
		playsinline
		bind:this={videoElem}
		class="absolute inset-0 w-full h-full object-cover"
	></video>

	<div
		class="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 bg-opacity-70 backdrop-blur-md rounded-full px-6 py-2 max-w-xs w-fit text-gray-300 text-sm select-none"
	>
		{#if !isStreaming}
			<button
				class="bg-[#111] border border-[#444] rounded-full px-5 py-2 hover:bg-[#222] transition"
				on:click={startStreaming}
				aria-label="Start Streaming"
			>
				Start
			</button>
		{:else}
			<button
				class="bg-[#111] border border-[#444] rounded-full px-5 py-2 hover:bg-[#222] transition"
				on:click={stopStreaming}
				aria-label="Stop Streaming"
			>
				Stop
			</button>
		{/if}

		<span>{viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'}</span>
	</div>
</div>
