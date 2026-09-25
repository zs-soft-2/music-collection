import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { MembershipEntity } from '@music-collection/api';

import { MembershipRepository } from '@music-collection/domain/membership';

/**
 * Loads the data of the relationship network: every membership (musician ↔
 * band), kept current while the network page is open.
 */
@Injectable({ providedIn: 'root' })
export class ArtistNetworkEffect {
	private readonly membershipRepository = inject(MembershipRepository);

	public loadMemberships$(): Observable<MembershipEntity[]> {
		return this.membershipRepository.list$();
	}
}
