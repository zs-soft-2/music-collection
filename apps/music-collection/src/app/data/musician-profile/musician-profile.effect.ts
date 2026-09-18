import { Observable, combineLatest, of } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	ContributionEntity,
	MembershipEntity,
	MusicianEntity,
} from '@music-collection/api';

import { MembershipRepository } from '../artist-lineup/membership.repository';
import { MusicianRepository } from './musician.repository';

export interface MusicianProfile {
	musician: MusicianEntity | null;
	/** The bands the musician played in, as member or guest. */
	memberships: MembershipEntity[];
	contributions: ContributionEntity[];
}

/**
 * Loads everything known about a musician: the musician document, the bands
 * (memberships) and the album credits; emits again when any changes.
 */
@Injectable({ providedIn: 'root' })
export class MusicianProfileEffect {
	private readonly musicianRepository = inject(MusicianRepository);
	private readonly membershipRepository = inject(MembershipRepository);

	public load$(musicianUid: string): Observable<MusicianProfile> {
		return combineLatest({
			musician: this.musicianRepository.get$(musicianUid),
			memberships: this.membershipRepository.listByMusician$(musicianUid),
			contributions:
				this.musicianRepository.listContributions$(musicianUid),
		});
	}

	/** The line-ups of the given bands — the musician's bandmates are in them. */
	public loadLineups$(
		artistUids: string[]
	): Observable<MembershipEntity[][]> {
		return artistUids.length
			? combineLatest(
					artistUids.map((uid) =>
						this.membershipRepository.listByArtist$(uid)
					)
				)
			: of([]);
	}
}
