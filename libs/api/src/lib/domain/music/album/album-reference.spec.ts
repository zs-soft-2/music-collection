import type { AlbumDocument, AlbumEntity } from './album';
import { toAlbumReference } from './album-reference';

const cover = {
	entityType: 'Document',
	filePath: 'https://storage/cover.jpg',
	name: 'cover.jpg',
	uid: 'doc-1',
} as unknown as AlbumDocument;

describe('toAlbumReference', () => {
	/**
	 * An admin who re-picks the album on a wish puts the whole album into the
	 * form: only the reference fields may reach the stored wish.
	 */
	it('keeps exactly the reference fields of a whole album', () => {
		const album = {
			uid: 'al1',
			name: 'Bonded by Blood',
			coverImage: cover,
			coverImageUrl: 'https://a/url.jpg',
			format: 'LP',
			genre: 'Metal',
			songs: [],
			styles: [],
		} as unknown as AlbumEntity;

		const reference = toAlbumReference(album);

		expect(Object.keys(reference).sort()).toEqual([
			'coverImage',
			'coverImageUrl',
			'name',
			'uid',
		]);
		expect(reference).toEqual({
			uid: 'al1',
			name: 'Bonded by Blood',
			coverImage: cover,
			coverImageUrl: 'https://a/url.jpg',
		});
	});

	it('stores no address as null', () => {
		expect(
			toAlbumReference({ uid: 'al1', name: 'X', coverImage: cover })
				.coverImageUrl
		).toBeNull();
	});

	it('stores no attachment as null', () => {
		expect(
			toAlbumReference({
				uid: 'al1',
				name: 'X',
				coverImageUrl: 'https://a/url.jpg',
			} as Parameters<typeof toAlbumReference>[0]).coverImage
		).toBeNull();
	});

	/** The readers decide what counts as an address, not the writer. */
	it('passes the address on as entered', () => {
		expect(
			toAlbumReference({
				uid: 'al1',
				name: 'X',
				coverImage: null,
				coverImageUrl: '  x  ',
			}).coverImageUrl
		).toBe('  x  ');
	});
});
