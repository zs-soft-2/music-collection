import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { MembershipEntity } from '@music-collection/api';

import { MembershipRepository } from './membership.repository';

/**
 * Loads line-ups from the `membership` documents: one band's members, or
 * which bands have a line-up at all.
 */
@Injectable({ providedIn: 'root' })
export class ArtistLineupEffect {
	private readonly repository = inject(MembershipRepository);

	public load$(artistUid: string): Observable<MembershipEntity[]> {
		return this.repository.listByArtist$(artistUid);
	}

	/**
	 * Uids of the bands that have at least one membership, guests included.
	 * Folded from every membership, so the documents themselves never reach
	 * a store; which bands have a line-up cannot be counted by Firestore.
	 */
	public loadArtistUidsWithLineup$(): Observable<ReadonlySet<string>> {
		return this.repository
			.list$()
			.pipe(
				map(
					(memberships) =>
						new Set(
							memberships.map(
								(membership) => membership.artistUid
							)
						)
				)
			);
	}
}
