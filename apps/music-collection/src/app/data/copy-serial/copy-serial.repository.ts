import { Injectable, inject } from '@angular/core';
import {
	DocumentReference,
	Firestore,
	doc,
	getDocFromServer,
} from '@angular/fire/firestore';
import {
	COPY_SERIAL_FEATURE_KEY,
	CopySerialClaim,
	FirestoreSyncService,
	toCopySerialClaimId,
} from '@music-collection/api';

/**
 * The registry of numbered copies: `copy-serial/{releaseId}_{number}`.
 *
 * Nothing here is listed or cached. A claim is a lock, and a lock read from
 * a cache is not a lock — every read goes to the server, and there are only
 * ever one or two of them, at the moment a collector types a number.
 */
@Injectable({ providedIn: 'root' })
export class CopySerialRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/** Who holds this number, or null while it is free. */
	public async holder(
		releaseId: string,
		number: number
	): Promise<CopySerialClaim | null> {
		const snapshot = await getDocFromServer(
			this.reference(releaseId, number)
		);

		return snapshot.exists() ? (snapshot.data() as CopySerialClaim) : null;
	}

	/**
	 * Takes the number. Rejects where it is already held: the rules allow the
	 * create that finds nothing and refuse the update that finds something,
	 * so the race is decided by Firestore rather than by reading first.
	 */
	public claim(claim: CopySerialClaim): Promise<void> {
		return this.firestoreSync.set(
			this.reference(claim.releaseId, claim.number),
			COPY_SERIAL_FEATURE_KEY,
			{ ...claim }
		);
	}

	/** Gives the number back, so the next owner of the record can take it. */
	public release(releaseId: string, number: number): Promise<void> {
		return this.firestoreSync.delete(
			this.reference(releaseId, number),
			COPY_SERIAL_FEATURE_KEY
		);
	}

	private reference(releaseId: string, number: number): DocumentReference {
		return doc(
			this.firestore,
			COPY_SERIAL_FEATURE_KEY,
			toCopySerialClaimId(releaseId, number)
		);
	}
}
