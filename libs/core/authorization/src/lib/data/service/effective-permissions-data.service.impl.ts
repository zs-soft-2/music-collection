import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import {
	EffectivePermissions,
	EffectivePermissionsDataService,
} from '@music-collection/api';

/** A dokumentum helye; a firestore.rules és a storage.rules is ezt olvassa. */
const effectivePermissionsPath = (uid: string) =>
	`security/users/${uid}/effective_permissions`;

@Injectable()
export class EffectivePermissionsDataServiceImpl extends EffectivePermissionsDataService {
	private firestore = inject(Firestore);

	public load$(uid: string): Observable<EffectivePermissions | undefined> {
		return docData(
			doc(this.firestore, effectivePermissionsPath(uid))
		) as Observable<EffectivePermissions | undefined>;
	}
}
