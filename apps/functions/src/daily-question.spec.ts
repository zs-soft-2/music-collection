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
	gameDay,
	hashSeed,
	previousDay,
	shuffle,
	toAnswerDocument,
	templateCatalog,
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
	albumUid: 'album-motp',
	...overrides,
});

const tracks: MaterialTrack[] = [
	track({
		uid: 'track-1',
		name: 'Battery',
		index: 1,
		position: 'A1',
		durationSec: 312,
	}),
	track({
		uid: 'track-2',
		name: 'Master of Puppets',
		index: 2,
		position: 'A2',
		durationSec: 515,
	}),
	track({
		uid: 'track-3',
		name: 'The Thing That Should Not Be',
		index: 3,
		position: 'A3',
		durationSec: 396,
	}),
	track({
		uid: 'track-4',
		name: 'Welcome Home (Sanitarium)',
		index: 4,
		position: 'B1',
		durationSec: 386,
	}),
	track({
		uid: 'track-5',
		name: 'Disposable Heroes',
		index: 5,
		position: 'B2',
		durationSec: 496,
	}),
	track({
		uid: 'track-6',
		name: 'Leper Messiah',
		index: 6,
		position: 'B3',
		durationSec: 340,
	}),
];

const material = (
	overrides: Partial<QuestionMaterial> = {}
): QuestionMaterial => ({
	album: {
		uid: 'album-motp',
		name: 'Master of Puppets',
		artistUid: 'artist-metallica',
		artistName: 'Metallica',
		year: 1986,
		styles: ['Thrash'],
		genre: 'Rock',
		coverUrl: 'https://example.invalid/motp.jpg',
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
			styles: ['Speed Metal'],
			genre: 'Rock',
			coverUrl: null,
		},
		{
			uid: 'album-justice',
			name: '…And Justice for All',
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			year: 1988,
			styles: ['Progressive metal'],
			genre: 'Rock',
			coverUrl: null,
		},
		{
			uid: 'album-black',
			name: 'Metallica',
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			year: 1991,
			styles: ['Heavy metal'],
			genre: 'Rock',
			coverUrl: null,
		},
	],
	otherArtists: [
		{
			uid: 'artist-slayer',
			name: 'Slayer',
			country: 'USA',
			formedIn: 1981,
		},
		{
			uid: 'artist-iron',
			name: 'Iron Maiden',
			country: 'UK',
			formedIn: 1975,
		},
		{
			uid: 'artist-kreator',
			name: 'Kreator',
			country: 'Germany',
			formedIn: 1982,
		},
		{
			uid: 'artist-sepultura',
			name: 'Sepultura',
			country: 'Brazil',
			formedIn: 1984,
		},
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
	siblingTracks: [
		track({
			uid: 'track-ride-1',
			name: 'Fight Fire with Fire',
			index: 1,
			albumUid: 'album-ride',
		}),
		track({
			uid: 'track-ride-2',
			name: 'For Whom the Bell Tolls',
			index: 2,
			albumUid: 'album-ride',
		}),
	],
	members: [
		{
			musicianUid: 'musician-hetfield',
			musicianName: 'James Hetfield',
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			instruments: ['Vocals', 'Rhythm Guitar'],
			kind: 'member',
		},
		{
			musicianUid: 'musician-ulrich',
			musicianName: 'Lars Ulrich',
			artistUid: 'artist-metallica',
			artistName: 'Metallica',
			instruments: ['Drums'],
			kind: 'member',
		},
	],
	otherMembers: [
		{
			musicianUid: 'musician-king',
			musicianName: 'Kerry King',
			artistUid: 'artist-slayer',
			artistName: 'Slayer',
			instruments: ['Lead Guitar'],
			kind: 'member',
		},
		{
			musicianUid: 'musician-dickinson',
			musicianName: 'Bruce Dickinson',
			artistUid: 'artist-iron',
			artistName: 'Iron Maiden',
			instruments: ['Vocals'],
			kind: 'member',
		},
		{
			musicianUid: 'musician-petrozza',
			musicianName: 'Mille Petrozza',
			artistUid: 'artist-kreator',
			artistName: 'Kreator',
			instruments: ['Vocals', 'Guitar'],
			kind: 'member',
		},
		{
			musicianUid: 'musician-cavalera',
			musicianName: 'Max Cavalera',
			artistUid: 'artist-sepultura',
			artistName: 'Sepultura',
			instruments: ['Vocals', 'Guitar'],
			kind: 'member',
		},
	],
	credits: [
		{
			musicianUid: 'musician-rasmussen',
			name: 'Flemming Rasmussen',
			role: 'Producer',
		},
		{
			musicianUid: 'musician-burton',
			name: 'Cliff Burton',
			role: 'Bass',
		},
	],
	otherCredits: [
		{
			musicianUid: 'musician-birch',
			name: 'Martin Birch',
			role: 'Producer',
		},
		{ musicianUid: 'musician-rubin', name: 'Rick Rubin', role: 'Producer' },
		{ musicianUid: 'musician-harris', name: 'Steve Harris', role: 'Bass' },
		{ musicianUid: 'musician-araya', name: 'Tom Araya', role: 'Bass' },
	],
	...overrides,
});

/** A nap szabályai, ahogy a kérdésre kerülnek. */
const rules = {
	timeLimitSec: 60,
	scoring: {
		base: 20,
		streakBonusPerDay: 2,
		maxStreakBonusDays: 5,
		speedBonusMax: 10,
		multiplier: 1,
	},
};

const draftBy = (key: string, source = material()) =>
	draftsFor(source, random()).find((draft) => draft.templateKey === key);

/** A nap kérdése, ha össze kell állnia — különben a teszt itt bukik el. */
const built = (
	preferred: QuestionDifficulty,
	avoid?: readonly string[],
	source = material()
) => {
	const draft = buildQuestion(source, random(), { preferred, avoid });

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
			draft?.options.every((option) => albumTrackUids.includes(option.id))
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

		expect(
			draftBy('longestTrack', material({ tracks: close }))
		).toBeUndefined();
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
		expect(
			buildQuestion(material(), random(), { preferred: 'easy' })
				?.difficulty
		).toBe('easy');
		expect(
			buildQuestion(material(), random(), { preferred: 'hard' })
				?.difficulty
		).toBe('hard');
	});

	it('visszaesik arra, amiből építeni lehetett', () => {
		// Csak könnyű kérdés áll össze: nincs tracklista, nincs kiadás.
		const thin = material({
			tracks: [],
			releases: [],
			artist: null,
			siblingAlbums: [],
			siblingTracks: [],
			members: [],
			credits: [],
			album: { ...material().album, coverUrl: null, styles: [] },
		});

		expect(
			buildQuestion(thin, random(), { preferred: 'hard' })?.difficulty
		).toBe('easy');
	});

	it('kerüli a közelmúlt sablonjait', () => {
		const yesterday = built('easy');
		const before = built('easy', [yesterday.templateKey]);

		expect([yesterday.templateKey, before.templateKey]).not.toContain(
			built('easy', [yesterday.templateKey, before.templateKey])
				.templateKey
		);
	});

	it('a közelmúlt sablonjához visszanyúl, ha más nem áll össze', () => {
		// Ebből az anyagból egyedül az előadó kérdezhető.
		const single = material({
			album: {
				...material().album,
				year: null,
				styles: [],
				coverUrl: null,
			},
			tracks: [],
			releases: [],
			artist: null,
			siblingAlbums: [],
			siblingTracks: [],
			members: [],
			credits: [],
		});

		expect(
			buildQuestion(single, random(), {
				preferred: 'easy',
				avoid: ['albumArtist'],
			})?.templateKey
		).toBe('albumArtist');
	});

	it('üres anyagból nem csinál kérdést', () => {
		const empty = material({
			album: {
				...material().album,
				year: null,
				styles: [],
				coverUrl: null,
			},
			artist: null,
			tracks: [],
			releases: [],
			siblingAlbums: [],
			otherArtists: [],
			otherReleases: [],
			siblingTracks: [],
			members: [],
			otherMembers: [],
			credits: [],
			otherCredits: [],
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
		const document = toQuestionDocument('2026-09-24', built('easy'), rules);
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

describe('gameDay', () => {
	it('a játék időzónájában adja a napot, nem UTC-ben', () => {
		// Budapesten 2026-09-25 00:05 — UTC szerint még 24-e este.
		expect(gameDay(new Date('2026-09-24T22:05:00Z'))).toBe('2026-09-25');
	});

	it('az éjfél előtti perc még a régi nap', () => {
		expect(gameDay(new Date('2026-09-24T21:59:00Z'))).toBe('2026-09-24');
	});

	it('téli időszámításban is a helyi napot adja', () => {
		// Budapesten 2026-12-01 00:30 (UTC+1).
		expect(gameDay(new Date('2026-11-30T23:30:00Z'))).toBe('2026-12-01');
	});
});

describe('az új kérdésfajták', () => {
	it('a stílust az albumon nem szereplő stílusok közül kérdezi', () => {
		const draft = draftBy('albumStyle');

		expect(draft?.answerId).toBe('style-Thrash');
		expect(
			draft?.options.filter((option) => option.label === 'Thrash')
		).toHaveLength(1);
	});

	it('a legkorábbi lemezt csak akkor kérdezi, ha egyedül áll az évével', () => {
		expect(draftBy('earliestAlbum')?.answerId).toBe('album-ride');

		const tied = material().siblingAlbums.map((album) =>
			album.uid === 'album-justice' ? { ...album, year: 1984 } : album
		);

		expect(
			draftBy('earliestAlbum', material({ siblingAlbums: tied }))
		).toBeUndefined();
	});

	it('a szám lemezét az előadó többi lemeze közül kérdezi', () => {
		const draft = draftBy('trackAlbum');

		expect(draft?.answerId).toBe('album-motp');
		expect(draft?.options.map((option) => option.label)).toContain(
			'Ride the Lightning'
		);
	});

	it('a következő számnál a kérdezett szám nem lehet válasz', () => {
		const draft = draftBy('nextTrack');
		const asked = draft?.params['track'];

		expect(asked).toBeTruthy();
		expect(draft?.options.map((option) => option.label)).not.toContain(
			asked
		);
	});

	it('a lemez hosszát csak hiánytalan időkből számolja', () => {
		expect(draftBy('albumLength')).toBeDefined();

		const missing = tracks.map((item, index) =>
			index === 2 ? { ...item, durationSec: null } : item
		);

		expect(
			draftBy('albumLength', material({ tracks: missing }))
		).toBeUndefined();
	});

	it('a „melyik nincs rajta” válasza testvérlemezről való', () => {
		const draft = draftBy('notOnAlbum');

		expect(['track-ride-1', 'track-ride-2']).toContain(draft?.answerId);
	});

	it('a testvérlemez azonos című száma nem lehet a válasz', () => {
		const same = [
			{
				...tracks[0],
				uid: 'track-ride-battery',
				albumUid: 'album-ride',
			},
		];

		expect(
			draftBy('notOnAlbum', material({ siblingTracks: same }))
		).toBeUndefined();
	});

	it('a borítós kérdés a képet is viszi', () => {
		const draft = draftBy('coverAlbum');

		expect(draft?.imageUrl).toBe('https://example.invalid/motp.jpg');
		expect(draft?.answerId).toBe('album-motp');
	});

	it('borító nélkül nincs képes kérdés', () => {
		expect(
			draftBy(
				'coverAlbum',
				material({ album: { ...material().album, coverUrl: null } })
			)
		).toBeUndefined();
	});

	it('a zenekar tagját más zenekarok tagjai közül kérdezi', () => {
		const draft = draftBy('bandMember');
		const ours = ['James Hetfield', 'Lars Ulrich'];

		expect(
			draft?.options.filter((option) => ours.includes(option.label))
		).toHaveLength(1);
	});

	it('a több zenekart megjárt zenészt nem kérdezi visszafelé', () => {
		const wandering = [
			...material().otherMembers,
			{
				musicianUid: 'musician-ulrich',
				musicianName: 'Lars Ulrich',
				artistUid: 'artist-slayer',
				artistName: 'Slayer',
				instruments: ['Drums'],
				kind: 'guest',
			},
		];
		const draft = draftBy(
			'memberBand',
			material({ otherMembers: wandering })
		);

		// Marad a másik tag, akinek egy zenekara van.
		expect(draft?.params['musician']).not.toBe('Lars Ulrich');
	});

	it('a producert csak akkor kérdezi, ha egyetlen név tartozik hozzá', () => {
		expect(draftBy('albumProducer')?.answerId).toBe('musician-rasmussen');

		const two = [
			...material().credits,
			{
				musicianUid: 'musician-other',
				name: 'Another Producer',
				role: 'Producer',
			},
		];

		expect(
			draftBy('albumProducer', material({ credits: two }))
		).toBeUndefined();
	});
});

describe('draftsFor', () => {
	it('a kikapcsolt sablonokat meg sem próbálja', () => {
		const drafts = draftsFor(material(), random(), [
			'albumArtist',
			'albumYear',
		]);

		expect(drafts.map((draft) => draft.templateKey)).not.toContain(
			'albumArtist'
		);
		expect(drafts.map((draft) => draft.templateKey)).not.toContain(
			'albumYear'
		);
		expect(drafts.length).toBeGreaterThan(0);
	});
});

describe('buildQuestion kikapcsolt sablonokkal', () => {
	it('kikapcsolt sablonból akkor sem lesz kérdés, ha más nem marad', () => {
		const single = material({
			album: {
				...material().album,
				year: null,
				styles: [],
				coverUrl: null,
			},
			tracks: [],
			releases: [],
			artist: null,
			siblingAlbums: [],
			siblingTracks: [],
			members: [],
			credits: [],
		});

		expect(
			buildQuestion(single, random(), { disabled: ['albumArtist'] })
		).toBeNull();
	});
});

describe('a nap szabályai a kérdésen', () => {
	it('az időkorlát és a pontozás a dokumentumra kerül', () => {
		const document = toQuestionDocument('2026-09-24', built('easy'), {
			timeLimitSec: 45,
			scoring: { ...rules.scoring, multiplier: 2 },
		});

		expect(document.timeLimitSec).toBe(45);
		expect(document.scoring.multiplier).toBe(2);
	});

	it('kép nélküli kérdésnél az imageUrl null, nem hiányzó mező', () => {
		const document = toQuestionDocument(
			'2026-09-24',
			{ ...built('easy'), imageUrl: undefined },
			rules
		);

		expect(document.imageUrl).toBeNull();
	});
});

describe('a kérdésfajták katalógusa', () => {
	it('minden sablont felsorol, egyszer', () => {
		const keys = templateCatalog().map((template) => template.key);

		expect(keys).toHaveLength(TEMPLATES.length);
		expect(new Set(keys).size).toBe(keys.length);
	});
});
