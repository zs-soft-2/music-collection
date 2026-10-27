import {
	Observable,
	catchError,
	finalize,
	map,
	of,
	shareReplay,
	switchMap,
} from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import { DocumentData, Firestore, doc, docData } from '@angular/fire/firestore';
import {
	AuthenticatedUserService,
	FirestoreSyncService,
} from '@music-collection/api';

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
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly injector = inject(Injector);
	/** The shared listener of every setting document being followed. */
	private readonly followedDocuments = new Map<
		string,
		Observable<DocumentData | undefined>
	>();

	/**
	 * Follows the setting, and switches with the sign-in state. A document
	 * that cannot be read (offline, rules) falls back to the browser's copy
	 * instead of failing the page that shows it.
	 */
	public value$<T>(setting: UserSetting<T>): Observable<T> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user
					? this.followed$(setting, user.uid).pipe(
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
		const user = this.authenticatedUser.current;
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

	/**
	 * The one listener on a setting document, however many ask for it. The
	 * same setting is read from several places at once — a page store, a
	 * root service, a form — and without this each of them would open its
	 * own snapshot listener on the very same document.
	 *
	 * The key holds the uid: a listener opened for one account must never
	 * serve the next one. It is dropped again once the last reader lets go
	 * (and on an error), so the next reader starts from a fresh document.
	 */
	private followed$<T>(
		setting: UserSetting<T>,
		uid: string
	): Observable<DocumentData | undefined> {
		const key = `${uid}/${setting.id}`;
		const followed = this.followedDocuments.get(key);

		if (followed) {
			return followed;
		}

		const document$ = this.document$(setting, uid).pipe(
			finalize(() => this.followedDocuments.delete(key)),
			shareReplay({ bufferSize: 1, refCount: true })
		);

		this.followedDocuments.set(key, document$);

		return document$;
	}

	/**
	 * AngularFire expects its APIs in an injection context; these run from
	 * a stream or an event handler, long after the repository was built.
	 */
	private document$<T>(
		setting: UserSetting<T>,
		uid: string
	): Observable<DocumentData | undefined> {
		return runInInjectionContext(this.injector, () =>
			docData(this.reference(setting.id, uid))
		);
	}

	private reference(id: string, uid: string) {
		return runInInjectionContext(this.injector, () =>
			doc(this.firestore, USER_COLLECTION, uid, SETTING_COLLECTION, id)
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
