import { Firestore, Timestamp } from 'firebase-admin/firestore';

import { genreSlice, isOutdatedByReset, newestOf } from './catalog-bundles';

/** Egy dokumentum annyija, amennyit a szeletelés néz. */
const document = (
	id: string,
	data: Record<string, unknown>,
	parentId?: string
) => ({
	id,
	get: (field: string) => data[field],
	ref: { parent: { parent: parentId ? { id: parentId } : null } },
});

/** Collection groupok, ahogy a szeletelés olvassa őket. */
const database = (groups: Record<string, ReturnType<typeof document>[]>) =>
	({
		collectionGroup: (name: string) => ({
			get: async () => ({ docs: groups[name] ?? [] }),
		}),
	}) as unknown as Firestore;

const genreOf = new Map<unknown, string>([
	['Rock', 'rock'],
	['Jazz', 'jazz'],
]);

describe('genreSlice', () => {
	const catalog = database({
		artist: [
			document('maiden', { genre: 'Rock' }),
			document('coltrane', { genre: 'Jazz' }),
		],
		album: [
			document('beast', { genre: 'Rock' }, 'maiden'),
			// Műfaj nélkül: a zenekaráé.
			document('killers', {}, 'maiden'),
			document('love-supreme', { genre: 'Jazz' }, 'coltrane'),
		],
		track: [
			document('beast_001', { albumUid: 'beast' }),
			document('killers_001', { albumUid: 'killers' }),
			document('love_001', { albumUid: 'love-supreme' }),
		],
		membership: [
			document('m1', { artistUid: 'maiden', musicianUid: 'harris' }),
			document('m2', { artistUid: 'coltrane', musicianUid: 'tyner' }),
		],
		contribution: [
			document('c1', { albumUid: 'love-supreme', musicianUid: 'harris' }),
			document('c2', { albumUid: 'beast', musicianUid: 'session' }),
		],
		musician: [
			document('harris', {}),
			document('tyner', {}),
			document('session', {}),
		],
	});
	const ids = async (slug: string) =>
		(await genreSlice(catalog, slug, genreOf))
			.map((item) => item.id)
			.sort();

	it('a műfaj minden dokumentumát összeszedi, és csak azt', async () => {
		expect(await ids('rock')).toEqual(
			[
				'maiden',
				'beast',
				'killers',
				'beast_001',
				'killers_001',
				'm1',
				'c2',
				'harris',
				'session',
			].sort()
		);
	});

	it('a zenész minden műfajba kerül, amiben játszott', async () => {
		// Harris rock zenekar tagja, és közreműködött egy jazz lemezen.
		expect(await ids('jazz')).toEqual(
			[
				'coltrane',
				'love-supreme',
				'love_001',
				'm2',
				'c1',
				'harris',
				'tyner',
			].sort()
		);
	});

	it('üres egy műfaj, aminek nincs dokumentuma', async () => {
		expect(await ids('blues')).toEqual([]);
	});
});

describe('isOutdatedByReset', () => {
	const at = (ms: number) => Timestamp.fromMillis(ms);

	it('a bundle utáni reset elavítja', () => {
		expect(isOutdatedByReset({ album: at(10) }, ['album'], at(5))).toBe(
			true
		);
		expect(isOutdatedByReset({ album: at(4) }, ['album'], at(5))).toBe(
			false
		);
	});

	it('csak a bundle saját feature-jei számítanak', () => {
		expect(isOutdatedByReset({ label: at(10) }, ['album'], at(5))).toBe(
			false
		);
	});

	it('publikálatlan bundle nem lehet elavult', () => {
		expect(isOutdatedByReset({ album: at(10) }, ['album'], null)).toBe(
			false
		);
	});
});

describe('newestOf', () => {
	it('a legújabbat adja, a hiányzókat átugorva', () => {
		const newest = newestOf([
			Timestamp.fromMillis(3),
			undefined,
			Timestamp.fromMillis(7),
			null,
		]);

		expect(newest?.toMillis()).toBe(7);
		expect(newestOf([undefined, null])).toBeNull();
	});
});
