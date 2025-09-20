<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import {
		Room,
		type Room as RoomType,
		type RemoteParticipant,
		type RemoteTrackPublication,
		type RemoteTrack
	} from 'livekit-client';

	let room: RoomType | null = null;
	let videoElem: HTMLVideoElement | null = null;
	let remoteStream: MediaStream | null = null;
	let browserReady = false;
	let errorMsg = '';

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

	async function fetchToken(identity = 'viewer', room = 'default-room') {
		const res = await fetch(`/api/token?identity=${identity}&room=${room}`);
		if (!res.ok) throw new Error('Failed to fetch token');
		const data = await res.json();
		return data.token;
	}

	async function connect(): Promise<void> {
		try {
			const token = await fetchToken();
			room = new Room();
			remoteStream = new MediaStream();

			room.on(
				'trackSubscribed',
				(
					track: RemoteTrack,
					publication: RemoteTrackPublication,
					participant: RemoteParticipant
				) => {
					if (track.kind === 'video' && videoElem && remoteStream) {
						remoteStream.addTrack(track.mediaStreamTrack);
						videoElem.srcObject = remoteStream;
					}
				}
			);

			room.on(
				'trackUnsubscribed',
				(
					track: RemoteTrack,
					publication: RemoteTrackPublication,
					participant: RemoteParticipant
				) => {
					if (remoteStream && track.mediaStreamTrack) {
						remoteStream.removeTrack(track.mediaStreamTrack);
						if (videoElem) {
							videoElem.srcObject = remoteStream;
						}
					}
				}
			);

			await room.connect(wsUrl, token);
			room.remoteParticipants.forEach((participant: RemoteParticipant) => {
				participant.trackPublications.forEach((publication: RemoteTrackPublication) => {
					const track = publication.track;
					if (publication.isSubscribed && track?.kind === 'video') {
						if (remoteStream && videoElem) {
							remoteStream.addTrack(track.mediaStreamTrack);
							videoElem.srcObject = remoteStream;
						}
					}
				});
			});
			errorMsg = '';
		} catch (err) {
			errorMsg = 'Failed to connect viewer';
			console.error('Failed to connect viewer:', err);
		}
	}

	async function disconnect(): Promise<void> {
		if (room) {
			await room.disconnect();
			room = null;
		}
		if (remoteStream) {
			remoteStream.getTracks().forEach((track) => track.stop());
			remoteStream = null;
		}
		if (videoElem) {
			videoElem.srcObject = null;
		}
	}

	onMount(() => {
		browserReady = true;
		connect();
	});

	onDestroy(() => {
		disconnect();
	});
</script>

<div class="fixed inset-0 bg-black">
	<video autoplay playsinline muted bind:this={videoElem} class="w-full h-full object-contain"
	></video>
</div>
