import { Entity } from '../../../common';

/**
 * A place a concert is held in — a club, a hall, a stadium, a festival
 * ground.
 *
 * The venues are loaded from the MusicBrainz `place` entity, which is the one
 * part of this feature where MusicBrainz is genuinely rich: a few hundred
 * Hungarian places with an address, a type and coordinates. A venue is
 * therefore anchored on an mbid wherever one exists, and only the ones a
 * concert brought in with it are kept without one.
 *
 * The document id is the MusicBrainz id when there is one, otherwise a slug of
 * the name and the city. Either way it is stable: what points at a venue keeps
 * pointing at it when the name is corrected.
 */
export interface Venue {
	/** As the place is known locally: `Budapest Park`, `A38`. */
	name: string;
	/** The MusicBrainz place id; null for a venue no source could anchor. */
	musicBrainzId: string | null;
	/** The settlement, as the source area names it: `Budapest`, `Szeged`. */
	city: string | null;
	/**
	 * ISO 3166-1 alpha-2, upper case. Any country: the loads take one, and the
	 * admin picks it. Nothing in the data was ever Hungarian — only the pages
	 * were written as if it had been — so widening was a load, not a migration.
	 */
	countryCode: string;
	/** The street address when the source gives one. */
	address: string | null;
	coordinates: VenueCoordinates | null;
	/** `Venue`, `Stadium`, `Club`, `Amphitheatre`… as MusicBrainz types it. */
	type: string | null;
	/** Set once the place has closed; a past concert still points at it. */
	closedAt: string | null;
	/**
	 * Whether the venue is offered when a concert is filed. A place that has
	 * closed is retired rather than deleted: the concerts already held there
	 * would be left pointing at nothing.
	 */
	active: boolean;
	/** Where the venue came from, so an admin knows what to trust. */
	source: VenueSource;
	/** Lower-cased words of the name, for the admin's venue search. */
	searchParameters?: string[];
}

export interface VenueCoordinates {
	latitude: number;
	longitude: number;
}

export type VenueSource = 'musicbrainz' | 'ai' | 'manual';

export type VenueEntity = Venue & Entity;

/** What the venue form holds; the id is derived from the name and the city. */
export interface VenueDraft {
	name: string;
	city: string | null;
	countryCode: string;
	address: string | null;
	coordinates: VenueCoordinates | null;
	type: string | null;
	active: boolean;
}

/** The place page on MusicBrainz, where a loaded venue can be checked. */
export const MUSICBRAINZ_PLACE_URL = 'https://musicbrainz.org/place';

/**
 * The id of a venue that has no mbid: the name and the city, lower case and
 * dash-joined. The same venue loaded twice has to land on one document, and
 * the only thing two sources agree on is what the place is called and where.
 */
export function toVenueSlug(name: string, city: string | null): string {
	const slug = [name, city]
		.filter((part): part is string => !!part?.trim())
		.join(' ')
		.toLowerCase()
		.normalize('NFD')
		// The accents are dropped rather than transliterated: `Müpa` and
		// `Mupa` are the same hall, whichever way a source spelled it.
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return slug || 'venue';
}

/**
 * A venue a model proposed, waiting for someone to look at it.
 *
 * The same shape as a concert suggestion, and for the same reason: a search a
 * model ran can name a hall that closed years ago, or one that never existed.
 * What a collector's concert page points at has therefore either a MusicBrainz
 * id or a human behind it.
 *
 * A rejected proposal is kept rather than deleted — the next run over the same
 * country would otherwise propose the same wrong hall again.
 */
export interface VenueSuggestion extends Venue {
	reviewState: VenueReviewState;
	/** Epoch milliseconds of the run that proposed it. */
	suggestedAt: number;
	/** Epoch milliseconds of the decision; null while pending. */
	reviewedAt: number | null;
	reviewedBy: string | null;
	/**
	 * What the model reported of its own certainty, 0 to 1. Advisory only — it
	 * orders the list, it does not decide anything.
	 */
	confidence: number | null;
	/** The model's one line on what the place is, for the admin reading it. */
	note: string | null;
	/** The model that proposed it, so a bad run can be traced. */
	model: string | null;
	/**
	 * The grounding citation the claim rests on. This is what an admin opens
	 * before approving, so a proposal without one is worth less.
	 */
	sourceUrl: string | null;
}

export type VenueSuggestionEntity = VenueSuggestion & Entity;

export type VenueReviewState = 'pending' | 'rejected';

/**
 * What keeps a venue alive: how many concerts are filed at it.
 *
 * Counted on the server rather than over the cached concerts, because this is
 * what a delete turns on — and a count the client worked out from what it
 * happens to hold would be a guess. The number itself is what the dialogue
 * says, which is why it is a count and not a yes-or-no.
 */
export interface VenueUsage {
	/**
	 * How many concerts are filed there, or null when the question could not
	 * be answered — no network, a missing rule, a server that did not reply.
	 *
	 * Null is not zero, and it is not "in use" either: it means the client
	 * does not know. A dialogue that treated it as a reason to refuse would
	 * leave a disabled button and no explanation, which is exactly how this
	 * went wrong once. The delete is offered, the sentence says the count is
	 * missing, and the server has the last word — as it does anyway.
	 */
	concerts: number | null;
}

/**
 * Whether anything points at the venue, so the client should not even try.
 *
 * An unknown count is not a block: the server re-checks before it writes, and
 * the rules refuse what it must. Better a refused attempt with a sentence than
 * a button that cannot be pressed.
 */
export function isVenueInUse(usage: VenueUsage): boolean {
	return (usage.concerts ?? 0) > 0;
}
