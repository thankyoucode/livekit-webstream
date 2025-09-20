import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit(), tailwindcss()],
	server: {
		https: {
			key: fs.readFileSync(path.resolve(__dirname, '10.33.34.221+3-key.pem')),
			cert: fs.readFileSync(path.resolve(__dirname, '10.33.34.221+3.pem'))
		},
		host: true, // enable LAN IP access
		port: 4173
	}
});
