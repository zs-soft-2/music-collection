import {
	SimulationLinkDatum,
	SimulationNodeDatum,
	forceCollide,
	forceLink,
	forceManyBody,
	forceRadial,
	forceSimulation,
} from 'd3-force';

/**
 * The force layout, and nothing else.
 *
 * It knows about circles at distances from a centre — not about musicians,
 * bands or labels. That is deliberate: this module runs in a web worker
 * (`network-graph.worker.ts`), so it must not reach for the DOM, Angular or
 * the domain model, and only what is named here has to cross the thread
 * boundary. `network-graph.layout.ts` translates the network into it.
 */

export interface Point {
	x: number;
	y: number;
}

export interface LayoutNode {
	id: string;
	/** Half extent of the shape: how much room it needs around it. */
	radius: number;
	/** Hops from the focus; decides the ring it is pulled onto. */
	distance: number;
}

export interface LayoutEdge {
	source: string;
	target: string;
	/** How far apart the force wants to hold the two ends. */
	length: number;
}

export interface NetworkLayoutRequest {
	nodes: LayoutNode[];
	edges: LayoutEdge[];
	focusId: string | null;
	/** Positions to start from, so a growing graph does not jump. */
	previous: ReadonlyMap<string, Point>;
}

export interface NetworkLayoutResult {
	positions: Map<string, Point>;
	/** The simulation's own time, wherever it ran. */
	computeMs: number;
}

const RING_GAP = 200;
/** Room a node needs on its ring: its shape plus the label around it. */
const RING_SLOT = 2 * 38;

interface SimNode extends SimulationNodeDatum, LayoutNode {}

type SimLink = SimulationLinkDatum<SimNode> & { length: number };

/**
 * Radius of each distance ring: at least RING_GAP further out than the
 * previous one, and wide enough that the ring's nodes fit side by side.
 */
function ringRadii(nodes: readonly LayoutNode[]): number[] {
	const slots: number[] = [];

	for (const node of nodes) {
		slots[node.distance] =
			(slots[node.distance] ?? 0) + node.radius * 2 + RING_SLOT;
	}
	const radii = [0];

	for (let distance = 1; distance < slots.length; distance++) {
		radii[distance] = Math.max(
			radii[distance - 1] + RING_GAP,
			(slots[distance] ?? 0) / (2 * Math.PI)
		);
	}
	return radii;
}

/**
 * Force-directed placement: the focus is pinned to the origin, the others
 * are pulled onto rings by their distance. Nodes already placed start from
 * their previous position, so the graph does not jump when it grows.
 *
 * Every tick pulls on every pair of nodes and there are hundreds of ticks,
 * which is why this is the one piece of the page worth a thread of its own.
 */
export function simulate(request: NetworkLayoutRequest): Map<string, Point> {
	const { nodes, edges, focusId, previous } = request;
	const golden = Math.PI * (3 - Math.sqrt(5));
	const radii = ringRadii(nodes);
	const ring = (distance: number): number => radii[distance] ?? 0;
	const simNodes: SimNode[] = nodes.map((node, index) => {
		const known = previous.get(node.id);
		const angle = index * golden;
		const pinned = node.id === focusId;

		return {
			...node,
			x: pinned ? 0 : (known?.x ?? Math.cos(angle) * ring(node.distance)),
			y: pinned ? 0 : (known?.y ?? Math.sin(angle) * ring(node.distance)),
			fx: pinned ? 0 : undefined,
			fy: pinned ? 0 : undefined,
		};
	});
	const ids = new Set(simNodes.map((node) => node.id));
	const links: SimLink[] = edges
		.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
		.map((edge) => ({ ...edge }));
	const reused = simNodes.filter((node) => previous.has(node.id)).length;

	const simulation = forceSimulation<SimNode>(simNodes)
		.force(
			'link',
			forceLink<SimNode, SimLink>(links)
				.id((node) => node.id)
				.distance((link) => link.length)
				.strength(0.3)
		)
		.force('charge', forceManyBody<SimNode>().strength(-900))
		.force(
			'collide',
			forceCollide<SimNode>((node) => node.radius + 38)
		)
		.force(
			'radial',
			forceRadial<SimNode>((node) => ring(node.distance)).strength(0.35)
		)
		// Mostly known positions only need settling.
		.alpha(reused > simNodes.length / 2 ? 0.4 : 1)
		.stop();

	const ticks = Math.ceil(
		Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
	);

	for (let i = 0; i < ticks; i++) {
		simulation.tick();
	}

	return new Map(
		simNodes.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }])
	);
}

/** The simulation, timed, whichever thread it is running on. */
export function runLayout(request: NetworkLayoutRequest): NetworkLayoutResult {
	const startedAt = performance.now();

	return {
		positions: simulate(request),
		computeMs: performance.now() - startedAt,
	};
}
