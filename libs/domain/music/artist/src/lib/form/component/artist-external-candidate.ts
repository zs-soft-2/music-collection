import {
	ArtistExternalCandidate,
	ArtistExternalIds,
	ExternalSource,
} from '@music-collection/api';

/** One artist of the searched name, as the chooser lists it. */
export interface ArtistExternalCandidateRow extends ArtistExternalIds {
	/** Type, country, year and styles on one line, as far as they are known. */
	details: string;
	name: string;
	/** The source's own note telling this one from its namesakes. */
	note: string | null;
	/** Which source found it; the row says so where it is not MusicBrainz. */
	source: ExternalSource;
	sourceUrl: string;
	/** Picture of the hit, where the source has one (Discogs). */
	thumbUrl: string | null;
}

/**
 * A namesake as the chooser lists it: what the source knows of it on one
 * line, so the admin recognises theirs without opening the source page.
 *
 * A Discogs hit has none of those details — no type, country, year or styles —
 * so its line stays empty and the picture and the name are what the admin has
 * to go by.
 */
export function toCandidateRow(
	candidate: ArtistExternalCandidate
): ArtistExternalCandidateRow {
	const details = [
		candidate.type,
		candidate.country,
		candidate.formedIn ? String(candidate.formedIn.getFullYear()) : null,
		candidate.styles.join(', ') || null,
	]
		.filter((part): part is string => !!part)
		.join(' · ');

	return {
		details,
		discogsArtistId: candidate.discogsArtistId,
		musicBrainzId: candidate.musicBrainzId,
		name: candidate.name,
		note: candidate.note,
		source: candidate.source,
		sourceUrl: candidate.sourceUrl,
		thumbUrl: candidate.thumbUrl,
	};
}
