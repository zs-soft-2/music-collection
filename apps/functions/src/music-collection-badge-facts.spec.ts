import { Firestore } from 'firebase-admin/firestore';

import {
	BadgeFactsRequest,
	readBadgeFacts,
} from './music-collection-badge-facts';

// ── Firestore-utánzat ─────────────────────────────────────────────────────
//
// Két út vezet lemezekhez, és az utánzatnak mindkettőt tudnia kell: az
// előadó allekérdezését és a stílusra menő collection-group lekérdezést. A
// `select` és a `limit` csak továbbadja magát — amit szűrnek, azt a valódi
// adatbázis szűri, és nem ezen a kódon múlik.

type Doc = Record<string, unknown>;

interface Catalog {
	artists: Record<string, Doc>;
	albums: Record<string, Doc[]>;
	/** Dobjon-e a collection-group lekérdezés — hiányzó index utánzata. */
	groupFails?: boolean;
}

function fakeDatabase(catalog: Catalog): Firestore {
	const result = (documents: Doc[]) => ({
		docs: documents.map((data) => ({ data: () => data })),
	});
	const query = (documents: Doc[], fails = false): any => ({
		limit: () => query(documents, fails),
		// A valódi lekérdezés az indexen szűr, tehát az utánzatnak is kell:
		// enélkül a stílusra menő ág mindent visszaadna, és a teszt nem
		// mondana semmit arról, amit a `where` kiválaszt.
		where: (field: string, _operator: string, value: string) =>
			query(
				documents.filter((document) =>
					((document[field] ?? []) as string[]).includes(value)
				),
				fails
			),
		select: () => ({
			get: async () => {
				if (fails) {
					throw new Error('nincs index');
				}

				return result(documents);
			},
		}),
	});

	return {
		collection: (name: string) => ({
			doc: (uid: string) => ({
				path: `${name}/${uid}`,
				collection: () => query(catalog.albums[uid] ?? []),
			}),
		}),
		collectionGroup: () =>
			query(
				Object.values(catalog.albums).flat(),
				catalog.groupFails ?? false
			),
		getAll: async (...references: { path: string }[]) =>
			references.map((reference) => {
				const data = catalog.artists[reference.path.split('/')[1]];

				return { get: (field: string) => data?.[field] };
			}),
	} as unknown as Firestore;
}

function request(
	overrides: Partial<BadgeFactsRequest> = {}
): BadgeFactsRequest {
	return {
		artistUids: [],
		albumStyles: [],
		namedStyles: [],
		years: { from: null, to: null, equals: null },
		formats: [],
		...overrides,
	};
}

const MEGADETH = {
	artists: {
		megadeth: { name: 'Megadeth', styles: ['Hard rock', 'Thrash'] },
	},
	albums: {
		megadeth: [
			{
				name: 'Killing Is My Business',
				year: 1985,
				styles: ['Thrash'],
				format: 'lp',
				coverImage: { filePath: 'https://example.test/kimb.jpg' },
			},
			{
				name: 'Rust in Peace',
				year: 1990,
				styles: ['Thrash'],
				format: 'lp',
				coverImageUrl: 'https://example.test/rust.jpg',
			},
			{
				name: 'Risk',
				year: 1999,
				styles: ['Hard rock'],
				format: 'lp',
				coverImage: null,
			},
		],
	},
};

describe('a collection tényei', () => {
	it('az előadó lemezeit olvassa be, a kiadás sorrendjében', async () => {
		const facts = await readBadgeFacts(
			fakeDatabase(MEGADETH),
			request({ artistUids: ['megadeth'] })
		);

		expect(facts.albums.map((album) => album.year)).toEqual([
			1985, 1990, 1999,
		]);
		expect(facts.artistNames).toEqual(['Megadeth']);
	});

	it('a borítót a csatolt fájlból vagy a külső címből veszi', async () => {
		const facts = await readBadgeFacts(
			fakeDatabase(MEGADETH),
			request({ artistUids: ['megadeth'] })
		);

		expect(facts.albums.map((album) => album.coverUrl)).toEqual([
			'https://example.test/kimb.jpg',
			'https://example.test/rust.jpg',
			null,
		]);
	});

	it('az előadó stílusait tartalékként hozza, nem döntésként', async () => {
		// Ez a tömb kezdte az egészet: a „Hard rock" áll benne elöl, és
		// amíg ez volt az első forrás, a Megadeth kapott egy pikk ászt.
		const facts = await readBadgeFacts(
			fakeDatabase(MEGADETH),
			request({ artistUids: ['megadeth'] })
		);

		expect(facts.artistStyles).toEqual(['Hard rock', 'Thrash']);
	});

	it('kiszűri, amit a szabály éve kizár', async () => {
		const facts = await readBadgeFacts(
			fakeDatabase(MEGADETH),
			request({
				artistUids: ['megadeth'],
				years: { from: 1986, to: 1995, equals: null },
			})
		);

		expect(facts.albums.map((album) => album.name)).toEqual([
			'Rust in Peace',
		]);
	});

	it('kiszűri, amit a szabály hordozója kizár', async () => {
		const facts = await readBadgeFacts(
			fakeDatabase(MEGADETH),
			request({ artistUids: ['megadeth'], formats: ['cd'] })
		);

		expect(facts.albums).toEqual([]);
	});

	it('az előadó stílusneve nem szűr ki lemezeket', async () => {
		// Egy lemez a saját stílusait hordozza, az előadóét nem: egy
		// `artistStyles` szabály másképp az összes lemezét eldobná.
		const facts = await readBadgeFacts(
			fakeDatabase(MEGADETH),
			request({ artistUids: ['megadeth'], namedStyles: ['Heavy metal'] })
		);

		expect(facts.albums).toHaveLength(3);
	});

	it('előadó nélkül a megnevezett stílus lemezeit kérdezi', async () => {
		const facts = await readBadgeFacts(
			fakeDatabase(MEGADETH),
			request({ namedStyles: ['Thrash'] })
		);

		expect(facts.albums.map((album) => album.name)).toEqual([
			'Killing Is My Business',
			'Rust in Peace',
		]);
		expect(facts.artistNames).toEqual([]);
	});

	it('hiányzó index esetén üres kézzel tér vissza, nem hibával', async () => {
		// A jelvény ilyenkor annyit tud, amennyit a szabály kimond —
		// ugyanazt, amit a szintek előtt tudott.
		const facts = await readBadgeFacts(
			fakeDatabase({ ...MEGADETH, groupFails: true }),
			request({ namedStyles: ['Thrash'] })
		);

		expect(facts.albums).toEqual([]);
	});

	it('se előadó, se stílus: nem olvas lemezt', async () => {
		const facts = await readBadgeFacts(fakeDatabase(MEGADETH), request());

		expect(facts.albums).toEqual([]);
		expect(facts.artistStyles).toEqual([]);
	});

	it('a stílus nélkül importált lemezt nem dobja el', async () => {
		// Egy stílus nélküli lemez attól még az előadóé, és a címe meg a
		// borítója ugyanúgy a collectionről beszél.
		const facts = await readBadgeFacts(
			fakeDatabase({
				artists: { a: { name: 'A', styles: [] } },
				albums: { a: [{ name: 'Néma', year: 1988, styles: [] }] },
			}),
			request({ artistUids: ['a'], albumStyles: ['Thrash'] })
		);

		expect(facts.albums.map((album) => album.name)).toEqual(['Néma']);
	});
});
