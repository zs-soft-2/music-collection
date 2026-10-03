import { Entity } from '../../../common';

/**
 * One night: an artist the catalog already holds, playing at a venue on a
 * day.
 *
 * Only the catalog's own artists are filed. A concert page that listed
 * everything playing in the country would be a programme guide; this one
 * answers a collector's question — when do I get to see a band whose records
 * are on my shelf. That is also what keeps the loads affordable: the number of
 * requests follows the size of the catalog, not the size of the country.
 *
 * Two sources write a concert, and they are not equally trustworthy.
 * MusicBrainz is anchored on an mbid and lands in `concert` straight away; an
 * AI suggestion lands in `concert-suggestion` and waits for an admin. What a
 * collector sees has therefore either an mbid or a human behind it.
 */
export interface Concert {
	/** The catalog artist. Never null: an unmatched concert is not filed. */
	artistUid: string;
	/** The artist as the source credits it; may differ from the catalog's. */
	artistName: string;
	/** Catalog artist photo, so a row has an image without a poster. */
	artistImageUrl: string | null;
	musicBrainzArtistIds: string[];
	/** The venue document; null while a concert only names its place. */
	venueUid: string | null;
	/** The venue as the source named it — kept even when `venueUid` is set. */
	venueName: string;
	city: string | null;
	/** ISO 3166-1 alpha-2, upper case. */
	countryCode: string;
	/** The day it is played, `YYYY-MM-DD`. Partial dates are never stored. */
	startsAt: string;
	/** Local start time, `HH:mm`; null when the source does not say. */
	startsAtTime: string | null;
	/** Last day of a run — a festival. Null for a single night. */
	endsAt: string | null;
	/** What the night is called: a tour name, a festival, or artist + venue. */
	title: string;
	eventType: ConcertEventType;
	/** Called off, but kept: a collector who had a ticket still looks. */
	cancelled: boolean;
	source: ConcertSource;
	/** How the concert found its catalog artist. */
	matchedBy: ConcertMatch;
	/** The MusicBrainz event id; null for a suggestion or a filed concert. */
	musicBrainzEventId: string | null;
	/** Where to buy, when a source gives it. */
	ticketUrl: string | null;
	/**
	 * What the claim rests on: the grounding citation for an AI suggestion, the
	 * venue's own page for a hand-filed one. This is what an admin opens before
	 * approving, so a suggestion without one is worth less.
	 */
	sourceUrl: string | null;
	/** The other artists on the bill, as names only. */
	supportingActs?: string[];
	/**
	 * The whole bill, in the order the programme lists it, matched to the
	 * catalog where a name matched one.
	 *
	 * Written once, when the concert is filed, and not worked out again on
	 * every read: the match needs the catalog's artists, which the page does
	 * not hold — it reads concerts, not bands. Absent on a concert filed
	 * before the field existed; `toConcertLineup` stands in for those.
	 */
	lineup?: ConcertAct[];
	/** Lower-cased words of artist, venue and city, for the admin's search. */
	searchParameters?: string[];
	/**
	 * Who let an AI suggestion through, and when. Absent on a concert that came
	 * anchored on an mbid — there was nothing to approve.
	 */
	approvedBy?: string | null;
	approvedAt?: number | null;
}

/**
 * One act on the bill.
 *
 * `artistUid` is set only for a name that matched the catalog exactly — a
 * guessed match would put a stranger's band on a collector's page, and the
 * page links the name, so a wrong link is worse than no link.
 */
export interface ConcertAct {
	name: string;
	/** The catalog artist, or null for a band the catalog does not hold. */
	artistUid: string | null;
	/** The catalog artist's photo; only ever set together with `artistUid`. */
	imageUrl: string | null;
}

/** A single night, a festival run, or something the source would not say. */
export type ConcertEventType = 'concert' | 'festival' | 'other';

/**
 * A catalog artist an act row offers while a name is being typed.
 *
 * The photo comes with it so that picking a band fills the act's picture in
 * the same move: the public page shows it, and nothing later would go and
 * fetch it.
 */
export interface ConcertArtistMatch {
	uid: string;
	name: string;
	imageUrl: string | null;
}

/**
 * How many characters an act row waits for before it asks the catalog.
 *
 * Three, because the search is a prefix search on the whole name: one or two
 * characters would read a good part of the catalog for an answer nobody could
 * use.
 */
export const ACT_SEARCH_LENGTH = 3;

/** How many artists an act row offers at once. A bill is picked, not browsed. */
export const ACT_MATCH_LIMIT = 8;

export type ConcertSource = 'musicbrainz' | 'ai' | 'manual';

/**
 * How a concert was tied to a catalog artist. A name match can be a namesake,
 * and both the admin list and the public row say so.
 */
export type ConcertMatch = 'musicBrainzId' | 'name' | 'manual';

export type ConcertEntity = Concert & Entity;

/** What the concert form holds. The artist and the venue are picked, not typed. */
export interface ConcertDraft {
	artistUid: string;
	artistName: string;
	venueUid: string | null;
	venueName: string;
	city: string | null;
	countryCode: string;
	startsAt: string;
	startsAtTime: string | null;
	endsAt: string | null;
	title: string;
	eventType: ConcertEventType;
	cancelled: boolean;
	ticketUrl: string | null;
	sourceUrl: string | null;
	/**
	 * The bill under the credited artist, each act carrying the catalog link
	 * the form gave it.
	 *
	 * Acts rather than names, and that is the point of the form: a typed-in
	 * name used to wait for a later load to tie it to a band, and a band no
	 * load ever matches — one the catalog spells differently, or holds under
	 * another name — waited for good. The row searches the catalog itself, and
	 * what it picks is written into the document as a link.
	 */
	acts: ConcertAct[];
}

/**
 * A concert an AI proposed, waiting for someone to look at it.
 *
 * A rejected suggestion is kept rather than deleted, and that is the whole
 * point of the collection: the next load would otherwise propose the same
 * wrong night again, and an admin would decide it again every week.
 */
export interface ConcertSuggestion extends Concert {
	reviewState: ConcertReviewState;
	/** Epoch milliseconds of the load that proposed it. */
	suggestedAt: number;
	/** Epoch milliseconds of the decision; null while pending. */
	reviewedAt: number | null;
	/** Who decided; null while pending. */
	reviewedBy: string | null;
	/**
	 * What the model reported of its own certainty, 0 to 1. Advisory only — it
	 * orders the list, it does not decide anything.
	 */
	confidence: number | null;
	/** The model's one-line case for the night, for the admin reading it. */
	note: string | null;
	/** The model that proposed it, so a bad run can be traced. */
	model: string | null;
}

export type ConcertSuggestionEntity = ConcertSuggestion & Entity;

export type ConcertReviewState = 'pending' | 'rejected';

/** The event page on MusicBrainz, where a loaded concert can be checked. */
export const MUSICBRAINZ_EVENT_URL = 'https://musicbrainz.org/event';

/**
 * The document id of a concert: the artist, the day and the venue, slugged.
 *
 * Deterministic on purpose. Both loads run again and again — the scheduled one
 * daily, the admin's whenever they press the button — and a random id would
 * file the same night twice. This is also what lets a suggestion be matched to
 * a concert already filed from MusicBrainz, and a rejection to the suggestion
 * that would come back.
 */
export function toConcertId(
	artistUid: string,
	startsAt: string,
	venueName: string
): string {
	const place = venueName
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return `${artistUid}_${startsAt}_${place || 'venue'}`;
}

/**
 * The bill of a concert: what was filed with it, or — for one filed before the
 * field existed — the names it does hold, the credited artist first.
 *
 * Only the credited artist carries a uid here. The supporting acts are names
 * the source wrote, and nothing on this side of the app knows the catalog well
 * enough to tie them to a band; the suggestion run does, and the backfill
 * script does.
 */
export function toConcertLineup(
	concert: Pick<
		Concert,
		'artistUid' | 'artistName' | 'artistImageUrl' | 'supportingActs'
	> &
		Partial<Pick<Concert, 'lineup'>>
): ConcertAct[] {
	if (concert.lineup?.length) return concert.lineup;

	const acts: ConcertAct[] = [
		{
			artistUid: concert.artistUid,
			imageUrl: concert.artistImageUrl,
			name: concert.artistName,
		},
	];
	const seen = new Set([concert.artistName.trim().toLowerCase()]);

	for (const act of concert.supportingActs ?? []) {
		const name = act.trim();
		const key = name.toLowerCase();

		if (!name || seen.has(key)) continue;

		seen.add(key);
		acts.push({ artistUid: null, imageUrl: null, name });
	}

	return acts;
}

/**
 * The acts a form opens with: the filed bill without the credited artist, who
 * has a row of his own and cannot be changed.
 *
 * Copied rather than handed over, because the form writes into them — and the
 * links they already carry are kept: those were matched where the catalog's
 * artists are, and an edit that dropped them would unlink a bill nobody
 * touched.
 */
export function toDraftActs(
	concert: Pick<
		Concert,
		'artistUid' | 'artistName' | 'artistImageUrl' | 'supportingActs'
	> &
		Partial<Pick<Concert, 'lineup'>>
): ConcertAct[] {
	return toConcertLineup(concert)
		.slice(1)
		.map((act) => ({ ...act }));
}

/**
 * What a saved draft writes of its bill: the whole line-up with the credited
 * artist at its head, and the supporting names beside it.
 *
 * Both fields, because they answer different readers. `lineup` is what the
 * page draws — names with their links — and `supportingActs` is the plain list
 * the loads compare against, so a night already filed is recognised rather
 * than proposed again.
 */
export function toConcertBill(
	draft: Pick<ConcertDraft, 'artistUid' | 'artistName' | 'acts'>,
	artistImageUrl: string | null
): { lineup: ConcertAct[]; supportingActs: string[] } {
	const lineup: ConcertAct[] = [
		{
			artistUid: draft.artistUid,
			imageUrl: artistImageUrl,
			name: draft.artistName,
		},
	];
	const seen = new Set([draft.artistName.trim().toLowerCase()]);

	for (const act of draft.acts) {
		const name = act.name.trim();
		const key = name.toLowerCase();

		if (!name || seen.has(key)) continue;

		seen.add(key);
		lineup.push({ ...act, name });
	}

	return { lineup, supportingActs: lineup.slice(1).map((act) => act.name) };
}

/** Whether the concert is still to come on the given day (`YYYY-MM-DD`). */
export function isComingConcert(concert: Concert, from: string): boolean {
	return (concert.endsAt ?? concert.startsAt) >= from;
}
