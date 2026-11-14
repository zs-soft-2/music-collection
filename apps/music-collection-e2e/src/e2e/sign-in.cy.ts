/**
 * Signing in and out through the top bar. In the emulator build the button
 * signs a seeded account in to the Auth emulator instead of opening Google's
 * popup (emulator-providers.emulator.ts); the session, the guards and the
 * permissions behind it are the app's own.
 */
describe('sign-in', () => {
	beforeEach(() => {
		cy.resetWorld();
	});

	it('keeps a guest out of the pages of a collection', () => {
		cy.visit('/collection');
		cy.location('pathname').should('not.eq', '/collection');
	});

	it('signs the collector in, opens their collection and signs out', () => {
		cy.signInAs('collector');

		cy.get('mc-top-bar .avatar-btn').click();
		cy.get('mc-top-bar .menu-user').should(
			'contain.text',
			'Erika Collector'
		);
		// No admin entry for a collector.
		cy.get('mc-top-bar .menu a[href="/admin"]').should('not.exist');

		cy.get('mc-top-bar .menu a[href="/collection"]').click();
		cy.location('pathname').should('eq', '/collection');

		// The session outlives a reload: it is kept in the browser.
		cy.reload();
		cy.get('mc-top-bar .avatar-btn').should('be.visible');

		cy.get('mc-top-bar .avatar-btn').click();
		cy.get('mc-top-bar [role="menu"] > button.menu-item').click();
		cy.get('mc-top-bar .login-btn').should('be.visible');
	});
});
