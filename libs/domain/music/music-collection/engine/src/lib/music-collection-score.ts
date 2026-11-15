import { MediaEnum, RarityTier } from '@music-collection/common/api';
import {
	AlbumScore,
	FormatOpportunity,
	MUSIC_COLLECTION_MINIMUM_ALBUMS,
	MusicCollectionMembership,
	MusicCollectionScore,
	OwnedCopy,
	ResolvedMusicCollection,
	UniformMedia,
} from '@music-collection/domain/music-collection/api';

/**
 * Scoring a collection.
 *
 * An album is worth what it is on, times how rare the pressing is. The
 * albums are added up, and two multipliers stand on the sum: one for the
 * size of the collection, which every finished collection gets, and one for
 * a set of a piece — every album on the same medium — which a mixed shelf
 * does not.
 *
 * What a record costs is nowhere in here. Rarity counts copies, not prices.
 *
 * Nothing is earned until the collection is complete. That is the whole
 * point of a collection, and the reason the pages show what it *would* be
 * worth next to what it is worth now.
 */

/** What an album is worth on each medium, before rarity. */
export const MEDIA_POINTS: Record<MediaEnum, number> = {
	[MediaEnum.vinyl]: 10,
	[MediaEnum.boxset]: 8,
	[MediaEnum.cd]: 7,
	[MediaEnum.cassette]: 5,
	[MediaEnum.dvd]: 5,
	// Not a medium a copy is filed under; weighed as the least if one is.
	[MediaEnum.all]: 5,
};

export const RARITY_FACTORS: Record<RarityTier, number> = {
	common: 1,
	uncommon: 1.25,
	rare: 1.6,
	veryRare: 2,
	ultraRare: 2.5,
};

/**
 * What a set of a piece is multiplied by. A box set and a DVD are not here:
 * a box does not say what is inside it, so neither can make a set uniform.
 */
export const FORMAT_FACTORS: Record<UniformMedia, number> = {
	[MediaEnum.vinyl]: 1.5,
	[MediaEnum.cd]: 1.3,
	[MediaEnum.cassette]: 1.15,
};

/** The media a set can be uniform on, the most rewarded first. */
const UNIFORM_MEDIA: readonly UniformMedia[] = [
	MediaEnum.vinyl,
	MediaEnum.cd,
	MediaEnum.cassette,
];

/** The least an album can be worth: a common copy on the humblest medium. */
export const MINIMUM_ALBUM_POINTS = 5;

/** Vintage, as the collector's profile reads it: forty years. */
const VINTAGE_YEARS = 40;

/**
 * How old a record is, from nothing for this year's to one at forty years.
 * A year the catalog does not know earns nothing: age must be shown, not
 * assumed.
 *
 * The scoring no longer reads it — a pressing's age speaks through its
 * rarity — but the collector's profile still weighs a shelf by it.
 */
export function ageWeight(year: number | null, now: number): number {
	if (year === null) {
		return 0;
	}

	const age = new Date(now).getFullYear() - year;

	return age <= 0 ? 0 : Math.min(1, age / VINTAGE_YEARS);
}

/**
 * What the size of a collection multiplies its albums by: 1 at two albums,
 * and a quarter more every time the count doubles. It never stops growing,
 * because a collection has no largest size — only ever more slowly.
 *
 * Rounded to two places before it is used, so the sum a page shows can be
 * worked out again by hand from the numbers standing next to it.
 */
export function sizeFactor(albums: number): number {
	return albums < MUSIC_COLLECTION_MINIMUM_ALBUMS
		? 0
		: Math.round((1 + 0.25 * Math.log2(albums / 2)) * 100) / 100;
}

/** What the collection is worth on the most modest shelf there is. */
export function basePoints(albums: number): number {
	return Math.round(albums * MINIMUM_ALBUM_POINTS * sizeFactor(albums));
}

/** What one copy makes its album worth. */
export function copyPoints(copy: Pick<OwnedCopy, 'media' | 'rarity'>): number {
	return MEDIA_POINTS[copy.media] * RARITY_FACTORS[copy.rarity];
}

/** The copies still on the shelf, by the album they are a pressing of. */
function copiesByAlbum(copies: readonly OwnedCopy[]): Map<string, OwnedCopy[]> {
	const byAlbum = new Map<string, OwnedCopy[]>();

	for (const copy of copies) {
		if (copy.disposedAt === null) {
			const held = byAlbum.get(copy.albumUid);

			if (held) {
				held.push(copy);
			} else {
				byAlbum.set(copy.albumUid, [copy]);
			}
		}
	}

	return byAlbum;
}

/** The copy worth the most, of all of them or of those on one medium. */
function bestCopy(
	copies: readonly OwnedCopy[],
	media?: UniformMedia
): OwnedCopy | null {
	let best: OwnedCopy | null = null;

	for (const copy of copies) {
		if (
			(media === undefined || copy.media === media) &&
			(best === null || copyPoints(copy) > copyPoints(best))
		) {
			best = copy;
		}
	}

	return best;
}

/** One way of counting the shelf: which copy stands for each album. */
interface Candidate {
	albums: AlbumScore[];
	albumPoints: number;
	formatFactor: number;
	uniformMedia: UniformMedia | null;
	totalPoints: number;
}

function toCandidate(
	members: readonly MusicCollectionMembership[],
	byAlbum: Map<string, OwnedCopy[]>,
	size: number,
	media: UniformMedia | null
): Candidate {
	const albums = members.map((album): AlbumScore => {
		const held = byAlbum.get(album.albumUid) ?? [];
		const copy = bestCopy(held, media ?? undefined);

		return {
			albumUid: album.albumUid,
			albumName: album.albumName,
			media: copy?.media ?? null,
			rarity: copy?.rarity ?? null,
			points: copy ? copyPoints(copy) : MINIMUM_ALBUM_POINTS,
			copies: held.length,
		};
	});
	const albumPoints = albums.reduce((sum, album) => sum + album.points, 0);
	const formatFactor = media ? FORMAT_FACTORS[media] : 1;

	return {
		albums,
		albumPoints,
		formatFactor,
		uniformMedia: media,
		totalPoints: Math.round(albumPoints * size * formatFactor),
	};
}

/**
 * A set of a piece that is within reach on this medium: the least it would
 * come to, with the albums not yet on it counted as common copies of it.
 */
function toOpportunity(
	members: readonly MusicCollectionMembership[],
	byAlbum: Map<string, OwnedCopy[]>,
	size: number,
	media: UniformMedia
): FormatOpportunity {
	const missingAlbumUids: string[] = [];
	let points = 0;

	for (const album of members) {
		const copy = bestCopy(byAlbum.get(album.albumUid) ?? [], media);

		if (copy) {
			points += copyPoints(copy);
		} else {
			points += MEDIA_POINTS[media];
			missingAlbumUids.push(album.albumUid);
		}
	}

	return {
		media,
		missingAlbumUids,
		minimumPoints: Math.round(points * size * FORMAT_FACTORS[media]),
	};
}

/**
 * What this collection is worth to this collector, as both stand now.
 *
 * Where several copies of an album are owned, the counting is whichever
 * hands the collection the most: the best copy of every album, or — where
 * every album is there on one medium — the copies on that medium, with the
 * multiplier a set of a piece earns. A rare CD can therefore lose its place
 * to a common vinyl, when the vinyl is what makes the set whole.
 */
export function scoreCollection(
	resolved: ResolvedMusicCollection,
	copies: readonly OwnedCopy[]
): MusicCollectionScore {
	const total = resolved.albums.length;

	// Fewer than a collection needs: at rest, and worth nothing to anyone.
	if (total < MUSIC_COLLECTION_MINIMUM_ALBUMS) {
		return {
			collectionUid: resolved.collectionUid,
			basePoints: 0,
			albumPoints: 0,
			sizeFactor: 0,
			formatFactor: 1,
			uniformMedia: null,
			totalPoints: 0,
			earnedPoints: 0,
			suspended: true,
			albums: [],
			opportunities: [],
		};
	}

	const size = sizeFactor(total);
	const byAlbum = copiesByAlbum(copies);
	const completed = resolved.albums.every((album) =>
		byAlbum.has(album.albumUid)
	);
	let chosen = toCandidate(resolved.albums, byAlbum, size, null);
	const opportunities: FormatOpportunity[] = [];

	for (const media of UNIFORM_MEDIA) {
		const onMedia = resolved.albums.filter((album) =>
			bestCopy(byAlbum.get(album.albumUid) ?? [], media)
		).length;

		if (onMedia === total) {
			const uniform = toCandidate(resolved.albums, byAlbum, size, media);

			// A tie goes to the set of a piece, and among those to the medium
			// tried first — which is the order they are rewarded in.
			if (
				uniform.totalPoints > chosen.totalPoints ||
				(uniform.totalPoints === chosen.totalPoints &&
					chosen.uniformMedia === null)
			) {
				chosen = uniform;
			}
		} else if (onMedia * 2 >= total) {
			opportunities.push(
				toOpportunity(resolved.albums, byAlbum, size, media)
			);
		}
	}

	return {
		collectionUid: resolved.collectionUid,
		basePoints: basePoints(total),
		albumPoints: chosen.albumPoints,
		sizeFactor: size,
		formatFactor: chosen.formatFactor,
		uniformMedia: chosen.uniformMedia,
		totalPoints: chosen.totalPoints,
		// Complete or nothing: this is what makes it a collection.
		earnedPoints: completed ? chosen.totalPoints : 0,
		suspended: false,
		albums: chosen.albums,
		// Only what would actually be worth more than the shelf is now.
		opportunities: opportunities
			.filter(
				(opportunity) => opportunity.minimumPoints > chosen.totalPoints
			)
			.sort((a, b) => b.minimumPoints - a.minimumPoints),
	};
}
