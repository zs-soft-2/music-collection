import {
	AlbumImageSource,
	ArtistImageSource,
	toAlbumCoverUrl,
	toArtistHeaderUrl,
	toArtistImageUrl,
} from './image-url';

/**
 * The case numbers refer to the table in
 * `specs/60-artist-album-image-urls/contracts/image-url-rule.md` §3, which is
 * the one written statement of the order. Album-cover cases 1-8 are asserted
 * here *and* in `apps/functions/src/catalog-image-url.spec.ts`; that overlap is
 * what keeps the two implementations from drifting.
 */
describe('toAlbumCoverUrl', () => {
	it('case 1: the entered address wins over the attached cover', () => {
		expect(
			toAlbumCoverUrl({
				coverImageUrl: 'https://a/url.jpg',
				coverImage: { filePath: 'https://storage/doc.jpg' },
			})
		).toBe('https://a/url.jpg');
	});

	it('case 2: the attachment is still consulted when nothing is entered', () => {
		expect(
			toAlbumCoverUrl({
				coverImageUrl: null,
				coverImage: { filePath: 'https://storage/doc.jpg' },
			})
		).toBe('https://storage/doc.jpg');
	});

	it('case 3: the entered address alone is a cover', () => {
		expect(toAlbumCoverUrl({ coverImageUrl: 'https://a/url.jpg' })).toBe(
			'https://a/url.jpg'
		);
	});

	it('case 4: neither is no cover', () => {
		expect(toAlbumCoverUrl({ coverImageUrl: null })).toBeNull();
	});

	it('case 5: a cleared field falls through to the attachment', () => {
		expect(
			toAlbumCoverUrl({
				coverImageUrl: '',
				coverImage: { filePath: 'https://storage/doc.jpg' },
			})
		).toBe('https://storage/doc.jpg');
	});

	it('case 6: a whitespace-only field falls through to the attachment', () => {
		expect(
			toAlbumCoverUrl({
				coverImageUrl: '   ',
				coverImage: { filePath: 'https://storage/doc.jpg' },
			})
		).toBe('https://storage/doc.jpg');
	});

	it('case 7: an attachment with an empty path falls through', () => {
		expect(
			toAlbumCoverUrl({
				coverImageUrl: 'https://a/url.jpg',
				coverImage: { filePath: '' },
			})
		).toBe('https://a/url.jpg');
	});

	it('case 8: no album is no cover', () => {
		expect(toAlbumCoverUrl(null)).toBeNull();
	});
});

describe('toArtistImageUrl', () => {
	it('case 10: the entered address wins over the attachment and the import', () => {
		expect(
			toArtistImageUrl({
				imageUrl: 'https://a/url.jpg',
				mainImage: { filePath: 'https://storage/main.jpg' },
				discogs: { imageUrl: 'https://discogs/x.jpg' },
			})
		).toBe('https://a/url.jpg');
	});

	it('case 11: the attachment comes next', () => {
		expect(
			toArtistImageUrl({
				imageUrl: null,
				mainImage: { filePath: 'https://storage/main.jpg' },
				discogs: { imageUrl: 'https://discogs/x.jpg' },
			})
		).toBe('https://storage/main.jpg');
	});

	it('case 12: the imported photo stays the last resort', () => {
		expect(
			toArtistImageUrl({
				imageUrl: null,
				discogs: { imageUrl: 'https://discogs/x.jpg' },
			})
		).toBe('https://discogs/x.jpg');
	});

	it('case 13: the entered address alone is a photo', () => {
		expect(toArtistImageUrl({ imageUrl: 'https://a/url.jpg' })).toBe(
			'https://a/url.jpg'
		);
	});

	it('case 14: neither is no photo', () => {
		expect(toArtistImageUrl({ imageUrl: null })).toBeNull();
	});

	it('case 15: no artist is no photo', () => {
		expect(toArtistImageUrl(null)).toBeNull();
	});
});

describe('toArtistHeaderUrl', () => {
	it('case 16: the attached header keeps precedence over the entered address', () => {
		expect(
			toArtistHeaderUrl({
				headerImage: { filePath: 'https://storage/header.jpg' },
				imageUrl: 'https://a/url.jpg',
				mainImage: { filePath: 'https://storage/main.jpg' },
			})
		).toBe('https://storage/header.jpg');
	});

	it('case 17: without an attached header it follows the photo order', () => {
		expect(
			toArtistHeaderUrl({
				imageUrl: 'https://a/url.jpg',
				mainImage: { filePath: 'https://storage/main.jpg' },
			})
		).toBe('https://a/url.jpg');
	});

	it('case 18: and falls through to the attached main picture', () => {
		expect(
			toArtistHeaderUrl({
				imageUrl: null,
				mainImage: { filePath: 'https://storage/main.jpg' },
			})
		).toBe('https://storage/main.jpg');
	});

	it('case 19: a header with an empty path is no header', () => {
		expect(
			toArtistHeaderUrl({
				headerImage: { filePath: '' },
				imageUrl: 'https://a/url.jpg',
			})
		).toBe('https://a/url.jpg');
	});

	it('is no header where the artist has no picture at all', () => {
		expect(toArtistHeaderUrl(null)).toBeNull();
	});
});

/** The guarantees of the contract's §1, the ones a call site relies on. */
describe('the rule is total (G2)', () => {
	const partials: (AlbumImageSource & ArtistImageSource)[] = [
		{},
		{ coverImage: null, mainImage: null, headerImage: null, discogs: null },
		{ coverImage: {}, mainImage: {}, headerImage: {}, discogs: {} },
		{
			coverImageUrl: undefined,
			coverImage: { filePath: undefined },
			imageUrl: undefined,
			mainImage: { filePath: null },
		},
	];

	it.each([null, undefined])('never throws for %p', (album) => {
		expect(() => toAlbumCoverUrl(album)).not.toThrow();
		expect(() => toArtistImageUrl(album)).not.toThrow();
		expect(() => toArtistHeaderUrl(album)).not.toThrow();
	});

	it.each(partials)('never throws for %j, and answers null', (partial) => {
		expect(toAlbumCoverUrl(partial)).toBeNull();
		expect(toArtistImageUrl(partial)).toBeNull();
		expect(toArtistHeaderUrl(partial)).toBeNull();
	});
});

describe('an empty or blank value is absent (G3, G5)', () => {
	it('never returns an empty string', () => {
		expect(toAlbumCoverUrl({ coverImageUrl: '', coverImage: { filePath: '' } })).toBeNull();
		expect(
			toArtistImageUrl({
				imageUrl: '',
				mainImage: { filePath: '' },
				discogs: { imageUrl: '' },
			})
		).toBeNull();
		expect(
			toArtistHeaderUrl({ headerImage: { filePath: '' }, imageUrl: '' })
		).toBeNull();
	});

	it('reads a whitespace-only value as absent at every step', () => {
		expect(
			toAlbumCoverUrl({ coverImageUrl: ' ', coverImage: { filePath: '\t\n' } })
		).toBeNull();
		expect(
			toArtistImageUrl({
				imageUrl: ' ',
				mainImage: { filePath: '  ' },
				discogs: { imageUrl: 'https://discogs/x.jpg' },
			})
		).toBe('https://discogs/x.jpg');
		expect(
			toArtistHeaderUrl({
				headerImage: { filePath: '  ' },
				imageUrl: 'https://a/url.jpg',
			})
		).toBe('https://a/url.jpg');
	});

	it('hands back the address without the surrounding whitespace', () => {
		expect(toAlbumCoverUrl({ coverImageUrl: '  https://a/url.jpg  ' })).toBe(
			'https://a/url.jpg'
		);
		expect(toArtistImageUrl({ imageUrl: '  https://a/url.jpg  ' })).toBe(
			'https://a/url.jpg'
		);
	});
});

describe('the answer is a non-empty string or null (G4)', () => {
	const sources: (AlbumImageSource & ArtistImageSource)[] = [
		{},
		{ coverImageUrl: 'https://a/url.jpg', imageUrl: 'https://a/url.jpg' },
		{ coverImageUrl: '  ', imageUrl: '  ' },
		{
			coverImage: { filePath: 'https://storage/doc.jpg' },
			mainImage: { filePath: 'https://storage/main.jpg' },
			headerImage: { filePath: 'https://storage/header.jpg' },
		},
	];

	it.each(sources)('answers %j with a non-empty string or null', (source) => {
		for (const answer of [
			toAlbumCoverUrl(source),
			toArtistImageUrl(source),
			toArtistHeaderUrl(source),
		]) {
			expect(answer === null || (typeof answer === 'string' && answer !== '')).toBe(
				true
			);
		}
	});
});

describe('the rule is pure (G1)', () => {
	it('leaves its argument alone', () => {
		const album = {
			coverImageUrl: 'https://a/url.jpg',
			coverImage: { filePath: 'https://storage/doc.jpg' },
		};
		const snapshot = JSON.stringify(album);

		toAlbumCoverUrl(album);

		expect(JSON.stringify(album)).toBe(snapshot);
	});
});
