import {
	SimulationLinkDatum,
	SimulationNodeDatum,
	forceCollide,
	forceLink,
	forceManyBody,
	forceRadial,
	forceSimulation,
} from 'd3-force';

import {
	NETWORK_KIND_LABELS,
	NetworkEdge,
	NetworkEdgeKind,
	NetworkNode,
	NetworkNodeKind,
} from '../../network.model';

export interface Point {
	x: number;
	y: number;
}

export interface PlacedNode extends NetworkNode, Point {
	/** Label clipped to fit under the node. */
	shortLabel: string;
	/** Kind of the node on the second line. */
	captionText: string;
	initials: string;
	/** Distance of the label's baseline from the node centre. */
	labelY: number;
	ariaLabel: string;
}

export interface PlacedEdge extends NetworkEdge {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	/** Midpoint, where the label sits. */
	mx: number;
	my: number;
}

export interface NetworkLayout {
	nodes: PlacedNode[];
	edges: PlacedEdge[];
}

/** Half extent of the node shapes — edges end at the boundary. */
export const NODE_RADIUS: Record<NetworkNodeKind, number> = {
	musician: 36,
	band: 44,
	project: 42,
	formation: 42,
};

const LABEL_MAX = 22;
const RING_GAP = 200;

const LINK_DISTANCE: Record<NetworkEdgeKind, number> = {
	member: 190,
	former: 200,
	guest: 220,
};

interface SimNode extends SimulationNodeDatum {
	id: string;
	kind: NetworkNodeKind;
	distance: number;
}

type SimLink = SimulationLinkDatum<SimNode> & { kind: NetworkEdgeKind };

function clip(text: string): string {
	return text.length > LABEL_MAX ? `${text.slice(0, LABEL_MAX - 1)}…` : text;
}

function initialsOf(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}

function ariaLabelOf(node: NetworkNode, edgeCount: number): string {
	const parts = [node.label, NETWORK_KIND_LABELS[node.kind]];

	if (node.owned) {
		parts.push('in your collection');
	}
	parts.push(edgeCount === 1 ? '1 connection' : `${edgeCount} connections`);

	return parts.join(', ');
}

/** Room a node needs on its ring: its shape plus the label around it. */
const RING_SLOT = 2 * 38;

/**
 * Radius of each distance ring: at least RING_GAP further out than the
 * previous one, and wide enough that the ring's nodes fit side by side.
 */
function ringRadii(nodes: NetworkNode[]): number[] {
	const slots: number[] = [];

	for (const node of nodes) {
		slots[node.distance] =
			(slots[node.distance] ?? 0) +
			NODE_RADIUS[node.kind] * 2 +
			RING_SLOT;
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
 */
export function simulateNetwork(
	nodes: NetworkNode[],
	edges: NetworkEdge[],
	focusId: string | null,
	previous: ReadonlyMap<string, Point>
): Map<string, Point> {
	const golden = Math.PI * (3 - Math.sqrt(5));
	const radii = ringRadii(nodes);
	const ring = (distance: number) => radii[distance] ?? 0;
	const simNodes: SimNode[] = nodes.map((node, index) => {
		const known = previous.get(node.id);
		const angle = index * golden;
		const pinned = node.id === focusId;

		return {
			id: node.id,
			kind: node.kind,
			distance: node.distance,
			x: pinned ? 0 : (known?.x ?? Math.cos(angle) * ring(node.distance)),
			y: pinned ? 0 : (known?.y ?? Math.sin(angle) * ring(node.distance)),
			fx: pinned ? 0 : undefined,
			fy: pinned ? 0 : undefined,
		};
	});
	const ids = new Set(simNodes.map((node) => node.id));
	const links: SimLink[] = edges
		.filter((edge) => ids.has(edge.source) && ids.has(edge.target))
		.map((edge) => ({
			source: edge.source,
			target: edge.target,
			kind: edge.kind,
		}));
	const reused = simNodes.filter((node) => previous.has(node.id)).length;

	const simulation = forceSimulation<SimNode>(simNodes)
		.force(
			'link',
			forceLink<SimNode, SimLink>(links)
				.id((node) => node.id)
				.distance((link) => LINK_DISTANCE[link.kind])
				.strength(0.3)
		)
		.force('charge', forceManyBody<SimNode>().strength(-900))
		.force(
			'collide',
			forceCollide<SimNode>((node) => NODE_RADIUS[node.kind] + 38)
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

/** The most a layout is stretched to match the canvas. */
const MAX_STRETCH = 2.5;

/**
 * Stretches the simulated positions (around the focus at the origin) to the
 * aspect ratio of the canvas, so that "fit" fills it instead of leaving a
 * round blob in a wide frame. Only distances grow; nothing gets closer.
 */
function stretchToAspect(
	positions: ReadonlyMap<string, Point>,
	aspect: number
): Map<string, Point> {
	const points = [...positions.values()];

	if (points.length < 2 || !Number.isFinite(aspect) || aspect <= 0) {
		return new Map(positions);
	}
	const width =
		Math.max(...points.map((p) => p.x)) -
		Math.min(...points.map((p) => p.x));
	const height =
		Math.max(...points.map((p) => p.y)) -
		Math.min(...points.map((p) => p.y));
	// Label room keeps a flat row of nodes from being stretched into a line.
	const current = (width + 200) / (height + 200);
	const sx = aspect > current ? Math.min(aspect / current, MAX_STRETCH) : 1;
	const sy = aspect < current ? Math.min(current / aspect, MAX_STRETCH) : 1;

	return new Map(
		[...positions].map(([id, p]) => [id, { x: p.x * sx, y: p.y * sy }])
	);
}

/** Final geometry: stretched node positions, edges cut at the node shapes. */
export function placeNetwork(
	nodes: NetworkNode[],
	edges: NetworkEdge[],
	simulated: ReadonlyMap<string, Point>,
	aspect: number
): NetworkLayout {
	const positions = stretchToAspect(simulated, aspect);
	const edgeCounts = new Map<string, number>();

	for (const edge of edges) {
		edgeCounts.set(edge.source, (edgeCounts.get(edge.source) ?? 0) + 1);
		edgeCounts.set(edge.target, (edgeCounts.get(edge.target) ?? 0) + 1);
	}

	const placedNodes: PlacedNode[] = nodes.map((node) => ({
		...node,
		...(positions.get(node.id) ?? { x: 0, y: 0 }),
		shortLabel: clip(node.label),
		captionText: NETWORK_KIND_LABELS[node.kind],
		initials: initialsOf(node.label),
		labelY: NODE_RADIUS[node.kind] + 20,
		ariaLabel: ariaLabelOf(node, edgeCounts.get(node.id) ?? 0),
	}));
	const kinds = new Map(nodes.map((node) => [node.id, node.kind]));

	const placedEdges = edges.flatMap((edge): PlacedEdge[] => {
		const from = positions.get(edge.source);
		const to = positions.get(edge.target);
		const fromKind = kinds.get(edge.source);
		const toKind = kinds.get(edge.target);

		if (!from || !to || !fromKind || !toKind) {
			return [];
		}
		const dx = to.x - from.x;
		const dy = to.y - from.y;
		const length = Math.hypot(dx, dy) || 1;
		const ux = dx / length;
		const uy = dy / length;
		const start = NODE_RADIUS[fromKind] + 4;
		const end = NODE_RADIUS[toKind] + 8;

		return [
			{
				...edge,
				x1: from.x + ux * start,
				y1: from.y + uy * start,
				x2: to.x - ux * end,
				y2: to.y - uy * end,
				mx: (from.x + to.x) / 2,
				my: (from.y + to.y) / 2,
			},
		];
	});

	return { nodes: placedNodes, edges: placedEdges };
}
