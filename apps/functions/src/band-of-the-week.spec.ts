import {
	MIN_PLAYABLE_ALBUMS,
	candidateOrder,
	gameWeek,
	isEligible,
	isPlayable,
	weekEnd,
	weekOf,
	weekStart,
} from './band-of-the-week';
import { createRandom, hashSeed } from './daily-question';

/** A hét véletlene, ahogy a választás is csinálja. */
const weekRandom = (week = '2026-W41'): (() => number) =>
	createRandom(hashSeed(week));

describe('weekOf', () => {
	it('a hét minden napja ugyanazt a hetet adja', () => {
		// 2026-09-21 hétfő … 2026-09-27 vasárnap.
		const days = ['2026-09-21', '2026-09-22', '2026-09-25', '2026-09-27'];

		expect(days.map(weekOf)).toEqual([
			'2026-W39',
			'2026-W39',
			'2026-W39',
			'2026-W39',
		]);
	});

	it('hétfőn új hét kezdődik', () => {
		expect(weekOf('2026-09-28')).toBe('2026-W40');
	});

	it('az év fordulóján az ISO szabály dönt', () => {
		// 2027-01-01 péntek: még a 2026-os év utolsó hete.
		expect(weekOf('2027-01-01')).toBe('2026-W53');
		expect(weekOf('2027-01-04')).toBe('2027-W01');
		// 2026-01-01 csütörtök: már az új év első hete.
		expect(weekOf('2026-01-01')).toBe('2026-W01');
	});
});

describe('weekStart / weekEnd', () => {
	it('hétfőtől vasárnapig tart', () => {
		expect(weekStart('2026-W39')).toBe('2026-09-21');
		expect(weekEnd('2026-W39')).toBe('2026-09-27');
	});

	it('az 53 hetes év utolsó hete is megvan', () => {
		expect(weekStart('2026-W53')).toBe('2026-12-28');
		expect(weekEnd('2026-W53')).toBe('2027-01-03');
	});

	it('oda-vissza ugyanaz a hét', () => {
		expect(weekOf(weekStart('2027-W01'))).toBe('2027-W01');
		expect(weekOf(weekEnd('2027-W01'))).toBe('2027-W01');
	});
});

describe('gameWeek', () => {
	it('a játék időzónájában nézi, melyik nap van', () => {
		// Vasárnap 23:30 Budapesten már hétfő UTC-ben — a hét mégis a régi.
		const sunday = new Date('2026-09-27T21:30:00Z');

		expect(gameWeek(sunday)).toBe('2026-W39');
		expect(gameWeek(new Date('2026-09-27T22:30:00Z'))).toBe('2026-W40');
	});
});

describe('isPlayable', () => {
	it('bármelyik forrás elég', () => {
		expect(
			isPlayable({
				spotifyAlbumId: 'abc',
				youtubePlaylistId: null,
				youtubeVideoIds: [],
			})
		).toBe(true);
		expect(
			isPlayable({
				spotifyAlbumId: null,
				youtubePlaylistId: 'PL1',
				youtubeVideoIds: [],
			})
		).toBe(true);
		expect(
			isPlayable({
				spotifyAlbumId: null,
				youtubePlaylistId: null,
				youtubeVideoIds: ['v1'],
			})
		).toBe(true);
	});

	it('forrás nélkül a lemez néma', () => {
		expect(
			isPlayable({
				spotifyAlbumId: null,
				youtubePlaylistId: null,
				youtubeVideoIds: [],
			})
		).toBe(false);
	});
});

describe('isEligible', () => {
	it('kevés lejátszható lemezzel nem áll meg a rádió', () => {
		expect(isEligible(MIN_PLAYABLE_ALBUMS - 1)).toBe(false);
	});

	it('a küszöbtől felfelé jó', () => {
		expect(isEligible(MIN_PLAYABLE_ALBUMS)).toBe(true);
	});
});

describe('candidateOrder', () => {
	it('a küszöböt elérő zenekar előbb jön a szűkösnél', () => {
		const counts = new Map([
			['szűkös', MIN_PLAYABLE_ALBUMS - 1],
			['bőséges', MIN_PLAYABLE_ALBUMS],
		]);

		expect(candidateOrder(counts, new Set(), weekRandom())).toEqual([
			'bőséges',
			'szűkös',
		]);
	});

	it('a nemrég soron volt zenekar a sávja végére kerül', () => {
		const counts = new Map([
			['volt-már', MIN_PLAYABLE_ALBUMS + 5],
			['friss', MIN_PLAYABLE_ALBUMS],
		]);
		const order = candidateOrder(
			counts,
			new Set(['volt-már']),
			weekRandom()
		);

		// Több lemeze van, mégis a friss jelölt az első: a sáv erősebb
		// szempont, mint a lemezszám.
		expect(order).toEqual(['friss', 'volt-már']);
	});

	it('a visszatérő zenekar is jobb a semminél', () => {
		const counts = new Map([['volt-már', MIN_PLAYABLE_ALBUMS]]);

		expect(
			candidateOrder(counts, new Set(['volt-már']), weekRandom())
		).toEqual(['volt-már']);
	});

	it('a küszöb alatt a több lejátszható lemez előbb', () => {
		const counts = new Map([
			['egy', 1],
			['kettő', 2],
		]);

		expect(candidateOrder(counts, new Set(), weekRandom())).toEqual([
			'kettő',
			'egy',
		]);
	});

	it('aki egy lemezzel sem szól, nem jelölt', () => {
		const counts = new Map([
			['néma', 0],
			['szól', 1],
		]);

		expect(candidateOrder(counts, new Set(), weekRandom())).toEqual([
			'szól',
		]);
	});

	it('ugyanaz a hét ugyanazt a sorrendet adja', () => {
		const counts = new Map(
			['a', 'b', 'c', 'd', 'e'].map((uid) => [uid, MIN_PLAYABLE_ALBUMS])
		);
		const first = candidateOrder(counts, new Set(), weekRandom());
		const second = candidateOrder(counts, new Set(), weekRandom());

		expect(first).toEqual(second);
		// …és nem a beírás sorrendje: a hét keveri meg a sávot.
		expect(first).not.toEqual(['a', 'b', 'c', 'd', 'e']);
	});

	it('más hét más sorrenddel indul', () => {
		const counts = new Map(
			['a', 'b', 'c', 'd', 'e', 'f'].map((uid) => [
				uid,
				MIN_PLAYABLE_ALBUMS,
			])
		);

		expect(candidateOrder(counts, new Set(), weekRandom())).not.toEqual(
			candidateOrder(counts, new Set(), weekRandom('2026-W42'))
		);
	});
});
