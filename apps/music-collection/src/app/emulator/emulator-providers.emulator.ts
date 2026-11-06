import { Auth, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';

import type { EnvironmentProviders, Provider } from '@angular/core';
import { inject, Injectable } from '@angular/core';
import { AuthenticationProviderService } from '@music-collection/api';

/**
 * Which seeded account the sign-in button signs in with. The end-to-end tests
 * set it before the page loads (apps/music-collection-e2e); the accounts are
 * seeded into the Auth emulator by `tools/e2e/seed-emulator.mjs`.
 */
export const E2E_ACCOUNT_KEY = 'mc-e2e-account';

/** The password every seeded account shares; the seed script sets it. */
export const E2E_PASSWORD = 'e2e-password';

/**
 * The sign-in of the end-to-end build. The real one opens Google's popup,
 * which a test cannot drive; this one signs the chosen seeded account in to
 * the Auth emulator with a password instead. Everything after the sign-in —
 * the session, the user document, the permissions — runs the way it does for
 * a Google account.
 */
@Injectable()
export class EmulatorAuthenticationProviderService extends AuthenticationProviderService {
	private readonly auth: Auth = inject(Auth);

	public async signInWithGoogle(): Promise<void> {
		const account = localStorage.getItem(E2E_ACCOUNT_KEY) ?? 'collector';

		await signInWithEmailAndPassword(
			this.auth,
			`${account}@e2e.test`,
			E2E_PASSWORD
		);
	}

	public async signOut(): Promise<void> {
		await signOut(this.auth);
	}
}

export const emulatorProviders: (Provider | EnvironmentProviders)[] = [
	{
		provide: AuthenticationProviderService,
		useClass: EmulatorAuthenticationProviderService,
	},
];
