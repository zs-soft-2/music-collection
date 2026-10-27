import { ReleaseEntity } from '@music-collection/api';

import { MediaFormat, toMediaFormat } from '../music-ui';

/**
 * A pressing as the view pages list it: one line that says what the record
 * is, who made it and what it was pressed on. The label page, the pressing
 * page and a wish all show the same line, so they read alike.
 */
export interface PressingRow {
	uid: string;
	name: string;
	albumUid: string | null;
	albumName: string | null;
	artistUid: string | null;
	artistName: string | null;
	coverUrl: string | null;
	year: number | null;
	format: MediaFormat;
	formatDescription: string | null;
	labelUid: string | null;
	labelName: string | null;
	country: string | null;
	/** The album on a medium, not a pressing: no label, country or year. */
	generic: boolean;
}

/** The year a pressing came out, as far as its date says. */
export function pressingYear(release: ReleaseEntity): number | null {
	const date = release.date ? new Date(release.date) : null;

	return date && !Number.isNaN(date.getTime()) ? date.getFullYear() : null;
}

export function toPressingRow(release: ReleaseEntity): PressingRow {
	const album = release.album ?? null;

	return {
		uid: release.uid,
		name: release.name || album?.name || 'Untitled pressing',
		albumUid: album?.uid ?? null,
		albumName: album?.name ?? null,
		artistUid: release.artist?.uid ?? null,
		artistName: release.artist?.name ?? null,
		coverUrl: album?.coverImage?.filePath || album?.coverImageUrl || null,
		year: pressingYear(release),
		format: toMediaFormat(release.media),
		formatDescription: release.formatDescription ?? null,
		labelUid: release.label?.uid ?? null,
		labelName: release.label?.name ?? null,
		country: release.country ?? null,
		generic: !!release.generic,
	};
}

/** The newest pressing first; the undated ones last. */
export function newestPressingFirst(rows: PressingRow[]): PressingRow[] {
	return [...rows].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
}
