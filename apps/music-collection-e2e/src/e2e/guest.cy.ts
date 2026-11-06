/**
 * A visitor who has not signed in: the home page and the way from it into
 * the catalog — search, the artist, the album.
 */
describe('guest', () => {
	beforeEach(() => {
		cy.resetWorld();
	});

	it('lands on the home page with the seeded collection', () => {
		cy.visit('/');
		cy.location('pathname').should('eq', '/home');
		cy.get('mc-top-bar .login-btn').should('be.visible');
		cy.get('mc-collection-big-card').should(
			'contain.text',
			'Heavy Metal Forge'
		);
	});

	it('finds an artist by search and browses to an album', () => {
		cy.visit('/home');
		cy.get('mc-home-search input').type('Iron Lan');
		cy.contains('mc-home-search [role="option"]', 'Iron Lantern').click();

		cy.location('pathname').should('eq', '/artist/e2e-iron-lantern');
		cy.contains('h1', 'Iron Lantern');
		// The discography is drawn once it scrolls into view.
		cy.get('.defer-placeholder, mc-discography-card')
			.first()
			.scrollIntoView();
		cy.contains('mc-discography-card', 'Midnight Forge')
			.find('a')
			.first()
			.click();

		cy.location('pathname').should('eq', '/album/e2e-midnight-forge');
		cy.contains('h1', 'Midnight Forge');
	});
});
