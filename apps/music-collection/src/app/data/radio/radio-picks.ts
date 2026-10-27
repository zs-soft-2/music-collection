/**
 * Choosing what the radio puts on. Kept apart from the effect that reads the
 * catalog and the shelf, so the choosing itself can be tested: a station is
 * only as good as the records it reaches for.
 */

/** An album as the radio weighs it. */
export interface RadioAlbum {
	uid: string;
	styles: string[];
	/** When the catalog last had it, epoch milliseconds. */
	addedAt: number;
	/** Whose record it is; null on a catalog entry with no artist. */
	artistUid: string | null;
}

/** A shuffle that can be told what randomness to use. */
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
	const shuffled = [...items];

	for (let at = shuffled.length - 1; at > 0; at--) {
		const swap = Math.floor(random() * (at + 1));

		[shuffled[at], shuffled[swap]] = [shuffled[swap], shuffled[at]];
	}

	return shuffled;
}

/**
 * What the collector listens to, read off their shelf: the styles they own
 * most, each with a weight that falls away down the list. A style owned once
 * is a curiosity, not a taste, so only the first few count.
 */
export function styleWeights(
	owned: readonly { styles: string[] }[],
	limit: number
): Map<string, number> {
	const counts = new Map<string, number>();

	for (const item of owned) {
		for (const style of item.styles) {
			counts.set(style, (counts.get(style) ?? 0) + 1);
		}
	}

	return new Map(
		[...counts.entries()]
			.sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
			.slice(0, limit)
			.map(([style, count]) => [style, count])
	);
}

/**
 * Records that answer to the collector's taste: the ones sharing the most of
 * their styles, then shuffled, so the same taste does not give the same hour
 * of music twice. A wider pool than the station is long — otherwise the
 * strongest style would crowd out the rest.
 */
export function byTaste(
	albums: readonly RadioAlbum[],
	weights: Map<string, number>,
	limit: number,
	random = Math.random
): string[] {
	const scored = albums
		.map((album) => ({
			uid: album.uid,
			score: album.styles.reduce(
				(sum, style) => sum + (weights.get(style) ?? 0),
				0
			),
		}))
		.filter((album) => album.score > 0)
		.sort((a, b) => b.score - a.score);

	return shuffle(scored.slice(0, limit * 3), random)
		.slice(0, limit)
		.map((album) => album.uid);
}

/**
 * One artist's records, shuffled — what the band of the week brings to their
 * own station. Shuffled rather than in order of release: a week that always
 * opened with the debut would be the same week every time.
 */
export function byArtist(
	albums: readonly RadioAlbum[],
	artistUid: string,
	limit: number,
	random = Math.random
): string[] {
	return shuffle(
		albums.filter((album) => album.artistUid === artistUid),
		random
	)
		.slice(0, limit)
		.map((album) => album.uid);
}

/** The records the catalog got most recently. */
export function newest(albums: readonly RadioAlbum[], limit: number): string[] {
	return [...albums]
		.sort((a, b) => b.addedAt - a.addedAt)
		.slice(0, limit)
		.map((album) => album.uid);
}

/** The same record filed twice is one record on the radio. */
export function distinct(uids: readonly string[]): string[] {
	return [...new Set(uids)];
}

/** A copy of the collector's, as the shelf station reaches for it. */
export interface ShelfCopy {
	albumUid: string;
	/** Where it was filed by hand; null while the shelf files it. */
	placement: {
		unitId: string;
		row: number;
		column: number;
		position: number;
	} | null;
	/** When it joined the collection, epoch milliseconds. */
	addedAt: number;
}

/** Which part of the shelving a station reaches into. */
export interface ShelfReach {
	/** The drawn unit; null reaches the whole collection. */
	unitId?: string | null;
	/** One compartment of the unit; null takes the whole unit. */
	row?: number | null;
	column?: number | null;
}

/**
 * The records standing in that part of the shelving, read out the way they
 * stand: unit by unit, compartment by compartment, left to right. A copy
 * nobody filed by hand has no place of its own, so it only answers to a
 * station that reaches for the whole collection.
 */
export function onShelf(
	copies: readonly ShelfCopy[],
	reach: ShelfReach
): string[] {
	const wanted = copies.filter((copy) => {
		if (!reach.unitId) {
			return true;
		}
		const { placement } = copy;

		return (
			!!placement &&
			placement.unitId === reach.unitId &&
			(reach.row == null || placement.row === reach.row) &&
			(reach.column == null || placement.column === reach.column)
		);
	});

	return distinct(
		[...wanted]
			.sort(
				(a, b) =>
					(a.placement?.row ?? Infinity) -
						(b.placement?.row ?? Infinity) ||
					(a.placement?.column ?? Infinity) -
						(b.placement?.column ?? Infinity) ||
					(a.placement?.position ?? Infinity) -
						(b.placement?.position ?? Infinity) ||
					a.addedAt - b.addedAt
			)
			.map((copy) => copy.albumUid)
	);
}

/**
 * Two runs of records woven into one: every `every`-th place goes to the
 * guest, the rest to the base.
 *
 * This is what makes the band of the week a presence on the radio rather
 * than the whole of it — one record of theirs, then three of everything
 * else. The same weave mixes the base itself: taste and the open catalog
 * every other place.
 *
 * A record is only put on once, however many of the runs reach for it, and
 * when the guest runs out the base carries on alone — a band with three
 * records to their name does not get to repeat them to fill the hour.
 */
export function weave(
	base: readonly string[],
	guest: readonly string[],
	every: number
): string[] {
	const woven: string[] = [];
	const seen = new Set<string>();
	let atBase = 0;
	let atGuest = 0;

	while (atBase < base.length || atGuest < guest.length) {
		const guestsTurn = (woven.length + 1) % every === 0;
		const next =
			(guestsTurn || atBase >= base.length) && atGuest < guest.length
				? guest[atGuest++]
				: base[atBase++];

		if (!seen.has(next)) {
			seen.add(next);
			woven.push(next);
		}
	}

	return woven;
}
