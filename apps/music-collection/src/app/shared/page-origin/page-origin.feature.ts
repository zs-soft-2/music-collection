import { map, of, pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
import { MusicCollectionEntity } from '@music-collection/domain/music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStoreFeature,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { PAGE_ORIGIN_PARAM, collectionOriginSlug } from './page-origin';

interface PageOriginState {
	/** The collection this page was opened from, when it was. */
	originSlug: string | null;
	originName: string | null;
}

const initialState: PageOriginState = {
	originSlug: null,
	originName: null,
};

/**
 * Where a detail page was opened from, for its Back control.
 *
 * A record belongs to more than one place: the shelf it stands on and every
 * collection asking for it. Which of them the reader came through is not a
 * property of the record and not its place in the app — it is the reader's
 * own last step, so the link that opened the page says it, and the page reads
 * it here to put a name on the way back ("← Bay Area Thrash").
 *
 * The breadcrumb is left out of this on purpose: it leads up through the
 * record itself, the same way for everybody.
 */
export function withPageOrigin() {
	return signalStoreFeature(
		withState(initialState),
		withMethods(
			(
				store,
				route = inject(ActivatedRoute),
				collections = inject(MusicCollectionEffect)
			) => ({
				/** Follows `?from`, and names the collection it points at. */
				loadOrigin: rxMethod<void>(
					pipe(
						switchMap(() => route.queryParamMap),
						map((params) =>
							collectionOriginSlug(params.get(PAGE_ORIGIN_PARAM))
						),
						tap((originSlug) =>
							patchState(store, { originSlug, originName: null })
						),
						switchMap((slug) =>
							slug ? collections.loadDefinition$(slug) : of(null)
						),
						tapResponse({
							next: (collection: MusicCollectionEntity | null) =>
								patchState(store, {
									originName: collection?.name ?? null,
								}),
							error: (error) => {
								console.error(error);
								patchState(store, { originName: null });
							},
						})
					)
				),
			})
		)
	);
}
