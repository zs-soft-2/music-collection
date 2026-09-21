import { NetworkEdge, NetworkNode } from '../../network.model';
import { NODE_RADIUS, toLayoutRequest } from './network-graph.layout';

const musician: NetworkNode = {
	id: 'musician:1',
	uid: '1',
	kind: 'musician',
	label: 'Gene Hoglan',
	imageUrl: 'https://example.test/hoglan.jpg',
	owned: true,
	distance: 0,
	link: null,
};

const band: NetworkNode = {
	id: 'artist:2',
	uid: '2',
	kind: 'band',
	label: 'Death',
	imageUrl: null,
	owned: true,
	distance: 1,
	link: ['/artist', '2'],
};

const membership: NetworkEdge = {
	id: 'm1',
	source: 'musician:1',
	target: 'artist:2',
	kind: 'member',
	label: 'drums',
	years: '1993–1995',
};

describe('toLayoutRequest', () => {
	it('sends the force layout shapes, not labels and pictures', () => {
		const request = toLayoutRequest(
			[musician, band],
			[membership],
			'musician:1',
			new Map()
		);

		expect(request.nodes).toEqual([
			{ id: 'musician:1', radius: NODE_RADIUS.musician, distance: 0 },
			{ id: 'artist:2', radius: NODE_RADIUS.band, distance: 1 },
		]);
		expect(request.edges).toEqual([
			{ source: 'musician:1', target: 'artist:2', length: 190 },
		]);
	});

	it('holds a guest appearance further apart than a membership', () => {
		const guest: NetworkEdge = { ...membership, kind: 'guest' };
		const request = toLayoutRequest(
			[musician, band],
			[guest],
			null,
			new Map()
		);

		expect(request.edges[0].length).toBeGreaterThan(190);
	});

	it('carries the focus and the known positions through', () => {
		const previous = new Map([['artist:2', { x: 12, y: 34 }]]);
		const request = toLayoutRequest([band], [], 'artist:2', previous);

		expect(request.focusId).toBe('artist:2');
		expect(request.previous).toBe(previous);
	});
});
