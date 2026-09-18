import { MembershipEntity } from '@music-collection/api';

import {
	NetworkSource,
	artistNodeId,
	buildNetwork,
	buildNetworkDetails,
	buildNetworkIndex,
	defaultFocus,
	musicianNodeId,
	searchNetwork,
} from './network.mapper';
import { NetworkFilter } from './network.model';

const YEAR = 2026;

function membership(
	musicianUid: string,
	musicianName: string,
	artistUid: string,
	artistName: string,
	from: number | null,
	to: number | null,
	active: boolean | null,
	kind: 'member' | 'guest' = 'member'
): MembershipEntity {
	return {
		uid: `${musicianUid}-${artistUid}`,
		musicianUid,
		musicianName,
		artistUid,
		artistName,
		kind,
		instruments: ['Vocals'],
		from,
		to,
		active,
		albumCount: 1,
		albumUids: artistUid === 'maiden' ? ['powerslave'] : [],
	} as MembershipEntity;
}

const source: NetworkSource = {
	memberships: [
		membership(
			'bruce',
			'Bruce Dickinson',
			'maiden',
			'Iron Maiden',
			1981,
			1993,
			false
		),
		membership(
			'bruce',
			'Bruce Dickinson',
			'maiden',
			'Iron Maiden',
			1999,
			null,
			true
		),
		membership(
			'bruce',
			'Bruce Dickinson',
			'samson',
			'Samson',
			1978,
			1981,
			false
		),
		membership(
			'bruce',
			'Bruce Dickinson',
			'solo',
			'Bruce Dickinson',
			1990,
			null,
			true
		),
		membership(
			'adrian',
			'Adrian Smith',
			'maiden',
			'Iron Maiden',
			1980,
			1990,
			false
		),
		membership(
			'paul',
			'Paul Samson',
			'samson',
			'Samson',
			1977,
			2002,
			false
		),
		membership(
			'guest',
			'Guest Player',
			'solo',
			'Bruce Dickinson',
			1997,
			1997,
			false,
			'guest'
		),
	],
	artists: [
		{
			id: 'maiden',
			name: 'Iron Maiden',
			type: 'band',
			imageUrl: null,
			headerUrl: null,
			styles: [],
			country: null,
			formedYear: 1975,
		},
		{
			id: 'solo',
			name: 'Bruce Dickinson',
			type: 'project',
			imageUrl: 'bruce.jpg',
			headerUrl: null,
			styles: [],
			country: null,
			formedYear: 1990,
		},
	],
	albums: [
		{
			id: 'powerslave',
			title: 'Powerslave',
			artistName: 'Iron Maiden',
			artistId: 'maiden',
			coverUrl: null,
			year: 1984,
			albumType: 'LP',
			styles: [],
		},
	],
	ownedAlbumIds: new Set(['powerslave']),
	collectedArtistIds: new Set(['maiden']),
};

const filter = (overrides: Partial<NetworkFilter> = {}): NetworkFilter => ({
	focusId: musicianNodeId('bruce'),
	depth: 2,
	includeGuests: false,
	onlyOwned: false,
	...overrides,
});

describe('network.mapper', () => {
	const index = buildNetworkIndex(source);

	it('takes the group kind from the artist type, band by default', () => {
		expect(index.nodes.get(artistNodeId('solo'))?.kind).toBe('project');
		expect(index.nodes.get(artistNodeId('maiden'))?.kind).toBe('band');
		// Samson is not in the catalog, only in memberships.
		expect(index.nodes.get(artistNodeId('samson'))?.kind).toBe('band');
		expect(index.nodes.get(musicianNodeId('bruce'))?.imageUrl).toBe(
			'bruce.jpg'
		);
	});

	it('walks memberships up to the depth, musicians and groups only', () => {
		const graph = buildNetwork(index, filter(), YEAR);
		const ids = graph.nodes.map((node) => node.id);

		expect(ids).toEqual(
			expect.arrayContaining([
				'musician:bruce',
				'artist:maiden',
				'artist:samson',
				'artist:solo',
				'musician:adrian',
				'musician:paul',
			])
		);
		expect(ids.some((id) => id.startsWith('album:'))).toBe(false);
		expect(ids).not.toContain('musician:guest');
		expect(graph.edges.find((e) => e.id === 'adrian>maiden')?.kind).toBe(
			'former'
		);
	});

	it('only ever connects a musician to a group', () => {
		const graph = buildNetwork(
			index,
			filter({ depth: 4, includeGuests: true }),
			YEAR
		);

		for (const edge of graph.edges) {
			expect(edge.source.startsWith('musician:')).toBe(true);
			expect(edge.target.startsWith('artist:')).toBe(true);
		}
	});

	it('stops at depth 1', () => {
		const graph = buildNetwork(index, filter({ depth: 1 }), YEAR);

		expect(graph.nodes.map((node) => node.id).sort()).toEqual([
			'artist:maiden',
			'artist:samson',
			'artist:solo',
			'musician:bruce',
		]);
	});

	it('includes guests on request', () => {
		const graph = buildNetwork(
			index,
			filter({ includeGuests: true }),
			YEAR
		);

		expect(graph.nodes.some((node) => node.id === 'musician:guest')).toBe(
			true
		);
	});

	it('keeps only collected bands with "only my collection"', () => {
		const graph = buildNetwork(index, filter({ onlyOwned: true }), YEAR);
		const ids = graph.nodes.map((node) => node.id);

		expect(ids).toContain('artist:maiden');
		expect(ids).not.toContain('artist:samson');
		expect(ids).not.toContain('musician:paul');
	});

	it('lists bandmates with overlapping years and parallel bands', () => {
		const graph = buildNetwork(index, filter(), YEAR);
		const details = buildNetworkDetails(
			index,
			graph,
			'musician:bruce',
			YEAR
		);

		expect(details?.together).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'Adrian Smith',
					via: 'Iron Maiden',
					years: '1981–1990',
				}),
				expect.objectContaining({
					name: 'Paul Samson',
					via: 'Samson',
					years: '1978–1981',
				}),
			])
		);
		expect(details?.parallel).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					first: 'Bruce Dickinson',
					second: 'Iron Maiden',
					years: '1999–present',
					active: true,
				}),
			])
		);
		expect(details?.albums.map((album) => album.id)).toEqual([
			'powerslave',
		]);
	});

	it('searches by name, ignoring case and accents', () => {
		expect(searchNetwork(index, 'IRON')[0]?.nodeId).toBe('artist:maiden');
		expect(searchNetwork(index, 'x')).toEqual([]);
	});

	it('defaults the focus to a collected band', () => {
		expect(defaultFocus(index)).toBe('artist:maiden');
	});
});
