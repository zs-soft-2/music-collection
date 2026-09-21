import { FormatDescriptionEnum } from '@music-collection/common/api';
import {
	MusicCollectionMembership,
	MusicCollectionScore,
	OwnedCopy,
	ResolvedMusicCollection,
	ScoreHighlight,
} from '@music-collection/domain/music-collection/api';

/**
 * Scoring a collection.
 *
 * The base says what finishing it is worth. Left to the rule, that is the
 * size of the collection with a hand on the scale for the long ones: a
 * fortieth record is harder to find than a fourth, because by then only the
 * awkward ones are left.
 *
 * The bonus is what the shelf adds. Each album carries an equal share of the
 * base, and the best pressing the collector owns of it adds a fraction of
 * that share — so the same original pressing is worth more inside a prized
 * collection than inside a cheap one, which is what a collector would say
 * too.
 *
 * Nothing is earned until the collection is complete. That is the whole
 * point of a collection, and the reason the pages show what it *would* be
 * worth next to what it is worth now.
 */

/** A base point per album, before the size of the collection is weighed. */
const POINTS_PER_ALBUM = 10;
/** Every this many albums adds another 100% to the base. */
const SIZE_SCALE = 50;

/** What a pressing adds, as a fraction of its album's share of the base. */
const PRESSING_FACTORS: { edition: FormatDescriptionEnum; factor: number }[] = [
	{ edition: FormatDescriptionEnum.limitedEdition, factor: 0.3 },
	{ edition: FormatDescriptionEnum.pictureDisc, factor: 0.2 },
	{ edition: FormatDescriptionEnum.boxSet, factor: 0.2 },
	{ edition: FormatDescriptionEnum.g180, factor: 0.1 },
];
/** The pressing that came out with the record. */
const ORIGINAL_PRESSING_FACTOR = 0.25;
/** However special a copy is, one album cannot carry the whole collection. */
const MAX_PRESSING_FACTOR = 0.5;

/**
 * What the rule alone says the collection is worth. The curator may write a
 * base of their own; this is what stands in when they do not.
 */
export function derivedBasePoints(albumCount: number): number {
	return Math.round(
		POINTS_PER_ALBUM * albumCount * (1 + albumCount / SIZE_SCALE)
	);
}

/**
 * The pressing that came out with the record: same year as the album, and
 * not marked a reissue. Without a year on either side it cannot be claimed.
 */
function isOriginalPressing(
	copy: OwnedCopy,
	albumYear: number | null
): boolean {
	return (
		copy.releaseYear !== null &&
		albumYear !== null &&
		copy.releaseYear === albumYear &&
		!copy.editions.includes(FormatDescriptionEnum.reissue)
	);
}

/** What this copy adds, and what to call it. */
function weighCopy(
	copy: OwnedCopy,
	albumYear: number | null
): { factor: number; reasons: string[] } {
	const reasons: string[] = [];
	let factor = 0;

	if (isOriginalPressing(copy, albumYear)) {
		factor += ORIGINAL_PRESSING_FACTOR;
		reasons.push('original pressing');
	}

	for (const { edition, factor: added } of PRESSING_FACTORS) {
		if (copy.editions.includes(edition)) {
			factor += added;
			reasons.push(edition);
		}
	}

	return factor > MAX_PRESSING_FACTOR
		? { factor: MAX_PRESSING_FACTOR, reasons }
		: { factor, reasons };
}

/** The best copy the collector owns of this album; several may be owned. */
function bestCopy(
	copies: readonly OwnedCopy[],
	album: MusicCollectionMembership
): { factor: number; reasons: string[] } {
	let best = { factor: 0, reasons: [] as string[] };

	for (const copy of copies) {
		if (copy.disposedAt === null && copy.albumUid === album.albumUid) {
			const weighed = weighCopy(copy, album.year);

			if (weighed.factor > best.factor) {
				best = weighed;
			}
		}
	}

	return best;
}

/**
 * What this collection is worth to this collector, as both stand now.
 *
 * `basePoints` is the curator's number; null leaves it to the rule.
 */
export function scoreCollection(
	resolved: ResolvedMusicCollection,
	copies: readonly OwnedCopy[],
	basePoints: number | null,
	completed: boolean
): MusicCollectionScore {
	const derived = basePoints === null;
	const base = derived ? derivedBasePoints(resolved.total) : basePoints;
	// An album's share of the base; a collection of nothing shares nothing.
	const albumShare = resolved.total ? base / resolved.total : 0;
	const highlights: ScoreHighlight[] = [];
	let bonus = 0;

	for (const album of resolved.albums) {
		const { factor, reasons } = bestCopy(copies, album);

		if (factor > 0) {
			const points = albumShare * factor;

			bonus += points;
			highlights.push({
				albumUid: album.albumUid,
				albumName: album.albumName,
				reasons,
				points: Math.round(points),
			});
		}
	}

	const bonusPoints = Math.round(bonus);
	const totalPoints = base + bonusPoints;

	return {
		collectionUid: resolved.collectionUid,
		basePoints: base,
		bonusPoints,
		totalPoints,
		// Complete or nothing: this is what makes it a collection.
		earnedPoints: completed ? totalPoints : 0,
		derived,
		highlights: highlights.sort((a, b) => b.points - a.points),
	};
}
