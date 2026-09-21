import {
	AlbumEntity,
	CollectionItemEntity,
	ReleaseEntity,
	ScanCandidate,
} from '@music-collection/api';

import {
	candidateSummary,
	toCandidateView,
	toScanRequest,
} from './scan.mapper';

const candidate = (overrides: Partial<ScanCandidate> = {}): ScanCandidate => ({
	discogsReleaseId: 1234,
	discogsMasterId: 42,
	title: 'Mercyful Fate - Melissa',
	artistName: 'Mercyful Fate',
	albumName: 'Melissa',
	formats: ['Vinyl', 'LP', 'Album'],
	label: 'Roadrunner Records',
	catno: 'RR 9862',
	country: 'Netherlands',
	year: 1983,
	thumbUrl: null,
	match: 'exact',
	...overrides,
});

const album = (overrides: Partial<AlbumEntity> = {}) =>
	({
		uid: 'album-1',
		name: 'Melissa',
		artist: { uid: 'artist-1', name: 'Mercyful Fate' },
		discogs: { masterId: 42, releaseId: 1234 },
		...overrides,
	}) as AlbumEntity;

const release = (overrides: Partial<ReleaseEntity> = {}) =>
	({
		uid: 'release-1',
		name: 'Melissa',
		discogsReleaseId: 1234,
		album: album(),
		...overrides,
	}) as ReleaseEntity;

const copy = (releaseUid: string) =>
	({ uid: 'item-1', release: { uid: releaseUid } }) as CollectionItemEntity;

const empty = { albums: [], releases: [], ownedItems: [] };

describe('candidateSummary', () => {
	it('a formátumot, kiadót, országot és évet fűzi össze', () => {
		expect(candidateSummary(candidate())).toBe(
			'Vinyl, LP, Album · Roadrunner Records (RR 9862) · Netherlands · 1983'
		);
	});

	it('a hiányzó részeket kihagyja', () => {
		expect(
			candidateSummary(
				candidate({
					label: null,
					catno: null,
					country: null,
					year: null,
				})
			)
		).toBe('Vinyl, LP, Album');
	});
});

describe('toCandidateView', () => {
	it('a példányt a gyűjteményben találtnak jelöli', () => {
		const view = toCandidateView(candidate(), {
			albums: [album()],
			releases: [release()],
			ownedItems: [copy('release-1')],
		});

		expect(view.state).toBe('in-collection');
		expect(view.releaseUid).toBe('release-1');
	});

	it('a katalógusban meglévő kiadás egy koppintással hozzáadható', () => {
		const view = toCandidateView(candidate(), {
			albums: [album()],
			releases: [release()],
			ownedItems: [],
		});

		expect(view.state).toBe('in-catalog');
		expect(view.albumUid).toBe('album-1');
	});

	it('meglévő album, hiányzó préselés: kiadás-kérés', () => {
		const view = toCandidateView(candidate({ discogsReleaseId: 9999 }), {
			albums: [album()],
			releases: [release()],
			ownedItems: [],
		});

		expect(view.state).toBe('new-release');
		expect(view.albumUid).toBe('album-1');
		expect(view.releaseUid).toBeNull();
	});

	it('az albumot név szerint is megtalálja, Discogs-azonosító nélkül', () => {
		const view = toCandidateView(candidate({ discogsMasterId: null }), {
			albums: [album({ discogs: undefined })],
			releases: [],
			ownedItems: [],
		});

		expect(view.albumUid).toBe('album-1');
		expect(view.state).toBe('new-release');
	});

	it('ismeretlen album: az is a kérés része lesz', () => {
		const view = toCandidateView(candidate(), empty);

		expect(view.state).toBe('new-album');
		expect(view.albumUid).toBeNull();
		expect(view.artistUid).toBeNull();
	});
});

describe('toScanRequest', () => {
	it('album nélküli kérést állít össze a jelöltből', () => {
		expect(toScanRequest(candidate(), 'user-1')).toMatchObject({
			userId: 'user-1',
			album: {
				uid: null,
				name: 'Melissa',
				artistUid: null,
				artistName: 'Mercyful Fate',
			},
			status: 'pending',
			discogsMasterId: 42,
			discogsReleaseId: 1234,
			pressing: {
				format: 'Vinyl, LP, Album',
				label: 'Roadrunner Records',
				catno: 'RR 9862',
				country: 'Netherlands',
				year: 1983,
			},
		});
	});
});
