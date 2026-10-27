import { Observable, map } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { UpcomingReleaseEntity } from '@music-collection/api';

import { UpcomingReleaseRepository } from './upcoming-release.repository';

/** The day, `YYYY-MM-DD`, as the stored release dates are written. */
export const today = (now: Date = new Date()): string =>
	`${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;

/**
 * What is still to come, soonest first. The refresh runs once a day, so a
 * record that came out this morning is still in the collection until the
 * night: the day is checked here rather than trusted from the write.
 */
export function toComing(
	releases: UpcomingReleaseEntity[],
	from: string
): UpcomingReleaseEntity[] {
	return releases
		.filter((release) => release.releaseDate >= from)
		.sort(
			(a, b) =>
				a.releaseDate.localeCompare(b.releaseDate) ||
				a.artistName.localeCompare(b.artistName) ||
				a.title.localeCompare(b.title)
		);
}

/**
 * The records of the catalog's artists that have not come out yet, as the
 * page needs them: today's and later, in the order they arrive.
 */
@Injectable({ providedIn: 'root' })
export class UpcomingReleaseEffect {
	private readonly repository = inject(UpcomingReleaseRepository);

	public list$(): Observable<UpcomingReleaseEntity[]> {
		return this.repository
			.list$()
			.pipe(map((releases) => toComing(releases, today())));
	}
}
