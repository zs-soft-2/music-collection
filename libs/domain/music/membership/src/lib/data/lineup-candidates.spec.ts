import { AlbumEntity, ContributionEntity } from '@music-collection/api';

import {
	MusicBrainzRelation,
	mergeCandidates,
	toCatalogCandidates,
	toExternalMembers,
} from './lineup-candidates';

const relation = (
	fields: Partial<MusicBrainzRelation> = {}
): MusicBrainzRelation => ({
	type: 'member of band',
	direction: 'backward',
	artist: { id: 'mb-1', name: 'Bill Steer' },
	begin: '1985',
	end: null,
	ended: false,
	attributes: ['guitar'],
	...fields,
});

const album = (uid: string, year: number): AlbumEntity =>
	({ uid, year: new Date(year, 0, 1) }) as AlbumEntity;

const credit = (fields: Partial<ContributionEntity> = {}): ContributionEntity =>
	({
		albumUid: 'a1',
		musicianUid: 'm1',
		name: 'Bill Steer',
		role: 'Guitar',
		tracks: null,
		...fields,
	}) as ContributionEntity;

describe('toExternalMembers', () => {
	it('takes the years off the relation', () => {
		const [member] = toExternalMembers({
			relations: [
				relation({ begin: '1985-06-13', end: '1995', ended: true }),
			],
		});

		expect(member).toMatchObject({ from: 1985, to: 1995, active: false });
	});

	it('reads a member with no end year as still in the band', () => {
		const [member] = toExternalMembers({ relations: [relation()] });

		expect(member).toMatchObject({ active: true, to: null });
	});

	it('spells the instruments as the credits do', () => {
		const [member] = toExternalMembers({
			relations: [relation({ attributes: ['lead vocals', 'guitar'] })],
		});

		expect(member.instruments).toEqual(['Lead Vocals', 'Guitar']);
	});

	it('takes an additional member for a guest, and drops the marker', () => {
		const [member] = toExternalMembers({
			relations: [relation({ attributes: ['additional', 'keyboard'] })],
		});

		expect(member.kind).toBe('guest');
		expect(member.instruments).toEqual(['Keyboard']);
	});

	it('leaves relations that are not memberships alone', () => {
		expect(
			toExternalMembers({
				relations: [relation({ type: 'wikipedia' })],
			})
		).toHaveLength(0);
	});
});

describe('toCatalogCandidates', () => {
	it('counts a release-wide credit as membership', () => {
		const [row] = toCatalogCandidates(
			[album('a1', 1993)],
			[credit()],
			'Carcass'
		);

		expect(row).toMatchObject({
			kind: 'member',
			musicianUid: 'm1',
			instruments: ['Guitar'],
			from: 1993,
			to: 1993,
			albumCount: 1,
		});
	});

	it('counts a track-limited credit as a guest turn', () => {
		const [row] = toCatalogCandidates(
			[album('a1', 1993)],
			[credit({ tracks: 'A2' })],
			'Carcass'
		);

		expect(row.kind).toBe('guest');
	});

	it('leaves out credits that are not performances', () => {
		expect(
			toCatalogCandidates(
				[album('a1', 1993)],
				[credit({ role: 'Producer' }), credit({ role: 'Artwork' })],
				'Carcass'
			)
		).toHaveLength(0);
	});

	it('does not make the band a member of itself', () => {
		expect(
			toCatalogCandidates(
				[album('a1', 1993)],
				[credit({ name: 'Carcass', musicianUid: 'band' })],
				'Carcass'
			)
		).toHaveLength(0);
	});

	it('spans the years of every album the musician is on', () => {
		const [row] = toCatalogCandidates(
			[album('a1', 1989), album('a2', 1996)],
			[credit(), credit({ albumUid: 'a2' })],
			'Carcass'
		);

		expect(row).toMatchObject({ from: 1989, to: 1996, albumCount: 2 });
	});
});

describe('mergeCandidates', () => {
	const external = toExternalMembers({
		relations: [relation({ begin: '1985', attributes: ['guitar'] })],
	});
	const catalog = toCatalogCandidates(
		[album('a1', 1989)],
		[credit({ role: 'Vocals' })],
		'Carcass'
	);

	it('lets MusicBrainz decide the years, and keeps the catalog counts', () => {
		const [row] = mergeCandidates(external, catalog);

		expect(row).toMatchObject({
			musicianUid: 'm1',
			from: 1985,
			active: true,
			to: null,
			albumCount: 1,
			source: 'musicbrainz',
		});
	});

	it('keeps both sets of instruments', () => {
		const [row] = mergeCandidates(external, catalog);

		expect(row.instruments).toEqual(['Guitar', 'Vocals']);
	});

	it('keeps a musician only the credits know about', () => {
		const rows = mergeCandidates(
			[],
			toCatalogCandidates(
				[album('a1', 1989)],
				[
					credit({
						musicianUid: 'm2',
						name: 'Guest One',
						tracks: 'B1',
					}),
				],
				'Carcass'
			)
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({ kind: 'guest', source: 'catalog' });
	});

	it('matches the two sources by name, whatever the spelling', () => {
		const rows = mergeCandidates(
			toExternalMembers({
				relations: [relation({ artist: { name: 'Bill  Steer' } })],
			}),
			catalog
		);

		expect(rows).toHaveLength(1);
	});
});
