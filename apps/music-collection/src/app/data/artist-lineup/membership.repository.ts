import { Observable, from, map } from 'rxjs';

import {
	EnvironmentInjector,
	Injectable,
	inject,
	runInInjectionContext,
} from '@angular/core';
import {
	Firestore,
	collection,
	getDocs,
	query,
	where,
} from '@angular/fire/firestore';
import {
	MEMBERSHIP_FEATURE_KEY,
	MembershipEntity,
} from '@music-collection/api';

/** Data access for `membership` documents (musician ↔ band, from–to years). */
@Injectable({ providedIn: 'root' })
export class MembershipRepository {
	private readonly firestore = inject(Firestore);
	private readonly injector = inject(EnvironmentInjector);

	/** The line-up of a band. */
	public listByArtist$(artistUid: string): Observable<MembershipEntity[]> {
		return this.listBy$('artistUid', artistUid);
	}

	/** The bands a musician played in. */
	public listByMusician$(
		musicianUid: string
	): Observable<MembershipEntity[]> {
		return this.listBy$('musicianUid', musicianUid);
	}

	private listBy$(
		field: 'artistUid' | 'musicianUid',
		value: string
	): Observable<MembershipEntity[]> {
		// AngularFire expects its APIs to be called in an injection context.
		const snapshot = runInInjectionContext(this.injector, () =>
			getDocs(
				query(
					collection(this.firestore, MEMBERSHIP_FEATURE_KEY),
					where(field, '==', value)
				)
			)
		);

		return from(snapshot).pipe(
			map((result) =>
				result.docs.map(
					(doc) =>
						({ ...doc.data(), uid: doc.id }) as MembershipEntity
				)
			)
		);
	}
}
