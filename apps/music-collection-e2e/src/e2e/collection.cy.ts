/**
 * A signed-in collector files a record into their collection, and wishes for
 * another: the writes go through the app's sync wrapper to the Firestore
 * emulator, under the real `firestore.rules`.
 */
interface StoredDocument {
	id: string;
	userId?: string;
	release?: { uid: string };
	albumReference?: { uid: string };
}

const COLLECTOR = 'e2e-collector';

describe('collection and wishlist', () => {
	beforeEach(() => {
		cy.resetWorld();
		cy.signInAs('collector');
	});

	it('adds an album to the collection', () => {
		cy.visit('/album/e2e-midnight-forge');
		cy.contains('h1', 'Midnight Forge');

		cy.get('[data-collect-toggle]').click();
		// The seeded UK pressing.
		cy.contains(
			'mc-release-picker button.option:not(.route)',
			'UK'
		).click();
		cy.get('mc-release-picker .confirm-add').click();

		// The album page counts the copy at once…
		cy.get('[data-collect-toggle]').should(
			'contain.text',
			'Add another copy'
		);

		// …the database has it, under the collector…
		cy.documentsOf<StoredDocument>(`user/${COLLECTOR}/collection-item`, {
			userId: COLLECTOR,
		}).then((items) => {
			expect(items).to.have.length(1);
			expect(items[0].userId).to.eq(COLLECTOR);
			expect(items[0].release?.uid).to.eq('e2e-midnight-forge-uk');
		});

		// …and so does the shelf.
		cy.visit('/collection');
		cy.contains('Midnight Forge').should('exist');
	});

	it('puts an album on the wishlist', () => {
		cy.visit('/album/e2e-slow-tide');
		cy.contains('h1', 'Slow Tide');

		cy.get('[data-wish-toggle]').click();
		cy.get('mc-wishlist-dialog').within(() => {
			cy.get('button[type="submit"]').click();
		});

		cy.get('.wanted-chip').should('be.visible');

		cy.documentsOf<StoredDocument>(`user/${COLLECTOR}/wishlist-item`, {
			'albumReference.uid': 'e2e-slow-tide',
		}).then((wishes) => {
			expect(wishes).to.have.length(1);
			expect(wishes[0].albumReference?.uid).to.eq('e2e-slow-tide');
		});

		cy.visit('/wishlist');
		cy.contains('Slow Tide').should('exist');
	});
});
