import { MembershipEntity } from '@music-collection/api';

import { AlbumView, ArtistView } from '../../shared/music-ui';
import {
	NetworkAlbumView,
	NetworkDetailsView,
	NetworkEdge,
	NetworkFilter,
	NetworkGraph,
	NetworkMembershipView,
	NetworkNode,
	NetworkNodeKind,
	NetworkParallelView,
	NetworkSearchResult,
	NetworkTogetherView,
} from './network.model';

/** The network stops growing here; beyond it a graph is no longer readable. */
export const MAX_NETWORK_NODES = 120;

/** Albums drawn around a band; the details panel lists all of them. */
export const ALBUMS_PER_ARTIST = 8;

const SEARCH_LIMIT = 8;

export const musicianNodeId = (uid: string) => `musician:${uid}`;
export const artistNodeId = (uid: string) => `artist:${uid}`;
export const albumNodeId = (uid: string) => `album:${uid}`;

export interface NetworkSource {
	memberships: MembershipEntity[];
	artists: ArtistView[];
	albums: (AlbumView & { artistId: string })[];
	/** Albums with at least one release in the collection. */
	ownedAlbumIds: ReadonlySet<string>;
	/** Artists with at least one release in the collection. */
	collectedArtistIds: ReadonlySet<string>;
}

/** Lookup tables of the whole catalog; the graphs are cut out of this. */
export interface NetworkIndex {
	nodes: Map<string, NetworkNode>;
	membershipsByMusician: Map<string, MembershipEntity[]>;
	membershipsByArtist: Map<string, MembershipEntity[]>;
	/** Sorted by year. */
	albumsByArtist: Map<string, NetworkAlbumView[]>;
	albumsById: Map<string, NetworkAlbumView & { artistId: string }>;
	/** Album uid → memberships that list the album. */
	membershipsByAlbum: Map<string, MembershipEntity[]>;
}

interface Span {
	from: number;
	to: number;
	active: boolean;
}

export function normalizeName(name: string): string {
	return name
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLocaleLowerCase()
		.trim();
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
	const list = map.get(key);

	if (list) {
		list.push(value);
	} else {
		map.set(key, [value]);
	}
}

function spanOf(
	membership: MembershipEntity,
	currentYear: number
): Span | null {
	if (typeof membership.from !== 'number') {
		return null;
	}
	const active = !!membership.active;

	return {
		from: membership.from,
		to: active ? currentYear : (membership.to ?? membership.from),
		active,
	};
}

function overlapOf(a: Span, b: Span): Span | null {
	const from = Math.max(a.from, b.from);
	const to = Math.min(a.to, b.to);

	return from <= to ? { from, to, active: a.active && b.active } : null;
}

export function formatSpan(span: Span): string {
	if (span.active) {
		return `${span.from}–present`;
	}
	return span.from === span.to
		? String(span.from)
		: `${span.from}–${span.to}`;
}

export function membershipYears(
	membership: MembershipEntity,
	currentYear: number
): string | null {
	const span = spanOf(membership, currentYear);

	if (span) {
		return formatSpan(span);
	}
	return membership.active ? 'present' : null;
}

/** Members before guests, current before former, then by joining year. */
function byImportance(a: MembershipEntity, b: MembershipEntity): number {
	return (
		Number(a.kind !== 'member') - Number(b.kind !== 'member') ||
		Number(!!b.active) - Number(!!a.active) ||
		(a.from ?? 9999) - (b.from ?? 9999) ||
		(b.albumCount ?? 0) - (a.albumCount ?? 0)
	);
}

export function buildNetworkIndex(source: NetworkSource): NetworkIndex {
	const nodes = new Map<string, NetworkNode>();
	const membershipsByMusician = new Map<string, MembershipEntity[]>();
	const membershipsByArtist = new Map<string, MembershipEntity[]>();
	const membershipsByAlbum = new Map<string, MembershipEntity[]>();
	const artistsById = new Map(source.artists.map((a) => [a.id, a]));
	const artistsByName = new Map(
		source.artists.map((a) => [normalizeName(a.name), a])
	);

	for (const membership of source.memberships) {
		push(membershipsByMusician, membership.musicianUid, membership);
		push(membershipsByArtist, membership.artistUid, membership);
		for (const albumUid of membership.albumUids ?? []) {
			push(membershipsByAlbum, albumUid, membership);
		}
	}
	membershipsByMusician.forEach((list) => list.sort(byImportance));
	membershipsByArtist.forEach((list) => list.sort(byImportance));

	const addArtist = (uid: string, fallbackName: string) => {
		const id = artistNodeId(uid);

		if (nodes.has(id)) {
			return;
		}
		const view = artistsById.get(uid);
		const name = view?.name ?? fallbackName;
		// A solo project: the band carries the name of one of its members.
		const isProject = (membershipsByArtist.get(uid) ?? []).some(
			(m) =>
				m.kind === 'member' &&
				normalizeName(m.musicianName) === normalizeName(name)
		);

		nodes.set(id, {
			id,
			uid,
			kind: isProject ? 'project' : 'band',
			label: name,
			caption: view?.country ?? null,
			imageUrl: view?.imageUrl ?? null,
			owned: source.collectedArtistIds.has(uid),
			distance: 0,
			link: view ? ['/artist', uid] : null,
		});
	};

	for (const artist of source.artists) {
		addArtist(artist.id, artist.name);
	}
	for (const membership of source.memberships) {
		addArtist(membership.artistUid, membership.artistName);

		const id = musicianNodeId(membership.musicianUid);

		if (!nodes.has(id)) {
			nodes.set(id, {
				id,
				uid: membership.musicianUid,
				kind: 'musician',
				label: membership.musicianName,
				caption: null,
				// A musician with a solo project shares its portrait.
				imageUrl:
					artistsByName.get(normalizeName(membership.musicianName))
						?.imageUrl ?? null,
				owned: false,
				distance: 0,
				link: null,
			});
		}
	}

	const albumsById = new Map<
		string,
		NetworkAlbumView & { artistId: string }
	>();
	const albumsByArtist = new Map<string, NetworkAlbumView[]>();

	for (const album of source.albums) {
		const view = {
			nodeId: albumNodeId(album.id),
			id: album.id,
			title: album.title,
			artistName: album.artistName,
			artistId: album.artistId,
			year: album.year,
			coverUrl: album.coverUrl,
			owned: source.ownedAlbumIds.has(album.id),
		};

		albumsById.set(album.id, view);
		push(albumsByArtist, album.artistId, view);
		nodes.set(view.nodeId, {
			id: view.nodeId,
			uid: album.id,
			kind: 'album',
			label: album.title,
			caption: album.artistName || null,
			imageUrl: album.coverUrl,
			owned: view.owned,
			distance: 0,
			link: ['/album', album.id],
		});
	}
	albumsByArtist.forEach((list) =>
		list.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
	);

	return {
		nodes,
		membershipsByMusician,
		membershipsByArtist,
		albumsByArtist,
		albumsById,
		membershipsByAlbum,
	};
}

function membershipEdge(
	membership: MembershipEntity,
	currentYear: number
): NetworkEdge {
	const kind =
		membership.kind !== 'member'
			? 'guest'
			: membership.active === false
				? 'former'
				: 'member';

	return {
		id: `${membership.musicianUid}>${membership.artistUid}`,
		source: musicianNodeId(membership.musicianUid),
		target: artistNodeId(membership.artistUid),
		kind,
		label: kind === 'former' ? 'former member' : kind,
		years: membershipYears(membership, currentYear),
	};
}

/**
 * Cuts the network around the focus: breadth-first along memberships up to
 * `depth` hops, then the albums of the bands next to the focus.
 */
export function buildNetwork(
	index: NetworkIndex,
	filter: NetworkFilter,
	currentYear: number
): NetworkGraph {
	const focus = index.nodes.get(filter.focusId);

	if (!focus) {
		return { nodes: [], edges: [], truncated: false };
	}

	const kindShown = (kind: NetworkNodeKind) =>
		kind === 'musician'
			? filter.showMusicians
			: kind === 'album'
				? filter.showAlbums
				: filter.showBands;
	// Filtered out nodes are not walked through either — except hidden
	// musicians / bands, which still connect what is shown.
	const passable = (node: NetworkNode) =>
		node.id === focus.id ||
		!filter.onlyOwned ||
		node.kind === 'musician' ||
		node.owned;

	const reached = new Map<string, NetworkNode>([
		[focus.id, { ...focus, distance: 0 }],
	]);
	const memberships = new Map<string, MembershipEntity>();
	let truncated = false;
	let frontier = [focus];

	const neighbours = (node: NetworkNode): MembershipEntity[] => {
		const list =
			node.kind === 'musician'
				? index.membershipsByMusician.get(node.uid)
				: node.kind === 'album'
					? []
					: index.membershipsByArtist.get(node.uid);

		return (list ?? []).filter(
			(m) => filter.includeGuests || m.kind === 'member'
		);
	};

	if (focus.kind === 'album') {
		const album = index.albumsById.get(focus.uid);
		const artist = album && index.nodes.get(artistNodeId(album.artistId));

		if (artist) {
			reached.set(artist.id, { ...artist, distance: 1 });
			frontier = [artist];
		}
	}

	// An album's band is already one hop away.
	const firstHop = focus.kind === 'album' ? 2 : 1;

	for (
		let distance = firstHop;
		distance <= filter.depth && frontier.length;
		distance++
	) {
		const next: NetworkNode[] = [];

		for (const node of frontier) {
			for (const membership of neighbours(node)) {
				const otherId =
					node.kind === 'musician'
						? artistNodeId(membership.artistUid)
						: musicianNodeId(membership.musicianUid);
				const other = index.nodes.get(otherId);

				if (!other || !passable(other)) {
					continue;
				}
				if (!reached.has(otherId)) {
					if (reached.size >= MAX_NETWORK_NODES) {
						truncated = true;
						continue;
					}
					const placed = { ...other, distance };

					reached.set(otherId, placed);
					next.push(placed);
				}
				memberships.set(
					`${membership.musicianUid}>${membership.artistUid}`,
					membership
				);
			}
		}
		frontier = next;
	}

	const nodes = [...reached.values()].filter(
		(node) => node.id === focus.id || kindShown(node.kind)
	);
	const shown = new Set(nodes.map((node) => node.id));
	const edges: NetworkEdge[] = [];

	for (const membership of memberships.values()) {
		const edge = membershipEdge(membership, currentYear);

		if (shown.has(edge.source) && shown.has(edge.target)) {
			edges.push(edge);
		}
	}

	if (!filter.showMusicians) {
		edges.push(...sharedMemberEdges(memberships, shown));
	}

	if (filter.showAlbums) {
		const bands = nodes.filter(
			(node) =>
				(node.kind === 'band' || node.kind === 'project') &&
				node.distance <= 1
		);

		for (const band of bands) {
			const albums = (index.albumsByArtist.get(band.uid) ?? [])
				.filter((album) => !filter.onlyOwned || album.owned)
				.slice()
				.sort((a, b) => Number(b.owned) - Number(a.owned))
				.slice(0, ALBUMS_PER_ARTIST);

			for (const album of albums) {
				const node = index.nodes.get(album.nodeId);

				if (!node) {
					continue;
				}
				if (!shown.has(node.id)) {
					shown.add(node.id);
					nodes.push({ ...node, distance: band.distance + 1 });
				}
				edges.push({
					id: `${band.id}>${node.id}`,
					source: band.id,
					target: node.id,
					kind: 'released',
					label: 'released',
					years: album.year ? String(album.year) : null,
				});
			}
		}
	}

	return { nodes, edges, truncated };
}

/** Band ↔ band edges through the (hidden) musicians they share. */
function sharedMemberEdges(
	memberships: Map<string, MembershipEntity>,
	shown: Set<string>
): NetworkEdge[] {
	const bandsByMusician = new Map<string, string[]>();

	for (const membership of memberships.values()) {
		const bandId = artistNodeId(membership.artistUid);

		if (shown.has(bandId)) {
			push(bandsByMusician, membership.musicianUid, bandId);
		}
	}

	const shared = new Map<string, number>();

	for (const bands of bandsByMusician.values()) {
		for (let i = 0; i < bands.length; i++) {
			for (let j = i + 1; j < bands.length; j++) {
				const key = [bands[i], bands[j]].sort().join('|');

				shared.set(key, (shared.get(key) ?? 0) + 1);
			}
		}
	}

	return [...shared].map(([key, count]) => {
		const [source, target] = key.split('|');

		return {
			id: key,
			source,
			target,
			kind: 'member',
			label:
				count === 1 ? '1 shared musician' : `${count} shared musicians`,
			years: null,
		};
	});
}

function toMembershipView(
	membership: MembershipEntity,
	of: 'musician' | 'artist',
	currentYear: number
): NetworkMembershipView {
	return {
		nodeId:
			of === 'musician'
				? musicianNodeId(membership.musicianUid)
				: artistNodeId(membership.artistUid),
		name:
			of === 'musician' ? membership.musicianName : membership.artistName,
		kind: membership.kind === 'member' ? 'member' : 'guest',
		instruments: [...new Set(membership.instruments ?? [])],
		years: membershipYears(membership, currentYear),
		active: !!membership.active,
	};
}

/** Bandmates of a musician: same band, overlapping years. */
function togetherWith(
	index: NetworkIndex,
	own: MembershipEntity[],
	currentYear: number
): NetworkTogetherView[] {
	const together = new Map<string, NetworkTogetherView>();

	for (const membership of own) {
		const span = spanOf(membership, currentYear);

		if (membership.kind !== 'member' || !span) {
			continue;
		}
		for (const other of index.membershipsByArtist.get(
			membership.artistUid
		) ?? []) {
			const otherSpan = spanOf(other, currentYear);
			const overlap = otherSpan && overlapOf(span, otherSpan);

			if (
				other.musicianUid === membership.musicianUid ||
				other.kind !== 'member' ||
				!overlap
			) {
				continue;
			}
			const key = `${other.musicianUid}>${membership.artistUid}`;

			together.set(key, {
				nodeId: musicianNodeId(other.musicianUid),
				name: other.musicianName,
				via: membership.artistName,
				years: formatSpan(overlap),
				active: overlap.active,
			});
		}
	}

	return [...together.values()].sort(
		(a, b) =>
			Number(b.active) - Number(a.active) ||
			a.via.localeCompare(b.via) ||
			a.name.localeCompare(b.name)
	);
}

/** Bands a musician was in at the same time (at least a year, or still). */
function parallelBands(
	own: MembershipEntity[],
	currentYear: number
): NetworkParallelView[] {
	const members = own.filter((m) => m.kind === 'member');
	const parallel: NetworkParallelView[] = [];

	for (let i = 0; i < members.length; i++) {
		for (let j = i + 1; j < members.length; j++) {
			const a = spanOf(members[i], currentYear);
			const b = spanOf(members[j], currentYear);
			const overlap = a && b && overlapOf(a, b);

			if (
				!overlap ||
				members[i].artistUid === members[j].artistUid ||
				(overlap.from === overlap.to && !overlap.active)
			) {
				continue;
			}
			parallel.push({
				first: members[i].artistName,
				second: members[j].artistName,
				years: formatSpan(overlap),
				active: overlap.active,
			});
		}
	}

	return parallel.sort((a, b) => Number(b.active) - Number(a.active));
}

export function buildNetworkDetails(
	index: NetworkIndex,
	graph: NetworkGraph,
	nodeId: string,
	currentYear: number
): NetworkDetailsView | null {
	const node =
		graph.nodes.find((candidate) => candidate.id === nodeId) ??
		index.nodes.get(nodeId);

	if (!node) {
		return null;
	}
	const connectionCount = graph.edges.filter(
		(edge) => edge.source === nodeId || edge.target === nodeId
	).length;
	const base = {
		node,
		connectionCount,
		together: [],
		parallel: [],
	};

	if (node.kind === 'musician') {
		const own = index.membershipsByMusician.get(node.uid) ?? [];
		const albumIds = new Set(own.flatMap((m) => m.albumUids ?? []));

		return {
			...base,
			memberships: own.map((m) =>
				toMembershipView(m, 'artist', currentYear)
			),
			together: togetherWith(index, own, currentYear),
			parallel: parallelBands(own, currentYear),
			albums: [...albumIds]
				.map((id) => index.albumsById.get(id))
				.filter((album) => !!album)
				.sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999)),
		};
	}

	if (node.kind === 'album') {
		return {
			...base,
			memberships: (index.membershipsByAlbum.get(node.uid) ?? []).map(
				(m) => toMembershipView(m, 'musician', currentYear)
			),
			albums: [],
		};
	}

	return {
		...base,
		memberships: (index.membershipsByArtist.get(node.uid) ?? []).map((m) =>
			toMembershipView(m, 'musician', currentYear)
		),
		albums: index.albumsByArtist.get(node.uid) ?? [],
	};
}

/** Musicians, bands and albums by name; prefix matches first. */
export function searchNetwork(
	index: NetworkIndex,
	query: string
): NetworkSearchResult[] {
	const needle = normalizeName(query);

	if (needle.length < 2) {
		return [];
	}
	const hits: (NetworkSearchResult & { rank: number })[] = [];

	for (const node of index.nodes.values()) {
		const position = normalizeName(node.label).indexOf(needle);

		if (position >= 0) {
			hits.push({
				nodeId: node.id,
				name: node.label,
				kind: node.kind,
				rank:
					(position === 0 ? 0 : 2) + (node.kind === 'album' ? 1 : 0),
			});
		}
	}

	return hits
		.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
		.slice(0, SEARCH_LIMIT)
		.map(({ nodeId, name, kind }) => ({ nodeId, name, kind }));
}

/** Without a focus in the URL: the collected band with the largest line-up. */
export function defaultFocus(index: NetworkIndex): string | null {
	let best: { id: string; score: number } | null = null;

	for (const [artistUid, list] of index.membershipsByArtist) {
		const node = index.nodes.get(artistNodeId(artistUid));
		const score =
			list.filter((m) => m.kind === 'member').length +
			(node?.owned ? 1000 : 0);

		if (node && (!best || score > best.score)) {
			best = { id: node.id, score };
		}
	}

	return best?.id ?? null;
}
