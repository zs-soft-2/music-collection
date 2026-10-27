import {
	ARTIST_DAYS,
	MAX_TRIES,
	RecentQuestion,
	TEMPLATE_DAYS,
	albumKey,
	gatherMaterial,
	isStale,
	randomKey,
	releasePath,
	toRecent,
} from './daily-question-compose';
import { QuestionMaterial, createRandom, hashSeed } from './daily-question';

const random = () => createRandom(hashSeed('2026-09-24'));

describe('randomKey', () => {
	it('húsz karakteres, Firestore-szerű azonosítót ad', () => {
		expect(randomKey(random())).toMatch(/^[0-9A-Za-z]{20}$/);
	});

	it('ugyanabból a napból ugyanazt a kulcsot húzza', () => {
		expect(randomKey(random())).toBe(randomKey(random()));
	});
});

describe('releasePath', () => {
	// A collection-group kurzor teljes út kell legyen, és pont ilyen mély.
	it('az előadó–album–kiadás útvonalát adja', () => {
		expect(releasePath('KEY')).toBe('artist/KEY/album/KEY/release/KEY');
	});
});

// ── Egy kis Firestore-utánzat, ami felírja, mit kérdeztek tőle ──────────────
//
// Nem az adatért van: azért, hogy az UTAKAT rögzítse. A játék egy hétig azért
// nem indult el, mert a merítés a gyökér `album` kollekciót olvasta, az
// albumok viszont az előadó alatt élnek — a lekérdezés hibátlan volt, csak
// üres. Ezt csak az fogja meg, ami azt nézi, hova nyúlt.

interface Asked {
	collections: string[];
	groups: string[];
	subcollections: string[];
	filters: string[];
}

const document = (
	id: string,
	data: Record<string, unknown>,
	asked: Asked,
	parentPath = ''
) => {
	const path = parentPath ? `${parentPath}/${id}` : id;

	return {
		id,
		exists: true,
		data: () => data,
		get: (field: string) =>
			field
				.split('.')
				.reduce<unknown>(
					(value, key) =>
						(value as Record<string, unknown> | undefined)?.[key],
					data
				),
		ref: {
			path,
			parent: { parent: { id: parentPath.split('/').slice(-2)[0] } },
			collection: (name: string) => {
				asked.subcollections.push(`${path}/${name}`);

				return query(name, asked, path);
			},
		},
	};
};

const contents: Record<string, ReturnType<typeof document>[]> = {};

const query = (name: string, asked: Asked, parentPath = '') => {
	const self = {
		where: (field: string, _operator: string, value: unknown) => {
			asked.filters.push(`${name}.${field}=${value}`);

			return self;
		},
		orderBy: () => self,
		startAt: () => self,
		limit: () => self,
		get: () =>
			Promise.resolve({
				docs: (contents[parentPath ? `${parentPath}/${name}` : name] ??
					[]) as ReturnType<typeof document>[],
				get size() {
					return this.docs.length;
				},
				get empty() {
					return !this.docs.length;
				},
			}),
	};

	return self;
};

const firestore = (asked: Asked) =>
	({
		collection: (name: string) => {
			asked.collections.push(name);

			return query(name, asked);
		},
		collectionGroup: (name: string) => {
			asked.groups.push(name);

			return query(`group:${name}`, asked);
		},
		doc: (path: string) => ({ path }),
	}) as never;

describe('gatherMaterial', () => {
	let asked: Asked;

	beforeEach(() => {
		asked = {
			collections: [],
			groups: [],
			subcollections: [],
			filters: [],
		};

		for (const key of Object.keys(contents)) delete contents[key];

		contents['artist'] = [
			document(
				'artist-1',
				{ name: 'Morbid Angel', country: 'USA', formedIn: null },
				asked,
				'artist'
			),
		];
		contents['artist/artist-1/album'] = [
			document(
				'album-1',
				{
					name: 'Altars Of Madness',
					artist: { uid: 'artist-1', name: 'Morbid Angel' },
					year: 599616000000,
					styles: ['Death Metal'],
				},
				asked,
				'artist/artist-1/album'
			),
		];
		contents['artist/artist-1/album/album-1/release'] = [
			document(
				'release-1',
				{
					name: 'Altars Of Madness',
					country: 'UK',
					label: { name: 'Earache' },
					date: 599616000000,
				},
				asked,
				'artist/artist-1/album/album-1/release'
			),
		];
		contents['track'] = [
			document(
				'track-1',
				{
					name: 'Immortal Rites',
					index: 1,
					position: 1,
					albumUid: 'album-1',
				},
				asked,
				'track'
			),
		];
		contents['membership'] = [
			document(
				'membership-1',
				{
					musicianUid: 'musician-1',
					musicianName: 'Trey Azagthoth',
					artistUid: 'artist-1',
					artistName: 'Morbid Angel',
					instruments: ['Guitar'],
					kind: 'member',
				},
				asked,
				'membership'
			),
		];
		contents['contribution'] = [
			document(
				'contribution-1',
				{
					musicianUid: 'musician-2',
					name: 'Digby Pearson',
					creditedAs: null,
					role: 'Producer',
					albumUid: 'album-1',
				},
				asked,
				'contribution'
			),
		];
	});

	it('az előadó alól veszi az albumot, nem a gyökérből', async () => {
		await gatherMaterial(firestore(asked), random());

		expect(asked.subcollections).toContain('artist/artist-1/album');
		// A gyökér `album` kollekció üres — aki innen olvas, semmit nem talál.
		expect(asked.collections).not.toContain('album');
	});

	it('a kiadásokat az album alól, a számokat a gyökérből kéri', async () => {
		await gatherMaterial(firestore(asked), random());

		expect(asked.subcollections).toContain(
			'artist/artist-1/album/album-1/release'
		);
		expect(asked.collections).toContain('track');
		expect(asked.filters).toContain('track.albumUid=album-1');
	});

	it('a hamis kiadásokat collection-groupból húzza', async () => {
		await gatherMaterial(firestore(asked), random());

		expect(asked.groups).toContain('release');
	});

	it('a számot úgy adja tovább, ahogy a sablonok várják', async () => {
		const material = await gatherMaterial(firestore(asked), random());

		// A `position` a katalógusban szám is lehet; a sablon szövegként nézi.
		expect(material?.tracks[0].position).toBe('1');
		expect(material?.album.year).toBe(1989);
		expect(material?.releases[0].labelName).toBe('Earache');
		expect(material?.artist?.name).toBe('Morbid Angel');
	});

	it('album nélküli előadóval nem ad anyagot — a hívó újat húz', async () => {
		contents['artist/artist-1/album'] = [];

		expect(await gatherMaterial(firestore(asked), random())).toBeNull();
		expect(MAX_TRIES).toBeGreaterThan(1);
	});
});

describe('gatherMaterial — emberek és borító', () => {
	let asked: Asked;

	beforeEach(() => {
		asked = {
			collections: [],
			groups: [],
			subcollections: [],
			filters: [],
		};

		for (const key of Object.keys(contents)) delete contents[key];

		contents['artist'] = [
			document(
				'artist-1',
				{ name: 'Morbid Angel', country: 'USA', formedIn: 1983 },
				asked,
				'artist'
			),
		];
		contents['artist/artist-1/album'] = [
			document(
				'album-1',
				{
					name: 'Altars Of Madness',
					artist: { uid: 'artist-1', name: 'Morbid Angel' },
					year: 599616000000,
					styles: ['Death Metal'],
					genre: 'Rock',
					coverImage: { filePath: 'https://example.invalid/a.jpg' },
				},
				asked,
				'artist/artist-1/album'
			),
		];
		contents['membership'] = [
			document(
				'membership-1',
				{
					musicianUid: 'musician-1',
					musicianName: 'Trey Azagthoth',
					artistUid: 'artist-1',
					artistName: 'Morbid Angel',
					instruments: ['Guitar'],
					kind: 'member',
				},
				asked,
				'membership'
			),
		];
		contents['contribution'] = [
			document(
				'contribution-1',
				{
					musicianUid: 'musician-2',
					name: 'Digby Pearson',
					creditedAs: 'Dig',
					role: 'Producer',
					albumUid: 'album-1',
				},
				asked,
				'contribution'
			),
		];
	});

	it('a felállást az előadóra, a stáblistát az albumra szűrve kéri', async () => {
		await gatherMaterial(firestore(asked), random());

		expect(asked.filters).toContain('membership.artistUid=artist-1');
		expect(asked.filters).toContain('contribution.albumUid=album-1');
	});

	it('a borítót és a műfajt átveszi az albumról', async () => {
		const material = await gatherMaterial(firestore(asked), random());

		expect(material?.album.coverUrl).toBe('https://example.invalid/a.jpg');
		expect(material?.album.genre).toBe('Rock');
	});

	it('a közreműködőt azon a néven adja, ahogy a lemezen szerepel', async () => {
		const material = await gatherMaterial(firestore(asked), random());

		expect(material?.credits[0]).toMatchObject({
			name: 'Dig',
			role: 'Producer',
		});
	});

	it('a saját zenekar tagja nem csali a többi zenekar tagjai közt', async () => {
		const material = await gatherMaterial(firestore(asked), random());

		expect(
			material?.otherMembers.some(
				(member) => member.artistUid === 'artist-1'
			)
		).toBe(false);
	});
});

// ── A közelmúlt ────────────────────────────────────────────────────────────

const asked_ = (templateKey: string, artist: string, album?: string) =>
	({
		templateKey,
		params: album ? { artist, album } : { artist },
	}) as RecentQuestion;

describe('toRecent', () => {
	it('a sablonokat csak egy hétre visszamenőleg kerüli', () => {
		const rows = Array.from({ length: TEMPLATE_DAYS + 3 }, (_, index) =>
			asked_(`template-${index}`, `Artist ${index}`, `Album ${index}`)
		);

		const recent = toRecent(rows);

		expect(recent.templateKeys).toHaveLength(TEMPLATE_DAYS);
		expect(recent.templateKeys[0]).toBe('template-0');
		expect(recent.templateKeys).not.toContain(`template-${TEMPLATE_DAYS}`);
	});

	it('a lemezt viszont az egész ablakban számon tartja', () => {
		const rows = Array.from({ length: TEMPLATE_DAYS + 3 }, (_, index) =>
			asked_(`template-${index}`, `Artist ${index}`, `Album ${index}`)
		);

		expect(toRecent(rows).albums).toContain(
			albumKey(
				`Artist ${TEMPLATE_DAYS + 2}`,
				`Album ${TEMPLATE_DAYS + 2}`
			)
		);
	});

	it('az előadót csak néhány napig — tőle hamarabb jöhet újra kérdés', () => {
		const rows = Array.from({ length: ARTIST_DAYS + 2 }, (_, index) =>
			asked_(`template-${index}`, `Artist ${index}`, `Album ${index}`)
		);

		const recent = toRecent(rows);

		expect(recent.artists).toContain('artist 0');
		expect(recent.artists).not.toContain(`artist ${ARTIST_DAYS}`);
	});

	it('a lemez nélküli kérdést sem hagyja figyelmen kívül', () => {
		const recent = toRecent([asked_('artistCountry', 'Morbid Angel')]);

		expect(recent.artists).toContain('morbid angel');
		expect(recent.albums.size).toBe(0);
	});
});

describe('isStale', () => {
	const material = (name: string, artistName: string) =>
		({ album: { name, artistName } }) as QuestionMaterial;

	it('a múlt heti lemezt kerüli — az írásmódtól függetlenül', () => {
		const recent = toRecent([
			asked_('albumYear', 'Morbid Angel', 'Altars Of Madness'),
		]);

		expect(
			isStale(material('  altars of madness ', 'MORBID ANGEL'), recent)
		).toBe(true);
	});

	it('a tegnapi előadó másik lemeze sem érdekes', () => {
		const recent = toRecent([
			asked_('albumYear', 'Morbid Angel', 'Altars Of Madness'),
		]);

		expect(
			isStale(material('Blessed Are The Sick', 'Morbid Angel'), recent)
		).toBe(true);
	});

	it('amiről rég nem volt kérdés, az mehet', () => {
		const recent = toRecent([
			asked_('albumYear', 'Morbid Angel', 'Altars Of Madness'),
		]);

		expect(isStale(material('Reign In Blood', 'Slayer'), recent)).toBe(
			false
		);
	});
});
