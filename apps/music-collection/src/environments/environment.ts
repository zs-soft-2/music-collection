/**
 * Az alapértelmezett környezet a DEV projekt: a `nx serve`, a `nx build` és a
 * `tools/` scriptek is ezt használják. A prod konfigurációt a `production`
 * build-konfiguráció cseréli be (`environment.prod.ts`), a tool scriptek pedig
 * a `--env prod` kapcsolóval kérik.
 */
import { APP_CHECK_DEBUG_TOKEN } from './app-check-debug-token';
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
	appCheck: {
		/**
		 * A reCAPTCHA Enterprise site key. A kulcsot és az App Check
		 * regisztrációját a tofu teremti (infra/modules/firebase), az értéke
		 * innen jön:
		 *   tofu -chdir=infra/environments/dev output -raw app_check_site_key
		 *
		 * Nem titok: a kliensbe kerül, a védelmet a hozzá tartozó,
		 * szerveroldalon ellenőrzött token adja.
		 *
		 * Üresen az App Check nem indul el, és a callable-ök — amik App Check
		 * tokent követelnek (apps/functions/src/index.ts) — mindent
		 * elutasítanak.
		 */
		recaptchaSiteKey: '6LfnhcctAAAAAFX_jp0sInM0Fl5xmk7Z15YLYfC_',
		/**
		 * A localhost debug tokenje. A `nx serve` ezzel vált App Check tokent
		 * a valódi reCAPTCHA pontozása helyett, így a fejlesztői gépen sem a
		 * böngészőprofil viselkedésén múlik, hogy a callable-ök válaszolnak-e.
		 *
		 * Titok — ezért nem itt áll, hanem generált fájlból jön
		 * (tools/app-check/generate-debug-token.mjs). Üresen a valódi
		 * reCAPTCHA fut; a localhost a kulcs engedélyezett domainjei között
		 * van (infra/environments/dev/dev.tfvars), tehát így is működik.
		 */
		debugToken: APP_CHECK_DEBUG_TOKEN,
	},
	analytics: {
		/**
		 * Mérés a dev projekt GA4 propertyjébe (`measurementId` feljebb), a
		 * prodtól külön. Devben szándékosan be van kapcsolva: enélkül nincs
		 * hol látni, hogy az esemény tényleg elmegy-e. A saját kattintgatásod
		 * viszont beleszámít, szóval devből ne olvass számokat.
		 *
		 * Kikapcsolva a sáv sem jelenik meg, és az SDK-t se tölti be semmi.
		 */
		enabled: true,
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
