import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';

import { PlayerSettingsOverrides } from './player-settings.model';

const USER_COLLECTION = 'user';
const SETTING_COLLECTION = 'setting';
const PLAYER_DOCUMENT = 'player';
const FEATURE_KEY = 'player-setting';
const STORAGE_KEY = 'mc-player-settings';

interface PlayerSettingsDocument {
	overrides: PlayerSettingsOverrides;
}

/**
 * The user's player settings: in the account (`user/{uid}/setting/player`)
 * when signed in, in this browser otherwise.
 */
@Injectable({ providedIn: 'root' })
export class PlayerSettingsRepository {
	private readonly firestore = inject(Firestore);
	private readonly auth = inject(Auth);
	private readonly firestoreSync = inject(FirestoreSyncService);

	public overrides$(): Observable<PlayerSettingsOverrides> {
		return authState(this.auth).pipe(
			switchMap((user) =>
				user
					? docData(this.reference(user.uid)).pipe(
							map(
								(data) =>
									(data as PlayerSettingsDocument | undefined)
										?.overrides ?? {}
							),
							catchError((error) => {
								console.warn(
									'Player settings unavailable',
									error
								);
								return of(this.loadLocal());
							})
						)
					: of(this.loadLocal())
			)
		);
	}

	public save(overrides: PlayerSettingsOverrides): Promise<void> {
		const user = this.auth.currentUser;
		if (!user) {
			this.saveLocal(overrides);
			return Promise.resolve();
		}
		return this.firestoreSync.set(this.reference(user.uid), FEATURE_KEY, {
			overrides,
		} satisfies PlayerSettingsDocument);
	}

	private reference(uid: string) {
		return doc(
			this.firestore,
			USER_COLLECTION,
			uid,
			SETTING_COLLECTION,
			PLAYER_DOCUMENT
		);
	}

	private loadLocal(): PlayerSettingsOverrides {
		try {
			return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
		} catch {
			return {};
		}
	}

	private saveLocal(overrides: PlayerSettingsOverrides): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
		} catch {
			// Storage unavailable (e.g. private window): lasts for the session.
		}
	}
}
