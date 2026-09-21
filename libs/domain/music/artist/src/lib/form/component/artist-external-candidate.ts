import { ArtistExternalCandidate } from '@music-collection/api';

/** One artist of the searched name, as the chooser lists it. */
export interface ArtistExternalCandidateRow {
	/** Type, country, year and styles on one line, as far as they are known. */
	details: string;
	musicBrainzId: string;
	name: string;
	/** The source's own note telling this one from its namesakes. */
	note: string | null;
	sourceUrl: string;
}

/**
 * A namesake as the chooser lists it: what the source knows of it on one
 * line, so the admin recognises theirs without opening the source page.
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
		musicBrainzId: candidate.musicBrainzId,
		name: candidate.name,
		note: candidate.note,
		sourceUrl: candidate.sourceUrl,
	};
}
