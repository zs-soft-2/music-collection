import { ArtistType } from '@music-collection/api';

/**
 * View models of the relationship network. The graph is bipartite: a musician
 * only connects to groups (bands, projects, formations) and a group only to
 * musicians — two musicians are linked through the groups they played in.
 */

export type NetworkNodeKind = 'musician' | ArtistType;

/** member = current member, former = left the group, guest = played on records. */
export type NetworkEdgeKind = 'member' | 'former' | 'guest';

export const NETWORK_KIND_LABELS: Record<NetworkNodeKind, string> = {
	musician: 'Musician',
	band: 'Band',
	project: 'Project',
	formation: 'Formation',
};

export interface NetworkNode {
	/** `musician:<uid>` or `artist:<uid>` — stable `track` key. */
	id: string;
	uid: string;
	kind: NetworkNodeKind;
	label: string;
	imageUrl: string | null;
	/** A group with releases in the collection. */
	owned: boolean;
	/** Hops from the focus. */
	distance: number;
	/** Page of the node in the app; musicians have none. */
	link: string[] | null;
}

export interface NetworkEdge {
	id: string;
	source: string;
	target: string;
	kind: NetworkEdgeKind;
	label: string;
	/** e.g. "1981–1993", "1999–present". */
	years: string | null;
}

export interface NetworkGraph {
	nodes: NetworkNode[];
	edges: NetworkEdge[];
	/** Nodes were left out because the network grew past the limit. */
	truncated: boolean;
}

export interface NetworkFilter {
	focusId: string;
	/** Membership hops from the focus. */
	depth: number;
	/** Guest appearances as edges (and the guests reached through them). */
	includeGuests: boolean;
	/** Only groups with releases in the collection. */
	onlyOwned: boolean;
}

/** One membership of a musician, or one member of a band. */
export interface NetworkMembershipView {
	nodeId: string;
	name: string;
	kind: 'member' | 'guest';
	instruments: string[];
	years: string | null;
	active: boolean;
}

/** Two musicians in the same band at the same time. */
export interface NetworkTogetherView {
	nodeId: string;
	name: string;
	/** The group they played in together. */
	via: string;
	years: string;
	/** Both of them are still in that group. */
	active: boolean;
}

/** Two groups a musician was in at the same time. */
export interface NetworkParallelView {
	first: string;
	second: string;
	years: string;
	active: boolean;
}

export interface NetworkAlbumView {
	id: string;
	title: string;
	artistName: string;
	year: number | null;
	coverUrl: string | null;
	owned: boolean;
}

export interface NetworkDetailsView {
	node: NetworkNode;
	/** Musician: their groups; group: its line-up. */
	memberships: NetworkMembershipView[];
	together: NetworkTogetherView[];
	parallel: NetworkParallelView[];
	albums: NetworkAlbumView[];
	/** Edges of the node in the network. */
	connectionCount: number;
}

/** A search hit to put in the focus. */
export interface NetworkSearchResult {
	nodeId: string;
	name: string;
	kind: NetworkNodeKind;
}
