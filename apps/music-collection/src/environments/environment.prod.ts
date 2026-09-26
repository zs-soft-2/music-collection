import { VERSION } from './version';

export const environment = {
	production: true,
	firebase: {
		apiKey: 'AIzaSyDHWO8_DhKXayoJc_eThKVwm2LzLBw9J5w',
		authDomain: 'music-collection-4e074.firebaseapp.com',
		projectId: 'music-collection-4e074',
		storageBucket: 'music-collection-4e074.appspot.com',
		messagingSenderId: '110722700843',
		appId: '1:110722700843:web:2b53358337e0976ba87c6e',
		measurementId: 'G-7H6CC1PTSY',
	},
	appCheck: {
		/**
		 * A reCAPTCHA Enterprise site key. A kulcsot és az App Check
		 * regisztrációját a tofu teremti (infra/modules/firebase), az értéke
		 * innen jön:
		 *   tofu -chdir=infra/environments/prod output -raw app_check_site_key
		 *
		 * Nem titok: a kliensbe kerül, a védelmet a hozzá tartozó,
		 * szerveroldalon ellenőrzött token adja.
		 *
		 * Üresen az App Check nem indul el, és a callable-ök — amik App Check
		 * tokent követelnek (apps/functions/src/index.ts) — mindent
		 * elutasítanak.
		 */
		recaptchaSiteKey: '',
		/**
		 * Debug token a prod buildben SOHA: aki ismeri, az App Checket
		 * megkerülve hívhatná a callable-öket. Csak a dev környezet kap
		 * ilyet, a localhost-fejlesztéshez (`environment.ts`).
		 */
		debugToken: '',
	},
	analytics: {
		/**
		 * Mérés a prod GA4 propertyjébe (`measurementId` feljebb). Csak
		 * hozzájárulás után indul el: a gtag scriptet is akkor tölti be
		 * először a böngésző (`FirebaseAnalyticsService`).
		 */
		enabled: true,
	},
	type: 'production',
	/** Base version + per-build suffix (tools/version/generate-version.mjs). */
	version: `1.0.0-${VERSION.build}`,
	buildTime: VERSION.buildTime,
};
