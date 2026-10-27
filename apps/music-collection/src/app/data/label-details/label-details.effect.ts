import { Observable, catchError, combineLatest, of, startWith } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { LabelEntity, ReleaseEntity } from '@music-collection/api';

import { ReleaseRepository } from '../release-details/release.repository';
import { LabelRepository } from './label.repository';

export interface LabelDetails {
	/**
	 * The label document — null for a sub-label, which is kept under its
	 * parent. What such a label is called is still known: every pressing
	 * carries the label that put it out.
	 */
	label: LabelEntity | null;
	children: LabelEntity[];
	releases: ReleaseEntity[];
}

/** Loads a label, the labels under it and everything it put out. */
@Injectable({ providedIn: 'root' })
export class LabelDetailsEffect {
	private readonly labelRepository = inject(LabelRepository);
	private readonly releaseRepository = inject(ReleaseRepository);

	/**
	 * The label is what the page waits for; its records and sub-labels start
	 * out empty and join when they arrive. A label whose pressings cannot be
	 * read is still a label, and the page says so rather than waiting for a
	 * list that may never come.
	 */
	public load$(labelUid: string): Observable<LabelDetails> {
		return combineLatest({
			label: this.labelRepository.get$(labelUid),
			children: whenItArrives(
				this.labelRepository.listChildren$(labelUid)
			),
			releases: whenItArrives(
				this.releaseRepository.listByLabel$(labelUid)
			),
		});
	}
}

/** A list the page can do without: empty until (and unless) it is read. */
function whenItArrives<T>(source$: Observable<T[]>): Observable<T[]> {
	return source$.pipe(
		catchError((error) => {
			console.error(error);

			return of([] as T[]);
		}),
		startWith([] as T[])
	);
}
