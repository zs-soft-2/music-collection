import { GLOBAL_OWNER_ID, isGlobalEntity, ownerIdOf, withOwner } from './meta';

describe('meta', () => {
	describe('ownerIdOf', () => {
		it('reads a document written before owners as the catalog own', () => {
			expect(ownerIdOf({ name: 'Amon Amarth' } as never)).toBe(
				GLOBAL_OWNER_ID
			);
		});

		it('reads an empty meta the same way', () => {
			expect(ownerIdOf({ meta: {} })).toBe(GLOBAL_OWNER_ID);
		});

		it('says the collector who made it', () => {
			expect(ownerIdOf({ meta: { ownerId: 'collector-1' } })).toBe(
				'collector-1'
			);
		});

		it('survives a missing entity', () => {
			expect(ownerIdOf(null)).toBe(GLOBAL_OWNER_ID);
			expect(ownerIdOf(undefined)).toBe(GLOBAL_OWNER_ID);
		});
	});

	describe('isGlobalEntity', () => {
		it('lets the catalog through', () => {
			expect(isGlobalEntity({ meta: { ownerId: GLOBAL_OWNER_ID } })).toBe(
				true
			);
		});

		it('keeps what a collector made out', () => {
			expect(isGlobalEntity({ meta: { ownerId: 'collector-1' } })).toBe(
				false
			);
		});
	});

	describe('withOwner', () => {
		it('stamps the owner', () => {
			expect(withOwner({ name: 'Pozvakowski' }, 'collector-1')).toEqual({
				name: 'Pozvakowski',
				meta: { ownerId: 'collector-1' },
			});
		});

		it('keeps what meta already held', () => {
			expect(
				withOwner(
					{ meta: { lastUpdated: '2026-09-26' } },
					GLOBAL_OWNER_ID
				)
			).toEqual({
				meta: { lastUpdated: '2026-09-26', ownerId: GLOBAL_OWNER_ID },
			});
		});

		it('hands the document back unchanged apart from the stamp', () => {
			const artist = { name: 'Amon Amarth', styles: ['Death Metal'] };

			expect(withOwner(artist, GLOBAL_OWNER_ID)).toMatchObject(artist);
			expect(artist).not.toHaveProperty('meta');
		});
	});
});
