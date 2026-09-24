/**
 * What the photo found, matched against the catalog.
 *
 * The server only says which Discogs pressing the photo shows; whether the
 * catalog already holds it is decided here, where the whole catalog is
 * loaded anyway. Every candidate ends up in one of four states, and each
 * state has exactly one next step for the collector.
 */

import {
	AlbumEntity,
	CollectionItemEntity,
	ReleaseEntity,
	ReleaseRequestAdd,
	ScanCandidate,
	ScanMatch,
} from '@music-collection/api';
import {
	isSameCatalogName,
	isSameCatalogNumber,
} from '@music-collection/common/engine';

/**
 * - `in-collection`: the collector already owns a copy of this pressing.
 * - `in-catalog`: the pressing is in the catalog — one tap adds a copy.
 * - `new-release`: the album is known, this pressing is not: a release request.
 * - `new-album`: the album itself is missing; approving creates it too.
 */
export type ScanState =
	'in-collection' | 'in-catalog' | 'new-release' | 'new-album';

export interface ScanCandidateView {
	/** Stable list key; a Discogs id is unique per type. */
	key: string;
	albumName: string;
	artistName: string | null;
	/** e.g. "Vinyl, LP · Roadrunner Records (RR 9862) · Netherlands · 1983". */
	summary: string;
	thumbUrl: string | null;
	match: ScanMatch;
	state: ScanState;
	discogsReleaseId: number | null;
	discogsMasterId: number | null;
	/** The catalog album, when it is already there. */
	albumUid: string | null;
	artistUid: string | null;
	/** The catalog release, when the pressing is already imported. */
	releaseUid: string | null;
}

type CatalogRelease = ReleaseEntity;
/** The Discogs summary the import writes on the album document. */
type CatalogAlbum = AlbumEntity;

export { MATCH_LABELS } from '@music-collection/ui/music-view';

export const STATE_LABELS: Record<ScanState, string> = {
	'in-collection': 'Already in your collection',
	'in-catalog': 'In the catalog',
	'new-release': 'New pressing',
	'new-album': 'New album',
};

/** "Vinyl, LP · Roadrunner Records (RR 9862) · Netherlands · 1983". */
export function candidateSummary(candidate: ScanCandidate): string {
	const label = [candidate.label, candidate.catno && `(${candidate.catno})`]
		.filter(Boolean)
		.join(' ');

	return [
		candidate.formats.join(', ') || null,
		label || null,
		candidate.country,
		candidate.year?.toString() ?? null,
	]
		.filter(Boolean)
		.join(' · ');
}

/**
 * The catalog release of the pressing, when it was already imported: by the
 * Discogs id it was imported under, then by the catalog number printed on it
 * — that is all a photographed spine gives us, and it identifies a pressing
 * as well as the id does.
 */
function findRelease(
	releases: CatalogRelease[],
	candidate: ScanCandidate
): CatalogRelease | null {
	const byDiscogs = candidate.discogsReleaseId
		? releases.find(
				(release) =>
					release.discogsReleaseId === candidate.discogsReleaseId
			)
		: undefined;

	if (byDiscogs) return byDiscogs;

	if (!candidate.catno) return null;

	return (
		releases.find((release) =>
			isSameCatalogNumber(release.catno, candidate.catno)
		) ?? null
	);
}

/**
 * The catalog album: by the Discogs master the import wrote on it, then by
 * artist and title — an album typed in by hand has no Discogs id.
 */
function findAlbum(
	albums: CatalogAlbum[],
	candidate: ScanCandidate
): CatalogAlbum | null {
	const byMaster = candidate.discogsMasterId
		? albums.find(
				(album) => album.discogs?.masterId === candidate.discogsMasterId
			)
		: undefined;

	if (byMaster) return byMaster;

	const byRelease = candidate.discogsReleaseId
		? albums.find(
				(album) =>
					album.discogs?.releaseId === candidate.discogsReleaseId
			)
		: undefined;

	if (byRelease) return byRelease;

	if (!candidate.albumName || !candidate.artistName) return null;

	return (
		albums.find(
			(album) =>
				isSameCatalogName(album.name, candidate.albumName ?? '') &&
				isSameCatalogName(
					album.artist?.name ?? '',
					candidate.artistName ?? ''
				)
		) ?? null
	);
}

export function toCandidateView(
	candidate: ScanCandidate,
	catalog: {
		albums: CatalogAlbum[];
		releases: CatalogRelease[];
		ownedItems: CollectionItemEntity[];
	}
): ScanCandidateView {
	const release = findRelease(catalog.releases, candidate);
	const album = release
		? ((release.album as CatalogAlbum | undefined) ??
			findAlbum(catalog.albums, candidate))
		: findAlbum(catalog.albums, candidate);
	const owned =
		!!release &&
		catalog.ownedItems.some((item) => item.release?.uid === release.uid);

	return {
		key: `${candidate.discogsReleaseId ?? 'm'}-${candidate.discogsMasterId ?? 'r'}`,
		albumName: candidate.albumName ?? candidate.title,
		artistName: candidate.artistName,
		summary: candidateSummary(candidate),
		thumbUrl: candidate.thumbUrl,
		match: candidate.match,
		state: owned
			? 'in-collection'
			: release
				? 'in-catalog'
				: album
					? 'new-release'
					: 'new-album',
		discogsReleaseId: candidate.discogsReleaseId,
		discogsMasterId: candidate.discogsMasterId,
		albumUid: album?.uid ?? null,
		artistUid: album?.artist?.uid ?? null,
		releaseUid: release?.uid ?? null,
	};
}

export function toCandidateViews(
	candidates: ScanCandidate[],
	catalog: {
		albums: CatalogAlbum[];
		releases: CatalogRelease[];
		ownedItems: CollectionItemEntity[];
	}
): ScanCandidateView[] {
	return candidates.map((candidate) => toCandidateView(candidate, catalog));
}

/** What the collector asks the admin for, taken from the candidate. */
export function toScanRequest(
	candidate: ScanCandidate,
	userId: string
): ReleaseRequestAdd {
	return {
		userId,
		album: {
			uid: null,
			name: candidate.albumName ?? candidate.title,
			artistUid: null,
			artistName: candidate.artistName,
		},
		status: 'pending',
		discogsMasterId: candidate.discogsMasterId,
		discogsReleaseId: candidate.discogsReleaseId,
		pressing: {
			format: candidate.formats.join(', ') || null,
			label: candidate.label,
			catno: candidate.catno,
			country: candidate.country,
			year: candidate.year,
		},
		note: null,
		createdAt: Date.now(),
	};
}
