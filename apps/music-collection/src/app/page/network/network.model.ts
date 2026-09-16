/**
 * View models of the relationship network: musicians, bands, solo projects
 * and albums as nodes; memberships and releases as edges.
 */

export type NetworkNodeKind = 'musician' | 'band' | 'project' | 'album';

/** member = current member, former = left the band, released = band → album. */
export type NetworkEdgeKind = 'member' | 'former' | 'guest' | 'released';

export interface NetworkNode {
	/** `musician:<uid>`, `artist:<uid>` or `album:<uid>` — stable `track` key. */
	id: string;
	uid: string;
	kind: NetworkNodeKind;
	label: string;
	/** Second line under the label, e.g. the band of an album. */
	caption: string | null;
	imageUrl: string | null;
	/** Album: in the collection; band / project: has collected releases. */
	owned: boolean;
	/** Hops from the focus (albums: their band's distance + 1). */
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
	/** Membership hops from the focus (1–3). */
	depth: number;
	showMusicians: boolean;
	showBands: boolean;
	showAlbums: boolean;
	/** Guest appearances as edges (and the guests reached through them). */
	includeGuests: boolean;
	/** Only albums in the collection and bands with collected releases. */
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
	/** The band they played in together. */
	via: string;
	years: string;
	/** Both of them are still in that band. */
	active: boolean;
}

/** Two bands a musician was in at the same time. */
export interface NetworkParallelView {
	first: string;
	second: string;
	years: string;
	active: boolean;
}

export interface NetworkAlbumView {
	nodeId: string;
	id: string;
	title: string;
	artistName: string;
	year: number | null;
	coverUrl: string | null;
	owned: boolean;
}

export interface NetworkDetailsView {
	node: NetworkNode;
	/** Musician: their bands; band / project: its line-up. */
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
