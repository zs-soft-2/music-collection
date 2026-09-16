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
	/** Kind (or the album's artist) on the second line. */
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
	album: 32,
};

const LABEL_MAX = 22;
const RING_GAP = 200;

const KIND_LABELS: Record<NetworkNodeKind, string> = {
	musician: 'Musician',
	band: 'Band',
	project: 'Project',
	album: 'Album',
};

const LINK_DISTANCE: Record<NetworkEdgeKind, number> = {
	member: 190,
	former: 200,
	guest: 220,
	released: 120,
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
	const parts = [node.label, KIND_LABELS[node.kind]];

	if (node.kind === 'album' && node.caption) {
		parts.push(`by ${node.caption}`);
	}
	if (node.owned) {
		parts.push(node.kind === 'album' ? 'in your collection' : 'collected');
	}
	parts.push(edgeCount === 1 ? '1 connection' : `${edgeCount} connections`);

	return parts.join(', ');
}

/**
 * Force-directed placement: the focus is pinned to the origin, the others
 * are pulled onto rings by their distance. Nodes already placed start from
 * their previous position, so the graph does not jump when it grows.
 */
export function layoutNetwork(
	nodes: NetworkNode[],
	edges: NetworkEdge[],
	focusId: string | null,
	previous: ReadonlyMap<string, Point>
): NetworkLayout {
	const golden = Math.PI * (3 - Math.sqrt(5));
	const simNodes: SimNode[] = nodes.map((node, index) => {
		const known = previous.get(node.id);
		const angle = index * golden;
		const radius = node.distance * RING_GAP;
		const pinned = node.id === focusId;

		return {
			id: node.id,
			kind: node.kind,
			distance: node.distance,
			x: pinned ? 0 : (known?.x ?? Math.cos(angle) * radius),
			y: pinned ? 0 : (known?.y ?? Math.sin(angle) * radius),
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
				.strength(0.5)
		)
		.force('charge', forceManyBody<SimNode>().strength(-900))
		.force(
			'collide',
			forceCollide<SimNode>((node) => NODE_RADIUS[node.kind] + 38)
		)
		.force(
			'radial',
			forceRadial<SimNode>((node) => node.distance * RING_GAP).strength(
				0.25
			)
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

	const positions = new Map(
		simNodes.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }])
	);
	const edgeCounts = new Map<string, number>();

	for (const edge of edges) {
		edgeCounts.set(edge.source, (edgeCounts.get(edge.source) ?? 0) + 1);
		edgeCounts.set(edge.target, (edgeCounts.get(edge.target) ?? 0) + 1);
	}

	const placedNodes: PlacedNode[] = nodes.map((node) => {
		const position = positions.get(node.id) ?? { x: 0, y: 0 };

		return {
			...node,
			...position,
			shortLabel: clip(node.label),
			captionText: clip(
				node.kind === 'album' && node.caption
					? node.caption
					: KIND_LABELS[node.kind]
			),
			initials: initialsOf(node.label),
			labelY: NODE_RADIUS[node.kind] + 20,
			ariaLabel: ariaLabelOf(node, edgeCounts.get(node.id) ?? 0),
		};
	});
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
