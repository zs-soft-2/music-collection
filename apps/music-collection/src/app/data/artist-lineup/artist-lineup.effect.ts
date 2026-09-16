import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { MembershipEntity } from '@music-collection/api';

import { MembershipRepository } from './membership.repository';

/** Loads a band's line-up (its `membership` documents). */
@Injectable({ providedIn: 'root' })
export class ArtistLineupEffect {
	private readonly repository = inject(MembershipRepository);

	public load$(artistUid: string): Observable<MembershipEntity[]> {
		return this.repository.listByArtist$(artistUid);
	}
}
