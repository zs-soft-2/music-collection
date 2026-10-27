import {
	LayoutEdge,
	LayoutNode,
	NetworkLayoutRequest,
	simulate,
} from './network-graph.simulation';

function node(id: string, distance: number): LayoutNode {
	return { id, radius: 40, distance };
}

function edge(source: string, target: string): LayoutEdge {
	return { source, target, length: 190 };
}

function request(
	over: Partial<NetworkLayoutRequest> = {}
): NetworkLayoutRequest {
	return {
		nodes: [node('a', 0), node('b', 1), node('c', 1), node('d', 2)],
		edges: [edge('a', 'b'), edge('a', 'c'), edge('c', 'd')],
		focusId: 'a',
		previous: new Map(),
		...over,
	};
}

function distanceFromOrigin(x: number, y: number): number {
	return Math.hypot(x, y);
}

describe('simulate', () => {
	it('places every node it is given', () => {
		const positions = simulate(request());

		expect([...positions.keys()].sort()).toEqual(['a', 'b', 'c', 'd']);

		for (const point of positions.values()) {
			expect(Number.isFinite(point.x)).toBe(true);
			expect(Number.isFinite(point.y)).toBe(true);
		}
	});

	it('pins the focus to the origin', () => {
		const positions = simulate(request());

		expect(positions.get('a')).toEqual({ x: 0, y: 0 });
	});

	it('puts the further ring further out', () => {
		const positions = simulate(request());
		const b = positions.get('b');
		const d = positions.get('d');

		expect(distanceFromOrigin(b?.x ?? 0, b?.y ?? 0)).toBeLessThan(
			distanceFromOrigin(d?.x ?? 0, d?.y ?? 0)
		);
	});

	it('settles known nodes near where they already were', () => {
		const settled = simulate(request());
		const again = simulate(request({ previous: settled }));
		const before = settled.get('d');
		const after = again.get('d');

		// Only settling, not a fresh start: the node must not fly off.
		expect(
			distanceFromOrigin(
				(after?.x ?? 0) - (before?.x ?? 0),
				(after?.y ?? 0) - (before?.y ?? 0)
			)
		).toBeLessThan(200);
	});

	it('ignores edges whose ends are not in the graph', () => {
		const positions = simulate(
			request({ edges: [edge('a', 'b'), edge('b', 'nowhere')] })
		);

		expect(positions.size).toBe(4);
	});

	it('has nothing to place when the network is empty', () => {
		const positions = simulate(
			request({ nodes: [], edges: [], focusId: null })
		);

		expect(positions.size).toBe(0);
	});
});
