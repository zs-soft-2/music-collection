/**
 * The steps every end-to-end test shares. They assume the `emulator`
 * configuration: the app talks to the Firebase emulators, which the `seed`
 * task fills (tools/e2e/seed-emulator.mjs).
 */

/** The seeded accounts (tools/e2e/seed-emulator.mjs — ACCOUNTS). */
type Account = 'collector' | 'admin';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Cypress {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	interface Chainable<Subject> {
		/** Fresh emulator data and a browser that remembers nothing of it. */
		resetWorld(): Chainable<void>;
		/** Signs in through the top bar's button as a seeded account. */
		signInAs(account: 'collector' | 'admin'): Chainable<void>;
		/**
		 * The documents of a collection in the emulator, once one of them
		 * carries the fields of `where` (dotted paths) or the wait is over:
		 * a write the page shows at once may still be on its way to the
		 * server (tools/e2e/seed-emulator.mjs — waitForDocuments).
		 */
		documentsOf<T>(
			path: string,
			where: Record<string, unknown>
		): Chainable<T[]>;
	}
}

/** Same origin as the app, without starting it. */
const BLANK = '/__e2e-blank';

/** Which account the emulator build's sign-in uses (emulator-providers.emulator.ts). */
const ACCOUNT_KEY = 'mc-e2e-account';

Cypress.Commands.add('resetWorld', () => {
	cy.task('seed', null, { timeout: 60000 });

	// The app keeps the Firestore cache and the session in IndexedDB, which
	// Cypress does not clear between tests. Dropped from a page of the app's
	// origin that does not open them, so nothing holds them open.
	cy.intercept('GET', BLANK, {
		statusCode: 200,
		headers: { 'content-type': 'text/html' },
		body: '<!doctype html><title>blank</title>',
	});
	cy.visit(BLANK);
	cy.window().then(async (win) => {
		const databases = await win.indexedDB.databases();

		await Promise.all(
			databases.map(
				({ name }) =>
					new Promise<void>((resolve, reject) => {
						if (!name) {
							resolve();
							return;
						}
						const request = win.indexedDB.deleteDatabase(name);

						request.onsuccess = () => resolve();
						request.onerror = () => reject(request.error);
						request.onblocked = () => resolve();
					})
			)
		);
		win.localStorage.clear();
		win.sessionStorage.clear();
	});
});

Cypress.Commands.add('signInAs', (account: Account) => {
	cy.window().then((win) => win.localStorage.setItem(ACCOUNT_KEY, account));
	cy.visit('/home');
	cy.get('mc-top-bar .login-btn').click();
	cy.get('mc-top-bar .login-btn').should('not.exist');
});

Cypress.Commands.add(
	'documentsOf',
	<T>(path: string, where: Record<string, unknown>) =>
		cy.task<T[]>('documentsOf', { path, where }, { timeout: 30000 })
);
