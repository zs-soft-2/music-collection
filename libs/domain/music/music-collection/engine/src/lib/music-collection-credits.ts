import {
	CreditsNeeded,
	MusicCollectionCriteria,
} from '@music-collection/domain/music-collection/api';

/**
 * What resolving these rules needs to know about who played on a record.
 *
 * The credits are the largest thing in the catalog — several per album,
 * against one album document — so fetching them is the one part of resolving
 * that can be expensive. Most collections never ask: a rule about a style or
 * a year is answered from the album alone. This decides, before anything is
 * fetched, which of three cases the rules are in.
 *
 * The narrow case is the valuable one. "Every album Gene Hoglan drummed on"
 * can only ever be satisfied by Hoglan's own credits, so the other tens of
 * thousands need not be downloaded — the answer is the same either way. A
 * rule that asks by role alone ("anything with a producer credit") has no
 * such handle, and only the whole set can answer it.
 */
export function creditsNeededFor(
	collections: readonly { criteria: MusicCollectionCriteria }[]
): CreditsNeeded {
	const musicianUids = new Set<string>();
	let asked = false;

	for (const { criteria } of collections) {
		const criterion = criteria.credits;

		if (!criterion) {
			continue;
		}

		// Asking about credits without naming a musician: the role, or the
		// bare presence of a credit, can be satisfied by anybody.
		if (!criterion.musicians) {
			return { kind: 'all' };
		}

		asked = true;

		for (const musicianUid of criterion.musicians) {
			musicianUids.add(musicianUid);
		}
	}

	// A rule naming an empty list of musicians matches nothing, and needs
	// nothing fetched to go on matching nothing.
	return asked
		? { kind: 'musicians', musicianUids: [...musicianUids].sort() }
		: { kind: 'none' };
}
