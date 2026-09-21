/**
 * A collector's request to add a release (pressing) to the catalog: one that
 * is on Discogs (`discogsReleaseId`) or described in free text (`note`). The
 * album may be missing from the catalog too — see `ReleaseRequestAlbum`.
 * Document: `release-request/{uid}`. The collector creates it pending; an
 * admin approves (imports the release and adds the copy to the collector's
 * collection) or rejects it.
 */
export type ReleaseRequestStatus = 'pending' | 'approved' | 'rejected';

export const RELEASE_REQUEST_STATUSES: ReleaseRequestStatus[] = [
	'pending',
	'approved',
	'rejected',
];

export interface ReleaseRequestAlbum {
	/**
	 * `null` when the album is not in the catalog yet — a record identified
	 * from a photo. Approving such a request creates the album (and, if
	 * needed, the artist) from the Discogs release.
	 */
	uid: string | null;
	name: string;
	artistUid: string | null;
	artistName: string | null;
}

/** What the collector saw of the pressing when requesting it. */
export interface ReleaseRequestPressing {
	/** e.g. "Vinyl, LP, Album, Reissue". */
	format: string | null;
	label: string | null;
	catno: string | null;
	country: string | null;
	year: number | null;
}

export interface ReleaseRequest {
	uid: string;
	/** The requesting collector. */
	userId: string;
	album: ReleaseRequestAlbum;
	status: ReleaseRequestStatus;
	discogsMasterId: number | null;
	discogsReleaseId: number | null;
	pressing: ReleaseRequestPressing | null;
	/** The collector's description or remark. */
	note: string | null;
	/** Epoch milliseconds. */
	createdAt: number;
	/** Last write in epoch milliseconds (FirestoreSyncService). */
	updatedAt?: number;
	/** Set when decided: when (epoch ms) and by which admin. */
	decidedAt?: number;
	decidedBy?: string;
	/** Approved: the catalog release and the collector's new copy. */
	releaseUid?: string;
	collectionItemUid?: string;
	/** Rejected: the admin's reason, shown to the collector. */
	adminNote?: string | null;
}

export type ReleaseRequestAdd = Omit<
	ReleaseRequest,
	| 'uid'
	| 'updatedAt'
	| 'decidedAt'
	| 'decidedBy'
	| 'releaseUid'
	| 'collectionItemUid'
	| 'adminNote'
>;

/** Callable name of the approval (apps/functions). */
export const APPROVE_RELEASE_REQUEST_FUNCTION = 'approveReleaseRequest';

export interface ApproveReleaseRequestInput {
	requestId: string;
	/** A catalog release of the album; without it the Discogs release is imported. */
	releaseUid?: string | null;
}

export interface ApproveReleaseRequestResult {
	releaseUid: string;
	collectionItemUid: string;
	importedRelease: boolean;
	/** The album the release sits under, created when the request had none. */
	albumUid: string;
	importedAlbum: boolean;
	importedArtist: boolean;
}
