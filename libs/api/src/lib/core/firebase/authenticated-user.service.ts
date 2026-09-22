import { Observable, shareReplay } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Auth, User as FirebaseUser, authState } from '@angular/fire/auth';

/**
 * Who is signed in — and the only place the Firebase auth SDK is asked.
 *
 * The session is the one thing nearly every repository and root service has
 * to know before it can do anything, and each of them used to ask the SDK
 * itself. One owner instead, for two reasons.
 *
 * The session is the truth, and it arrives late: on a page reload Firebase
 * restores it asynchronously, and until it has, nobody is signed in *or*
 * signed out — it is simply not known yet. `authState` says nothing during
 * that window, which is exactly right, and is why this cannot be served from
 * the store instead: that one holds a guest from the first moment.
 *
 * And it is held, not rebuilt: the answer is replayed to whoever asks next,
 * so a page opened later reads the session at once rather than waiting for
 * the SDK all over again.
 */
@Injectable({ providedIn: 'root' })
export class AuthenticatedUserService {
	private readonly auth = inject(Auth);

	/**
	 * The signed-in user, or null once it is known there is none. Nothing is
	 * emitted until Firebase has settled, so a reader never mistakes a
	 * session still being restored for a visitor.
	 *
	 * `refCount: false`: the session outlives every single reader, and a
	 * reader arriving after the last one let go must not have to wait for
	 * the SDK again.
	 */
	public readonly user$: Observable<FirebaseUser | null> = authState(
		this.auth
	).pipe(shareReplay({ bufferSize: 1, refCount: false }));

	/**
	 * Whoever is signed in this very moment, for a write that cannot wait
	 * for a stream — saving what the user has just done, say.
	 */
	public get current(): FirebaseUser | null {
		return this.auth.currentUser;
	}
}
