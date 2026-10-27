import {
	Observable,
	catchError,
	defer,
	map,
	of,
	shareReplay,
	startWith,
} from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { EntityRequest } from '@music-collection/api';

import { RequestEffect } from './request.effect';

/**
 * Which fields of one catalog document the collector is waiting on.
 *
 * A request carries the whole place it is about — `artist/a1/album/b2` —
 * while a page knows only what it is showing, so the tail is what the two can
 * agree on. The feature is checked beside the uid rather than the uid alone:
 * ids are the document's own, and the feature is what says an album from a
 * release.
 *
 * Only an update is counted. A create is not about this document — it is
 * asking for one the catalog does not have — and the page it would be shown
 * on does not exist yet.
 */
export function pendingFieldsFor(
	requests: EntityRequest[],
	featureKey: string,
	uid: string | null | undefined
): string[] {
	if (!uid) {
		return [];
	}

	const tail = `${featureKey}/${uid}`;
	const fields = requests
		.filter(
			(request) =>
				request.status === 'pending' &&
				request.operation === 'update' &&
				request.target.featureKey === featureKey &&
				(request.target.path === tail ||
					!!request.target.path?.endsWith(`/${tail}`))
		)
		// Two requests may touch the same field — the second is the one that
		// will be decided on, but the collector is waiting on the field once.
		.flatMap((request) => request.changes.map((change) => change.field));

	return [...new Set(fields)];
}

/**
 * The collector's undecided proposals, as a catalog page asks about them.
 *
 * A proposal does not write the catalog: until an admin takes it in, the
 * entity is what it was, for the collector as much as for everyone else. What
 * was missing is not the changed view — that would leave the app with two
 * truths, one of them ageing — but the trace: submit a cover and the album
 * page looks exactly as it did, saying nothing about the request at all.
 *
 * The list is read lazily. The `defer` keeps a visitor who never proposes
 * from reading anything, and the `shareReplay` holds it across pages: a
 * collector has a handful of these, and they should not be fetched again on
 * every record they open.
 */
@Injectable({ providedIn: 'root' })
export class PendingProposalService {
	private readonly requests = inject(RequestEffect);

	/**
	 * What has no answer yet. It starts empty and falls back to empty, on
	 * purpose: this is a second list on a page whose subject is the catalog,
	 * and a query that goes quiet must not hold back the propose link with
	 * it.
	 */
	public readonly mine$: Observable<EntityRequest[]> = defer(() =>
		this.requests.listMine$()
	).pipe(
		map((requests) =>
			requests.filter((request) => request.status === 'pending')
		),
		catchError((error) => {
			console.warn('Pending requests could not be read', error);

			return of<EntityRequest[]>([]);
		}),
		startWith<EntityRequest[]>([]),
		shareReplay({ bufferSize: 1, refCount: false })
	);
}
