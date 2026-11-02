import { toAlbumCoverUrl } from './catalog-image-url';

/**
 * Az eset-számok a szabály leírásának §3 táblájára hivatkoznak:
 * `specs/60-artist-album-image-urls/contracts/image-url-rule.md`.
 *
 * Az 1–8. esetet a böngésző oldali párja
 * (`libs/common/engine/src/lib/image-url.spec.ts`) is állítja — ez az átfedés
 * az, ami a két megvalósítást együtt tartja. A 9. eset csak itt van: a
 * Firestore bármit adhat, a böngésző típusai nem.
 */
describe('toAlbumCoverUrl', () => {
	it('1. eset: a beírt cím előbbre való a csatolt borítónál', () => {
		expect(
			toAlbumCoverUrl('https://a/url.jpg', {
				filePath: 'https://storage/doc.jpg',
			})
		).toBe('https://a/url.jpg');
	});

	it('2. eset: ahol nincs beírt cím, a csatolt borító jön', () => {
		expect(
			toAlbumCoverUrl(null, { filePath: 'https://storage/doc.jpg' })
		).toBe('https://storage/doc.jpg');
	});

	it('3. eset: a beírt cím egymagában is borító', () => {
		expect(toAlbumCoverUrl('https://a/url.jpg', undefined)).toBe(
			'https://a/url.jpg'
		);
	});

	it('4. eset: ahol egyik sincs, nincs borító', () => {
		expect(toAlbumCoverUrl(null, undefined)).toBeNull();
	});

	it('5. eset: a kitörölt mező átengedi a csatolt borítót', () => {
		expect(
			toAlbumCoverUrl('', { filePath: 'https://storage/doc.jpg' })
		).toBe('https://storage/doc.jpg');
	});

	it('6. eset: a csak szóközt tartalmazó mező is átengedi', () => {
		expect(
			toAlbumCoverUrl('   ', { filePath: 'https://storage/doc.jpg' })
		).toBe('https://storage/doc.jpg');
	});

	it('7. eset: az üres útvonalú csatolmányon átesik', () => {
		expect(toAlbumCoverUrl('https://a/url.jpg', { filePath: '' })).toBe(
			'https://a/url.jpg'
		);
	});

	it('8. eset: ahol nincs lemez, nincs borító', () => {
		expect(toAlbumCoverUrl(undefined, undefined)).toBeNull();
	});

	it('9. eset: a rossz típusú mezőt nem borítónak olvassa', () => {
		expect(
			toAlbumCoverUrl(42, { filePath: 'https://storage/doc.jpg' })
		).toBe('https://storage/doc.jpg');
	});
});

/** A szabály teljes: bármit kap, nem dob (G2). */
describe('a szabály nem dob', () => {
	const values: unknown[] = [
		null,
		undefined,
		'',
		'   ',
		42,
		true,
		{},
		{ filePath: null },
		{ filePath: 7 },
		[],
		'https://a/url.jpg',
	];

	it.each(values)('nem dob a(z) %j címre', (url) => {
		for (const cover of values) {
			expect(() => toAlbumCoverUrl(url, cover)).not.toThrow();
		}
	});

	it('a rossz típusú csatolmányból nem olvas útvonalat', () => {
		expect(toAlbumCoverUrl(null, 42)).toBeNull();
		expect(toAlbumCoverUrl(null, 'https://storage/doc.jpg')).toBeNull();
		expect(toAlbumCoverUrl(null, { filePath: 7 })).toBeNull();
	});
});

describe('az üres és a csupa szóköz érték nincs (G3, G5)', () => {
	it('soha nem ad vissza üres szöveget', () => {
		expect(toAlbumCoverUrl('', { filePath: '' })).toBeNull();
		expect(toAlbumCoverUrl('  ', { filePath: '\t\n' })).toBeNull();
	});

	it('a címet a körülötte lévő szóközök nélkül adja vissza', () => {
		expect(toAlbumCoverUrl('  https://a/url.jpg  ', null)).toBe(
			'https://a/url.jpg'
		);
		expect(
			toAlbumCoverUrl(null, { filePath: '  https://storage/doc.jpg  ' })
		).toBe('https://storage/doc.jpg');
	});
});

describe('a válasz nem üres szöveg vagy null (G4)', () => {
	it.each([
		['https://a/url.jpg', { filePath: 'https://storage/doc.jpg' }],
		['', {}],
		['  ', { filePath: '  ' }],
		[42, 42],
		[null, { filePath: 'https://storage/doc.jpg' }],
	])('a(z) %j, %j párra', (url, cover) => {
		const answer = toAlbumCoverUrl(url, cover);

		expect(
			answer === null || (typeof answer === 'string' && answer !== '')
		).toBe(true);
	});
});
