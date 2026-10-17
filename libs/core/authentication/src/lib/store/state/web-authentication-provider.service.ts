import {
	Auth,
	GoogleAuthProvider,
	browserPopupRedirectResolver,
	signInWithPopup,
	signOut,
} from '@angular/fire/auth';

import { inject, Injectable } from '@angular/core';
import { AuthenticationProviderService } from '@music-collection/api';

/**
 * Böngészőben futó bejelentkezés: a Firebase JS SDK felugró ablakot nyit.
 * Capacitor WebView-ban ez nem működik, ott a mobil alkalmazás a natív
 * implementációt regisztrálja ugyanerre a szerződésre.
 */
@Injectable()
export class WebAuthenticationProviderService extends AuthenticationProviderService {
	private readonly auth: Auth = inject(Auth);

	public async signInWithGoogle(): Promise<void> {
		const provider = new GoogleAuthProvider();
		// A Google különben csendben a böngésző aktív fiókját választja,
		// így több fióknál nem lehetne másikkal belépni.
		provider.setCustomParameters({ prompt: 'select_account' });
		// The resolver is handed over here rather than at startup
		// (app.config.ts): it loads Google's popup scripts, which only a
		// sign-in needs.
		await signInWithPopup(this.auth, provider, browserPopupRedirectResolver);
	}

	public async signOut(): Promise<void> {
		await signOut(this.auth);
	}
}
