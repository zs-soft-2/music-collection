import { DocumentData } from '@angular/fire/firestore';

/**
 * One kind of setting the user keeps: a document under `user/{uid}/setting`
 * when signed in, a browser entry otherwise. The mappers keep the stored
 * shape apart from the one the app works with, so a document written by an
 * older version — or by hand — stays readable.
 */
export interface UserSetting<T> {
	/** Document id under `user/{uid}/setting`, e.g. `appearance`. */
	id: string;
	/** Feature key of the sync stamp (FirestoreSyncService). */
	featureKey: string;
	/** Where the value is kept while signed out. */
	storageKey: string;
	/** The stored document — `{}` when there is none — as the app sees it. */
	toValue(data: DocumentData): T;
	toDocument(value: T): DocumentData;
}
