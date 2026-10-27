import { MediaFormat, ReleaseView } from '../../shared/music-ui';

import {
	addedRecently,
	distinctCount,
	formatCounts,
	latestArrivals,
	monthlyGrowth,
	topArtists,
} from './overview.mapper';

const DAY = 24 * 60 * 60 * 1000;

function copy(partial: Partial<ReleaseView>): ReleaseView {
	return {
		id: 'copy',
		albumId: 'album',
		releaseId: null,
		title: 'Title',
		artistId: 'artist',
		artistName: 'Artist',
		coverUrl: null,
		format: 'vinyl',
		albumType: null,
		year: 1986,
		styles: [],
		editions: [],
		weight: null,
		boxSet: false,
		pictureDisc: false,
		addedAt: 0,
		labelName: null,
		country: null,
		coverColor: null,
		generic: false,
		placement: null,
		...partial,
	};
}

describe('addedRecently', () => {
	const now = Date.UTC(2026, 9, 8);

	it('counts only what arrived inside the window', () => {
		const releases = [
			copy({ id: 'a', addedAt: now - 2 * DAY }),
			copy({ id: 'b', addedAt: now - 29 * DAY }),
			copy({ id: 'c', addedAt: now - 40 * DAY }),
		];

		expect(addedRecently(releases, now)).toBe(2);
	});

	it('is zero for a collection nothing came into lately', () => {
		expect(addedRecently([copy({ addedAt: now - 90 * DAY })], now)).toBe(0);
	});
});

describe('monthlyGrowth', () => {
	const label = (at: Date): string => `${at.getFullYear()}-${at.getMonth()}`;

	it('names every month of the span, including the empty ones', () => {
		const now = new Date(2026, 9, 8).getTime();

		const points = monthlyGrowth([], label, now, 3);

		expect(points.map((point) => point.label)).toEqual([
			'2026-7',
			'2026-8',
			'2026-9',
		]);
		expect(points.map((point) => point.count)).toEqual([0, 0, 0]);
	});

	it('files each copy under the month it arrived in', () => {
		const now = new Date(2026, 9, 8).getTime();
		const releases = [
			copy({ id: 'a', addedAt: new Date(2026, 9, 2).getTime() }),
			copy({ id: 'b', addedAt: new Date(2026, 9, 7).getTime() }),
			copy({ id: 'c', addedAt: new Date(2026, 8, 30).getTime() }),
		];

		const points = monthlyGrowth(releases, label, now, 3);

		expect(points.map((point) => point.count)).toEqual([0, 1, 2]);
	});

	it('leaves out what is older than the span', () => {
		const now = new Date(2026, 9, 8).getTime();
		const releases = [
			copy({ id: 'old', addedAt: new Date(2019, 0, 1).getTime() }),
		];

		const points = monthlyGrowth(releases, label, now, 3);

		expect(points.every((point) => point.count === 0)).toBe(true);
	});
});

describe('latestArrivals', () => {
	it('puts the newest copy first and keeps the asked-for number', () => {
		const releases = [
			copy({ id: 'old', addedAt: 100 }),
			copy({ id: 'new', addedAt: 300 }),
			copy({ id: 'mid', addedAt: 200 }),
		];

		expect(latestArrivals(releases, 2).map((one) => one.id)).toEqual([
			'new',
			'mid',
		]);
	});

	it('leaves the collection it was given alone', () => {
		const releases = [
			copy({ id: 'old', addedAt: 100 }),
			copy({ id: 'new', addedAt: 300 }),
		];

		latestArrivals(releases, 2);

		expect(releases[0].id).toBe('old');
	});
});

describe('topArtists', () => {
	it('ranks by copies and breaks ties by name', () => {
		const releases = [
			copy({ id: '1', artistName: 'Opeth' }),
			copy({ id: '2', artistName: 'Opeth' }),
			copy({ id: '3', artistName: 'Death' }),
			copy({ id: '4', artistName: 'Behemoth' }),
		];

		expect(topArtists(releases, 3)).toEqual([
			{ label: 'Opeth', count: 2 },
			{ label: 'Behemoth', count: 1 },
			{ label: 'Death', count: 1 },
		]);
	});
});

describe('formatCounts', () => {
	const byFormat: Record<MediaFormat, number> = {
		vinyl: 12,
		cd: 30,
		cassette: 0,
		dvd: 0,
		boxset: 2,
		other: 0,
	};

	it('names the media the collector would, biggest run first', () => {
		expect(
			formatCounts(byFormat, (format) => format.toUpperCase())
		).toEqual([
			{ label: 'CD', count: 30 },
			{ label: 'VINYL', count: 12 },
			{ label: 'BOXSET', count: 2 },
		]);
	});

	it('says nothing about a medium the collection has none of', () => {
		const labels = formatCounts(byFormat, (format) => format).map(
			(datum) => datum.label
		);

		expect(labels).not.toContain('cassette');
	});
});

describe('distinctCount', () => {
	it('counts the different values and ignores the empty ones', () => {
		const releases = [
			copy({ id: '1', labelName: 'EMI' }),
			copy({ id: '2', labelName: 'EMI' }),
			copy({ id: '3', labelName: null }),
			copy({ id: '4', labelName: 'Nuclear Blast' }),
		];

		expect(distinctCount(releases, (one) => one.labelName)).toBe(2);
	});

	it('takes every value where a record carries several', () => {
		const releases = [
			copy({ id: '1', styles: ['Death Metal', 'Progressive'] }),
			copy({ id: '2', styles: ['Death Metal'] }),
		];

		expect(distinctCount(releases, (one) => one.styles)).toBe(2);
	});
});
