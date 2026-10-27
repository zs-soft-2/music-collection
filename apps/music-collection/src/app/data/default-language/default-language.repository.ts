import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { FirestoreSyncService } from '@music-collection/api';
import { LanguageEnum, isLanguage } from '@music-collection/core/i18n';

const APP_SETTING_COLLECTION = 'app-setting';
const LANGUAGE_DOCUMENT = 'language';

/** Feature key of the sync stamp (FirestoreSyncService). */
export const DEFAULT_LANGUAGE_FEATURE_KEY = 'default-language';

/**
 * Data access for the language the app opens in when the reader has not
 * picked one: `app-setting/language`.
 *
 * Readable by everybody, signed in or not — it decides what language a first
 * visit is drawn in, and a visitor is exactly the reader who has no choice of
 * their own yet. Writable only with `updateDefaultLanguage`; the rules also
 * check that the value is one of the three the app speaks, so a bad write
 * cannot leave every visitor looking at key names.
 */
@Injectable({ providedIn: 'root' })
export class DefaultLanguageRepository {
	private readonly firestore = inject(Firestore);
	private readonly firestoreSync = inject(FirestoreSyncService);
	private readonly injector = inject(Injector);

	/**
	 * The one listener, however many ask. The default is read by the service
	 * that applies it and by the admin form that sets it, and there is no
	 * sense in two snapshot listeners on one document of one field.
	 */
	private followed: Observable<LanguageEnum | null> | null = null;

	public value$(): Observable<LanguageEnum | null> {
		if (!this.followed) {
			this.followed = this.document$().pipe(
				map((data) =>
					isLanguage(data?.['language']) ? data['language'] : null
				),
				// A default that cannot be read is not worth failing a page
				// over: the reader keeps whatever their browser asked for.
				catchError((error) => {
					console.warn('Default language unavailable', error);

					return of(null);
				}),
				shareReplay({ bufferSize: 1, refCount: false })
			);
		}

		return this.followed;
	}

	public save(language: LanguageEnum): Promise<void> {
		return this.firestoreSync.set(
			this.reference(),
			DEFAULT_LANGUAGE_FEATURE_KEY,
			{ language }
		);
	}

	/**
	 * AngularFire expects its APIs in an injection context; these run from a
	 * stream or an event handler, long after the repository was built.
	 */
	private document$() {
		return runInInjectionContext(this.injector, () =>
			docData(this.reference())
		);
	}

	private reference() {
		return runInInjectionContext(this.injector, () =>
			doc(this.firestore, APP_SETTING_COLLECTION, LANGUAGE_DOCUMENT)
		);
	}
}
