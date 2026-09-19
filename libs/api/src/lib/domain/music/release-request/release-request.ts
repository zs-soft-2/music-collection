/**
 * A collector's request to add a release (pressing) to the catalog: one that
 * is on Discogs (`discogsReleaseId`) or described in free text (`note`).
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
	uid: string;
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
}

export type ReleaseRequestAdd = Omit<ReleaseRequest, 'uid' | 'updatedAt'>;
