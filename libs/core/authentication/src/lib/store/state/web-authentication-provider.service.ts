import {
	Auth,
	GoogleAuthProvider,
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
		await signInWithPopup(this.auth, new GoogleAuthProvider());
	}

	public async signOut(): Promise<void> {
		await signOut(this.auth);
	}
}
