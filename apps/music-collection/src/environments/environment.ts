/**
 * Az alapértelmezett környezet a DEV projekt: a `nx serve`, a `nx build` és a
 * `tools/` scriptek is ezt használják. A prod konfigurációt a `production`
 * build-konfiguráció cseréli be (`environment.prod.ts`), a tool scriptek pedig
 * a `--env prod` kapcsolóval kérik.
 */
import { VERSION } from './version';

export const environment = {
	production: false,
	firebase: {
		apiKey: 'AIzaSyC-XU47nmMtvnj5z7x-BI2HgR3UCERsxOQ',
		authDomain: 'music-collection-16676.firebaseapp.com',
		projectId: 'music-collection-16676',
		storageBucket: 'music-collection-16676.firebasestorage.app',
		messagingSenderId: '967955572806',
		appId: '1:967955572806:web:7b17294aa9888914508247',
		measurementId: 'G-H3YMKNE5KV',
	},
	spotify: {
		/**
		 * Client ID of the Spotify app (developer.spotify.com/dashboard) for
		 * full playback on the album page. Not a secret (PKCE flow). Empty
		 * leaves only the embedded preview player.
		 */
		clientId: '0ab3fba0933440238c563c337700db27',
	},
	type: 'develop',
	/** Base version + per-build suffix (tools/version/generate-version.mjs). */
	version: `1.0.0-${VERSION.build}`,
	buildTime: VERSION.buildTime,
};
