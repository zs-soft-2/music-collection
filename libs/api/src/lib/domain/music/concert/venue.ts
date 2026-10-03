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
	 * ISO 3166-1 alpha-2, upper case. `HU` for now — the pages are written for
	 * one country but nothing in the data is, so widening is a load, not a
	 * migration.
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
