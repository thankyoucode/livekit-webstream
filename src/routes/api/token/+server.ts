import { json } from '@sveltejs/kit';
import { AccessToken } from 'livekit-server-sdk';

const API_KEY = 'devkey';
const API_SECRET = 'secret';

export async function GET({ url }) {
	try {
		const identity = url.searchParams.get('identity');
		const roomName = url.searchParams.get('room');

		if (!identity || !roomName) {
			return json({ error: 'Missing identity or room' }, { status: 400 });
		}

		const at = new AccessToken(API_KEY, API_SECRET, { identity });

		at.addGrant({
			room: roomName,
			roomJoin: true,
			canPublish: true,
			canSubscribe: true
		});

		const token = await at.toJwt();

		return json({ token });
	} catch {
		return json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
