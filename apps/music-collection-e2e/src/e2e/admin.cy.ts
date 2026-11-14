/**
 * The admin: open only to the `ADMIN` permission (the seeded
 * `effective_permissions`), and one edit through it that the catalog shows.
 */
interface StoredArtist {
	id: string;
	description?: string;
}

describe('admin', () => {
	beforeEach(() => {
		cy.resetWorld();
	});

	it('is closed to a guest', () => {
		cy.visit('/admin');
		cy.location('pathname').should('eq', '/error');
	});

	it('is closed to a collector without the permission', () => {
		cy.signInAs('collector');
		cy.visit('/admin/artist');
		cy.location('pathname').should('eq', '/error');
	});

	it('lets an admin edit an artist, and the catalog shows the edit', () => {
		const description = 'Rewritten in the admin by the end-to-end test.';

		cy.signInAs('admin');

		cy.get('mc-top-bar .avatar-btn').click();
		cy.get('mc-top-bar .menu a[href="/admin"]').click();
		cy.location('pathname').should('match', /^\/admin/);

		cy.visit('/admin/artist/edit/e2e-iron-lantern');
		cy.get('mc-artist-form input#name').should(
			'have.value',
			'Iron Lantern'
		);
		// On a cold start the form is filled again once the server's copy of
		// the artist arrives, which can land in the middle of the typing; so
		// the text goes in until it stays.
		const fill = (attempt = 1): void => {
			cy.get('mc-artist-form textarea#description').clear();
			cy.get('mc-artist-form textarea#description').type(description);
			cy.get('mc-artist-form textarea#description').then(($textarea) => {
				if ($textarea.val() !== description && attempt < 3) {
					fill(attempt + 1);
				}
			});
		};

		cy.get('mc-artist-form textarea#description').should(
			'not.have.value',
			''
		);
		fill();
		cy.get('mc-artist-form textarea#description').should(
			'have.value',
			description
		);
		cy.get('mc-artist-form .mc-form-actions p-button')
			.last()
			.find('button')
			.click();

		const ironLantern = (artists: StoredArtist[]) =>
			artists.find(({ id }) => id === 'e2e-iron-lantern');

		cy.documentsOf<StoredArtist>('artist', { description }).then(
			(artists) => {
				expect(ironLantern(artists)?.description).to.eq(description);
			}
		);

		cy.visit('/artist/e2e-iron-lantern');
		cy.contains(description).should('exist');
	});
});
