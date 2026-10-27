import {
	NETWORK_KIND_LABELS,
	NetworkEdge,
	NetworkEdgeKind,
	NetworkNode,
	NetworkNodeKind,
} from '../../network.model';
import { NetworkLayoutRequest, Point } from './network-graph.simulation';

export type { Point };

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

/** How far apart the force holds the two ends of each kind of edge. */
const LINK_DISTANCE: Record<NetworkEdgeKind, number> = {
	member: 190,
	former: 200,
	guest: 220,
};

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

/**
 * The network as the force layout sees it: circles with a radius and a
 * distance from the focus. Only this much crosses to the worker — labels,
 * images and links stay here, where they are drawn.
 */
export function toLayoutRequest(
	nodes: NetworkNode[],
	edges: NetworkEdge[],
	focusId: string | null,
	previous: ReadonlyMap<string, Point>
): NetworkLayoutRequest {
	return {
		nodes: nodes.map((node) => ({
			id: node.id,
			radius: NODE_RADIUS[node.kind],
			distance: node.distance,
		})),
		edges: edges.map((edge) => ({
			source: edge.source,
			target: edge.target,
			length: LINK_DISTANCE[edge.kind],
		})),
		focusId,
		previous,
	};
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
