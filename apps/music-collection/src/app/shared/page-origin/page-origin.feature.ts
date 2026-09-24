import { map, of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TextService } from '@music-collection/core/i18n';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
import { MusicCollectionEntity } from '@music-collection/domain/music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStoreFeature,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { Crumb } from '../page-breadcrumb';

import {
	PAGE_ORIGIN_PARAM,
	collectionOriginSlug,
	collectionTrail,
} from './page-origin';

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
 * Where a detail page was opened from, for its breadcrumb.
 *
 * A record belongs to more than one place: the shelf it stands on and every
 * collection asking for it. Which of them the trail should lead back to is
 * not a property of the record — it is where the reader came from, so the
 * link that opened the page says it, and the page reads it here.
 *
 * Without the parameter the trail is empty and the page keeps its own root.
 */
export function withPageOrigin() {
	return signalStoreFeature(
		withState(initialState),
		withComputed((store, text = inject(TextService)) => ({
			/** The steps up to the origin; empty when opened on its own. */
			originTrail: computed<Crumb[]>(() =>
				collectionTrail(
					store.originSlug(),
					store.originName(),
					text.translator()
				)
			),
		})),
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
