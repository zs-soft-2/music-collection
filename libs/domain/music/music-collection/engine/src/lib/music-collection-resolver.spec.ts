import {
	CountryEnum,
	FormatEnum,
	StyleEnum,
} from '@music-collection/common/api';

import {
	BAY_AREA_1988,
	BAY_AREA_1988_ALBUM_UIDS,
	album,
	artist,
	bayAreaCatalog,
} from './music-collection.fixture';
import {
	ResolvableCollection,
	resolveMusicCollection,
} from './music-collection-resolver';

const collection = (
	criteria: ResolvableCollection['criteria']
): ResolvableCollection => ({ uid: 'test', criteriaVersion: 1, criteria });

const uidsOf = (criteria: ResolvableCollection['criteria']) =>
	resolveMusicCollection(collection(criteria), bayAreaCatalog()).albums.map(
		(membership) => membership.albumUid
	);

describe('resolveMusicCollection', () => {
	it('keeps the albums every criterion holds for', () => {
		const resolved = resolveMusicCollection(
			BAY_AREA_1988,
			bayAreaCatalog()
		);

		expect(resolved.albums.map((a) => a.albumUid)).toEqual(
			BAY_AREA_1988_ALBUM_UIDS
		);
		expect(resolved.total).toBe(6);
		expect(resolved.collectionUid).toBe('bay-area-1988');
		expect(resolved.criteriaVersion).toBe(1);
	});

	it('orders by artist, then year, then title', () => {
		const resolved = resolveMusicCollection(
			BAY_AREA_1988,
			bayAreaCatalog()
		);

		expect(resolved.albums.map((a) => a.artistName)).toEqual([
			'Death Angel',
			'Exodus',
			'Forbidden',
			'Metallica',
			'Testament',
			'Vio-lence',
		]);
	});

	it('leaves out an album whose year the catalog does not know', () => {
		expect(uidsOf({ years: { equals: 1988 } })).not.toContain('undated');
	});

	it('reads `from` and `to` as a closed range', () => {
		const years = uidsOf({
			years: { from: 1988, to: 1991 },
			styles: { includesAny: [StyleEnum.Bay_Area_Thrash] },
		});

		expect(years).toContain('victims');
		expect(years).toContain('new-order');
		expect(uidsOf({ years: { from: 1989 } })).toEqual(['victims']);
	});

	it('tells the album style apart from the artist style', () => {
		const catalog = bayAreaCatalog();

		// A band that moved on: groove today, thrash on the 1988 record.
		catalog.albums.push(
			album('later', 'Later Record', 'moved-on', 'Moved On', 1988, [
				StyleEnum.Bay_Area_Thrash,
			])
		);
		catalog.artists.push(artist('moved-on', [StyleEnum.Groove]));

		const byAlbumStyle = resolveMusicCollection(
			collection({ styles: { includesAny: [StyleEnum.Bay_Area_Thrash] } }),
			catalog
		);
		const byArtistStyle = resolveMusicCollection(
			collection({
				artistStyles: { includesAny: [StyleEnum.Bay_Area_Thrash] },
			}),
			catalog
		);

		expect(byAlbumStyle.albums.map((a) => a.albumUid)).toContain('later');
		expect(byArtistStyle.albums.map((a) => a.albumUid)).not.toContain(
			'later'
		);
	});

	it('leaves out an album whose artist the catalog is missing, when the artist is asked about', () => {
		const catalog = bayAreaCatalog();

		catalog.albums.push(
			album('orphan', 'Orphan', 'unknown', 'Unknown', 1988, [
				StyleEnum.Bay_Area_Thrash,
			])
		);

		const uids = resolveMusicCollection(
			collection({ artistCountries: { includesAny: [CountryEnum.USA] } }),
			catalog
		).albums.map((a) => a.albumUid);

		expect(uids).not.toContain('orphan');
		expect(uids).toContain('new-order');
	});

	it('takes in live records or EPs when the collection asks for them', () => {
		expect(
			uidsOf({
				years: { equals: 1988 },
				styles: { includesAny: [StyleEnum.Bay_Area_Thrash] },
				albumFormats: { includesAny: [FormatEnum.lp, FormatEnum.live] },
			})
		).toContain('eindhoven');
	});

	it('matches `includesAll` only when every style is on the album', () => {
		expect(
			uidsOf({
				styles: {
					includesAll: [StyleEnum.Bay_Area_Thrash, StyleEnum.Thrash],
				},
			})
		).toContain('new-order');
		expect(
			uidsOf({
				styles: {
					includesAll: [
						StyleEnum.Bay_Area_Thrash,
						StyleEnum.Teutonic_Thrash,
					],
				},
			})
		).toEqual([]);
	});

	it('drops what `excludes` names', () => {
		const uids = uidsOf({
			years: { equals: 1988 },
			styles: { excludes: [StyleEnum.Teutonic_Thrash] },
		});

		expect(uids).not.toContain('aggression');
		expect(uids).toContain('new-order');
	});

	it('narrows to the named artists', () => {
		// Both are Testament, both 1988, so the title decides the order.
		expect(uidsOf({ artists: { includesAny: ['testament'] } })).toEqual([
			'eindhoven',
			'new-order',
		]);
	});

	it('needs one credit to satisfy both the musician and the role', () => {
		const catalog = bayAreaCatalog();

		catalog.credits = [
			{ albumUid: 'new-order', musicianUid: 'hoglan', role: 'Drums' },
			{ albumUid: 'justice', musicianUid: 'hoglan', role: 'Vocals' },
			{ albumUid: 'justice', musicianUid: 'ulrich', role: 'Drums' },
		];

		const uids = resolveMusicCollection(
			collection({
				credits: { musicians: ['hoglan'], roles: ['drums'] },
			}),
			catalog
		).albums.map((a) => a.albumUid);

		expect(uids).toEqual(['new-order']);
	});

	it('matches an empty criteria object against the whole catalog', () => {
		expect(uidsOf({})).toHaveLength(bayAreaCatalog().albums.length);
	});
});
