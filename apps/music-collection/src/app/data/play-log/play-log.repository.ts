import { Observable, of, switchMap } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, doc } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';

import { PLAY_LOG_FEATURE_KEY, PlayLogEntry } from './play-log.model';

/** Parent of the users' own data (`user/{uid}/play-log`). */
const USER_COLLECTION = 'user';

/**
 * Data access for the collector's listening log. The rules let only the user
 * themselves read and write these documents: what somebody listens to at home
 * is theirs. Signed out there is no log at all — a sitting nobody can be told
 * about is not worth keeping in this browser.
 */
@Injectable({ providedIn: 'root' })
export class PlayLogRepository {
	private readonly firestore = inject(Firestore);
	private readonly auth = inject(Auth);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly injector = inject(Injector);

	/** The whole log of the signed-in collector; empty while signed out. */
	public list$(): Observable<PlayLogEntry[]> {
		return authState(this.auth).pipe(
			switchMap((user) =>
				user
					? this.firestoreSync.list$<PlayLogEntry>({
							featureKey: PLAY_LOG_FEATURE_KEY,
							cacheKey: `${PLAY_LOG_FEATURE_KEY}?userId=${user.uid}`,
							query: runInInjectionContext(this.injector, () =>
								collection(
									this.firestore,
									USER_COLLECTION,
									user.uid,
									PLAY_LOG_FEATURE_KEY
								)
							),
							incremental: true,
							// Private data: there is no bundle to fill from.
							bundle: false,
						})
					: of([])
			)
		);
	}

	/**
	 * Writes one sitting. The id holds the album and the moment it started,
	 * so a sitting flushed twice — once when the tab was hidden, once when it
	 * ended — is the same document rather than two plays.
	 */
	public save(entry: PlayLogEntry): Promise<void> {
		const user = this.auth.currentUser;

		if (!user) {
			return Promise.resolve();
		}

		return this.firestoreSync.set(
			runInInjectionContext(this.injector, () =>
				doc(
					this.firestore,
					USER_COLLECTION,
					user.uid,
					PLAY_LOG_FEATURE_KEY,
					entry.uid
				)
			),
			PLAY_LOG_FEATURE_KEY,
			{ ...entry }
		);
	}

	/** Whether a sitting would be kept at all. */
	public get signedIn(): boolean {
		return !!this.auth.currentUser;
	}
}
