import {
	CollectionShortfall,
	MusicCollectionDemand,
	MusicCollectionMembership,
	NextAlbumSuggestion,
} from '@music-collection/domain/music-collection/api';

/**
 * Which record to hunt for next.
 *
 * The scoring rule that nothing is earned until a collection is complete is
 * what makes this worth computing: with it, the last missing record of a
 * collection is worth the entire collection, and the second to last is worth
 * nothing yet. A collector reading a list of eight hundred missing albums
 * cannot see that; this is the same knowledge, sorted.
 *
 * Two numbers, because two things are true at once. `unlockedPoints` is
 * money on the table — buy this record and the score changes today. Where
 * nothing is unlocked, `potentialPoints` says how much of the locked score
 * this record moves: each collection hands its still-locked points out
 * equally among the records it is still missing, so a set two records from
 * done pays its share generously and a set barely begun hardly at all. A
 * record several collections want collects a share from each, which is
 * exactly why it is the better buy.
 *
 * Nothing here is stored and nothing is fetched: the shortfalls come from
 * collections already resolved against a catalog already in memory, so the
 * whole list costs a pass over it.
 */

/** By artist, then chronologically, then by title — as the resolver orders. */
function compareAlbums(
	a: MusicCollectionMembership,
	b: MusicCollectionMembership
): number {
	return (
		a.artistName.localeCompare(b.artistName) ||
		(a.year ?? 0) - (b.year ?? 0) ||
		a.albumName.localeCompare(b.albumName)
	);
}

/** Nearest to finishing first, and the richer set first among equals. */
function compareDemands(
	a: MusicCollectionDemand,
	b: MusicCollectionDemand
): number {
	return (
		a.missing - b.missing ||
		b.totalPoints - a.totalPoints ||
		a.collectionUid.localeCompare(b.collectionUid)
	);
}

/** What is unlocked first, then what moves the most, then the shelf order. */
function compareSuggestions(
	a: NextAlbumSuggestion,
	b: NextAlbumSuggestion
): number {
	return (
		b.unlockedPoints - a.unlockedPoints ||
		b.potentialPoints - a.potentialPoints ||
		compareAlbums(a.album, b.album)
	);
}

/** A suggestion while it is being added up; the points are rounded at the end. */
interface Tally {
	album: MusicCollectionMembership;
	unlockedPoints: number;
	completesCollectionUids: string[];
	potential: number;
	wantedBy: MusicCollectionDemand[];
}

/**
 * Every record the collector is missing, the best buy first.
 *
 * A record already on the shelf is never here: it is not missing from
 * anything. A collection that asks for nothing more adds nothing, so a
 * completed set cannot push a record up the list.
 *
 * The whole ranked list is returned — the pages show the head of it — because
 * where to cut is a question about a page, not about a collection.
 */
export function suggestNextAlbums(
	shortfalls: readonly CollectionShortfall[]
): NextAlbumSuggestion[] {
	const tallies = new Map<string, Tally>();

	for (const shortfall of shortfalls) {
		const missing = shortfall.missingAlbumUids.length;

		// Complete, or resolving to nothing: it is not asking for a record.
		if (missing === 0) {
			continue;
		}

		const members = new Map(
			shortfall.albums.map((album) => [album.albumUid, album])
		);
		// What one of the still-missing records is worth of the locked score.
		const share = shortfall.totalPoints / missing;
		const demand: MusicCollectionDemand = {
			collectionUid: shortfall.collectionUid,
			missing,
			totalPoints: shortfall.totalPoints,
		};

		for (const albumUid of shortfall.missingAlbumUids) {
			const album = members.get(albumUid);

			// A uid the collection does not ask for cannot be described, and
			// naming a record the collector cannot look up is worse than
			// leaving it out.
			if (!album) {
				continue;
			}

			const tally = tallies.get(albumUid) ?? {
				album,
				unlockedPoints: 0,
				completesCollectionUids: [],
				potential: 0,
				wantedBy: [],
			};

			tally.potential += share;
			tally.wantedBy.push(demand);

			// The last one missing: buying it hands over the whole score.
			if (missing === 1) {
				tally.unlockedPoints += shortfall.totalPoints;
				tally.completesCollectionUids.push(shortfall.collectionUid);
			}

			tallies.set(albumUid, tally);
		}
	}

	return [...tallies.values()]
		.map(({ potential, ...tally }) => ({
			...tally,
			potentialPoints: Math.round(potential),
			wantedBy: tally.wantedBy.sort(compareDemands),
		}))
		.sort(compareSuggestions);
}
