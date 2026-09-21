import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { DocumentData, Firestore, doc, docData } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';

import { UserSetting } from './user-settings.model';

const USER_COLLECTION = 'user';
const SETTING_COLLECTION = 'setting';

/**
 * Data access for the user's settings: the account
 * (`user/{uid}/setting/{id}`) when signed in, this browser otherwise. The
 * rules let only the user themselves read and write these documents, so a
 * setting kept here never reaches anyone else.
 */
@Injectable({ providedIn: 'root' })
export class UserSettingsRepository {
	private readonly firestore = inject(Firestore);
	private readonly auth = inject(Auth);
	private readonly firestoreSync = inject(FirestoreSyncService);

	/**
	 * Follows the setting, and switches with the sign-in state. A document
	 * that cannot be read (offline, rules) falls back to the browser's copy
	 * instead of failing the page that shows it.
	 */
	public value$<T>(setting: UserSetting<T>): Observable<T> {
		return authState(this.auth).pipe(
			switchMap((user) =>
				user
					? docData(this.reference(setting.id, user.uid)).pipe(
							map((data) => setting.toValue(data ?? {})),
							catchError((error) => {
								console.warn(
									`Setting "${setting.id}" unavailable`,
									error
								);

								return of(this.readLocal(setting));
							})
						)
					: of(this.readLocal(setting))
			)
		);
	}

	public save<T>(setting: UserSetting<T>, value: T): Promise<void> {
		const user = this.auth.currentUser;
		const data = setting.toDocument(value);

		if (!user) {
			this.writeLocal(setting, data);

			return Promise.resolve();
		}

		return this.firestoreSync.set(
			this.reference(setting.id, user.uid),
			setting.featureKey,
			data
		);
	}

	private reference(id: string, uid: string) {
		return doc(
			this.firestore,
			USER_COLLECTION,
			uid,
			SETTING_COLLECTION,
			id
		);
	}

	private readLocal<T>(setting: UserSetting<T>): T {
		try {
			return setting.toValue(
				JSON.parse(localStorage.getItem(setting.storageKey) ?? '{}')
			);
		} catch {
			return setting.toValue({});
		}
	}

	private writeLocal(
		setting: UserSetting<unknown>,
		data: DocumentData
	): void {
		try {
			localStorage.setItem(setting.storageKey, JSON.stringify(data));
		} catch {
			// Storage unavailable (e.g. private window): lasts for the session.
		}
	}
}
