import {
	MaterialTrack,
	OPTION_COUNT,
	QuestionDifficulty,
	QuestionMaterial,
	TEMPLATES,
	albumTracks,
	buildQuestion,
	createRandom,
	difficultyForDay,
	draftsFor,
	hashSeed,
	previousDay,
	shuffle,
	toAnswerDocument,
	toQuestionDocument,
	yearOf,
} from './daily-question';

const random = () => createRandom(hashSeed('2026-09-24'));

const track = (overrides: Partial<MaterialTrack> = {}): MaterialTrack => ({
	uid: 'track-1',
	name: 'Master of Puppets',
	index: 1,
	position: 'A1',
	durationSec: 515,
	releaseUid: null,
	...overrides,
});

const tracks: MaterialTrack[] = [
	track({ uid: 'track-1', name: 'Battery', index: 1, position: 'A1', durationSec: 312 }),
	track({
		uid: 'track-2',
		name: 'Master of Puppets',
		index: 2,
		position: 'A2',
		durationSec: 515,
	}),
	track({ uid: 'track-3', name: 'The Thing That Should Not Be', index: 3, position: 'A3', durationSec: 396 }),
	track({ uid: 'track-4', name: 'Welcome Home (Sanitarium)', index: 4, position: 'B1', durationSec: 386 }),
	track({ uid: 'track-5', name: 'Disposable Heroes', index: 5, position: 'B2', durationSec: 496 }),
	track({ uid: 'track-6', name: 'Leper Messiah', index: 6, position: 'B3', durationSec: 340 }),
];

const material = (overrides: Partial<QuestionMaterial> = {}): QuestionMaterial => ({
	album: {
		uid: 'album-motp',
		name: 'Master of Puppets',
		artistUid: 'artist-metallica',
		artistName: 'Metallica',
		year: 1986,
		styles: ['Thrash'],
	},
	artist: {
		uid: 'artist-metallica',
		name: 'Metallica',
		country: 'USA',
		formedIn: 1981,
	},
	tracks,
	releases: [
		{
			uid: 'release-motp-de',
			name: 'Master of Puppets',
			catno: 'MOVLP2620',
			country: 'Germany',
			labelName: 'Music On Vinyl',
			year: 1986,
		},
	],
	siblingAlbums: [
		{
			uid: 'album-ride',
			name: 'Ride the Lightning',
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			year: 1984,
			styles: [],
		},
		{
			uid: 'album-justice',
			name: '…And Justice for All',
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			year: 1988,
			styles: [],
		},
		{
			uid: 'album-black',
			name: 'Metallica',
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			year: 1991,
			styles: [],
		},
	],
	otherArtists: [
		{ uid: 'artist-slayer', name: 'Slayer', country: 'USA', formedIn: 1981 },
		{ uid: 'artist-iron', name: 'Iron Maiden', country: 'UK', formedIn: 1975 },
		{ uid: 'artist-kreator', name: 'Kreator', country: 'Germany', formedIn: 1982 },
		{ uid: 'artist-sepultura', name: 'Sepultura', country: 'Brazil', formedIn: 1984 },
	],
	otherReleases: [
		{
			uid: 'release-a',
			name: 'Ride the Lightning',
			catno: 'MFN 27',
			country: 'UK',
			labelName: 'Music for Nations',
			year: 1984,
		},
		{
			uid: 'release-b',
			name: 'Reign in Blood',
			catno: 'GEF 24131',
			country: 'USA',
			labelName: 'Def Jam',
			year: 1986,
		},
		{
			uid: 'release-c',
			name: 'Powerslave',
			catno: 'EMC 2400',
			country: 'UK',
			labelName: 'EMI',
			year: 1984,
		},
	],
	...overrides,
});

const draftBy = (key: string, source = material()) =>
	draftsFor(source, random()).find((draft) => draft.templateKey === key);

/** A nap kérdése, ha össze kell állnia — különben a teszt itt bukik el. */
const built = (
	preferred: QuestionDifficulty,
	avoid?: string | null,
	source = material()
) => {
	const draft = buildQuestion(source, random(), preferred, avoid);

	if (!draft) throw new Error('nem állt össze kérdés');

	return draft;
};

describe('createRandom', () => {
	it('ugyanabból a napból ugyanazt a sorozatot adja', () => {
		const first = createRandom(hashSeed('2026-09-24'));
		const second = createRandom(hashSeed('2026-09-24'));

		expect([first(), first(), first()]).toEqual([
			second(),
			second(),
			second(),
		]);
	});

	it('másik napra másik sorozatot ad', () => {
		const first = createRandom(hashSeed('2026-09-24'));
		const second = createRandom(hashSeed('2026-09-25'));

		expect(first()).not.toEqual(second());
	});
});

describe('shuffle', () => {
	it('megtartja az elemeket, és nem írja át az eredetit', () => {
		const items = [1, 2, 3, 4, 5];
		const shuffled = shuffle(items, random());

		expect([...shuffled].sort()).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5]);
	});
});

describe('yearOf', () => {
	it('Timestampből, epoch ezredmásodpercből és szövegből is évet ad', () => {
		const midnight = new Date('1986-03-03T00:00:00+01:00');

		expect(yearOf({ toDate: () => midnight })).toBe(1986);
		expect(yearOf(midnight.getTime())).toBe(1986);
		expect(yearOf('1986-03-03')).toBe(1986);
	});

	it('a helyi éjfélt nem csúsztatja vissza az előző évre', () => {
		expect(yearOf(new Date('1987-01-01T00:00:00+01:00'))).toBe(1987);
	});

	it('üres és értelmezhetetlen értékre null', () => {
		expect(yearOf(null)).toBeNull();
		expect(yearOf('')).toBeNull();
		expect(yearOf('nem dátum')).toBeNull();
	});
});

describe('albumTracks', () => {
	it('sorrendbe teszi őket, és kihagyja a pressing saját számait', () => {
		const bonus = track({
			uid: 'track-bonus',
			name: 'Bonus',
			index: 7,
			releaseUid: 'release-jp',
		});
		const ordered = albumTracks([tracks[2], tracks[0], bonus, tracks[1]]);

		expect(ordered.map((item) => item.uid)).toEqual([
			'track-1',
			'track-2',
			'track-3',
		]);
	});
});

describe('difficultyForDay', () => {
	it('a hét elején könnyebb, a hétvégén nehezebb', () => {
		expect(difficultyForDay('2026-09-21')).toBe('easy'); // hétfő
		expect(difficultyForDay('2026-09-23')).toBe('medium'); // szerda
		expect(difficultyForDay('2026-09-26')).toBe('hard'); // szombat
	});
});

describe('sablonok', () => {
	it('mind négy opciót ad, köztük a válasszal', () => {
		for (const draft of draftsFor(material(), random())) {
			expect(draft.options).toHaveLength(OPTION_COUNT);
			expect(
				draft.options.filter((option) => option.id === draft.answerId)
			).toHaveLength(1);
		}
	});

	it('nincs két egyforma opció', () => {
		for (const draft of draftsFor(material(), random())) {
			const ids = draft.options.map((option) => option.id);
			const labels = draft.options.map((option) => option.label);

			expect(new Set(ids).size).toBe(ids.length);
			expect(new Set(labels).size).toBe(labels.length);
		}
	});

	it('nincs két azonos kulcsú sablon', () => {
		const keys = TEMPLATES.map((template) => template.key);

		expect(new Set(keys).size).toBe(keys.length);
	});
});

describe('albumYear', () => {
	it('a megjelenés évét kérdezi', () => {
		expect(draftBy('albumYear')?.answerId).toBe('year-1986');
	});

	it('ismeretlen év nélkül kihagyja magát', () => {
		expect(
			draftBy(
				'albumYear',
				material({ album: { ...material().album, year: null } })
			)
		).toBeUndefined();
	});
});

describe('albumArtist', () => {
	it('az album előadóját kérdezi', () => {
		expect(draftBy('albumArtist')?.answerId).toBe('artist-metallica');
	});

	it('három másik előadó nélkül kihagyja magát', () => {
		expect(
			draftBy(
				'albumArtist',
				material({ otherArtists: material().otherArtists.slice(0, 2) })
			)
		).toBeUndefined();
	});
});

describe('openingTrack', () => {
	it('a lemez első számát kérdezi, és a csalik ugyanarról a lemezről jönnek', () => {
		const draft = draftBy('openingTrack');
		const albumTrackUids = tracks.map((item) => item.uid);

		expect(draft?.answerId).toBe('track-1');
		expect(
			draft?.options.every((option) =>
				albumTrackUids.includes(option.id)
			)
		).toBe(true);
	});

	it('négy számnál rövidebb lemezt kihagy', () => {
		expect(
			draftBy('openingTrack', material({ tracks: tracks.slice(0, 3) }))
		).toBeUndefined();
	});
});

describe('longestTrack', () => {
	it('a leghosszabb számot kérdezi', () => {
		expect(draftBy('longestTrack')?.answerId).toBe('track-2');
	});

	it('kihagyja magát, ha a leghosszabb csak hajszállal vezet', () => {
		const close = tracks.map((item) =>
			item.uid === 'track-5' ? { ...item, durationSec: 510 } : item
		);

		expect(draftBy('longestTrack', material({ tracks: close }))).toBeUndefined();
	});

	it('hossz nélküli számokkal nem kérdez', () => {
		const untimed = tracks.map((item) => ({ ...item, durationSec: null }));

		expect(
			draftBy('longestTrack', material({ tracks: untimed }))
		).toBeUndefined();
	});
});

describe('sideBOpener', () => {
	it('a B oldal nyitószámát kérdezi', () => {
		expect(draftBy('sideBOpener')?.answerId).toBe('track-4');
	});

	it('CD-n, ahol nincs oldal, kihagyja magát', () => {
		const digital = tracks.map((item) => ({ ...item, position: null }));

		expect(
			draftBy('sideBOpener', material({ tracks: digital }))
		).toBeUndefined();
	});
});

describe('trackCount', () => {
	it('a lemez hosszát kérdezi számokban', () => {
		expect(draftBy('trackCount')?.answerId).toBe('count-6');
	});

	it('rövid lemeznél nem kérdés', () => {
		expect(
			draftBy('trackCount', material({ tracks: tracks.slice(0, 4) }))
		).toBeUndefined();
	});
});

describe('releaseLabel', () => {
	it('a kiadót kérdezi, és megmondja, melyik kiadásról van szó', () => {
		const draft = draftBy('releaseLabel');

		expect(draft?.answerId).toBe('label-Music On Vinyl');
		expect(draft?.params).toMatchObject({
			country: 'Germany',
			year: '1986',
		});
	});

	it('kiadó nélküli katalógusban kihagyja magát', () => {
		expect(
			draftBy('releaseLabel', material({ releases: [] }))
		).toBeUndefined();
	});
});

describe('releaseCatno', () => {
	it('a lemezre nyomott katalógusszámot kérdezi', () => {
		expect(draftBy('releaseCatno')?.answerId).toBe('catno-MOVLP2620');
	});

	it('katalógusszám nélküli kiadásnál kihagyja magát', () => {
		const seeded = material().releases.map((release) => ({
			...release,
			catno: null,
		}));

		expect(
			draftBy('releaseCatno', material({ releases: seeded }))
		).toBeUndefined();
	});
});

describe('artistCountry', () => {
	it('az előadó országát kérdezi', () => {
		expect(draftBy('artistCountry')?.answerId).toBe('country-USA');
	});

	it('ismeretlen előadónál kihagyja magát', () => {
		expect(
			draftBy('artistCountry', material({ artist: null }))
		).toBeUndefined();
	});
});

describe('buildQuestion', () => {
	it('a kért nehézségből választ, ha van rá anyag', () => {
		expect(buildQuestion(material(), random(), 'easy')?.difficulty).toBe(
			'easy'
		);
		expect(buildQuestion(material(), random(), 'hard')?.difficulty).toBe(
			'hard'
		);
	});

	it('visszaesik arra, amiből építeni lehetett', () => {
		// Csak könnyű kérdés áll össze: nincs tracklista, nincs kiadás.
		const thin = material({ tracks: [], releases: [], artist: null });

		expect(buildQuestion(thin, random(), 'hard')?.difficulty).toBe('easy');
	});

	it('kerüli a tegnapi sablont', () => {
		const yesterday = built('easy');

		expect(built('easy', yesterday.templateKey).templateKey).not.toBe(
			yesterday.templateKey
		);
	});

	it('a tegnapi sablonhoz visszanyúl, ha más nem áll össze', () => {
		// Ebből az anyagból egyedül az előadó kérdezhető.
		const single = material({
			album: { ...material().album, year: null },
			tracks: [],
			releases: [],
			artist: null,
			siblingAlbums: [],
		});

		expect(
			buildQuestion(single, random(), 'easy', 'albumArtist')?.templateKey
		).toBe('albumArtist');
	});

	it('üres anyagból nem csinál kérdést', () => {
		const empty = material({
			album: { ...material().album, year: null },
			artist: null,
			tracks: [],
			releases: [],
			siblingAlbums: [],
			otherArtists: [],
			otherReleases: [],
		});

		expect(buildQuestion(empty, random())).toBeNull();
	});
});

describe('previousDay', () => {
	it('hónapfordulón is az előző napot adja', () => {
		expect(previousDay('2026-10-01')).toBe('2026-09-30');
		expect(previousDay('2026-09-24')).toBe('2026-09-23');
	});
});

describe('toQuestionDocument', () => {
	it('a kliensnek szóló dokumentumban nincs benne a válasz', () => {
		const document = toQuestionDocument('2026-09-24', built('easy'));
		const serialized = JSON.stringify(document);

		expect('answerId' in document).toBe(false);
		expect(serialized).not.toContain('"answerId"');
		expect(document.uid).toBe('2026-09-24');
	});

	it('a megfejtés a külön dokumentumba kerül', () => {
		const draft = built('easy');

		expect(toAnswerDocument('2026-09-24', draft)).toMatchObject({
			day: '2026-09-24',
			answerId: draft.answerId,
			subject: draft.subject,
		});
	});
});
