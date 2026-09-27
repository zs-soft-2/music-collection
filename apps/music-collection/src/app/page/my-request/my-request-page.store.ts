import { combineLatest, of, pipe, startWith, switchMap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AuthenticatedUserService,
	EntityRequest,
	EntityResponse,
	ReleaseRequest,
} from '@music-collection/api';
import { TextService } from '@music-collection/core/i18n';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStore,
	withComputed,
	withHooks,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import { ReleaseRequestEffect } from '../../data/release-request';
import { RequestEffect } from '../../data/request';
import { Crumb } from '../../shared/page-breadcrumb';
import { toMyRequestRows, toReleaseRequestRow } from './my-request.mapper';

interface MyRequestPageState {
	requests: EntityRequest[];
	responses: EntityResponse[];
	/** The older kind: asking the catalog to take in a pressing. */
	releaseRequests: ReleaseRequest[];
	loading: boolean;
	failed: boolean;
}

const initialState: MyRequestPageState = {
	requests: [],
	responses: [],
	releaseRequests: [],
	loading: true,
	failed: false,
};

/**
 * What the collector has asked of the catalog, and what came back.
 *
 * The streams are read together, because a request without its answer is
 * half the story: what the collector comes here for is the reason a field was
 * refused. A silent one would hold the whole page up, so each starts empty —
 * an unanswered request still reads correctly.
 *
 * Release requests are shown among them. They are a different thing under the
 * surface — an import, not a change — but the collector made one act, and
 * looking for the answer in two places would be their problem, not ours.
 */
export const MyRequestPageStore = signalStore(
	withState(initialState),
	withComputed((store, text = inject(TextService)) => ({
		rows: computed(() =>
			[
				...toMyRequestRows(store.requests(), store.responses()),
				...store.releaseRequests().map(toReleaseRequestRow),
			].sort((one, other) => other.askedOn.localeCompare(one.askedOn))
		),
		isEmpty: computed(
			() =>
				!store.loading() &&
				!store.requests().length &&
				!store.releaseRequests().length
		),
		trail: computed<Crumb[]>(() => [
			{ label: text.translator()('page.my-request.title') },
		]),
	})),
	withMethods(
		(
			store,
			requestEffect = inject(RequestEffect),
			releaseRequestEffect = inject(ReleaseRequestEffect),
			authenticatedUser = inject(AuthenticatedUserService)
		) => ({
			load: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest({
							requests: requestEffect.listMine$(),
							responses: requestEffect
								.listMyResponses$()
								.pipe(startWith([] as EntityResponse[])),
							releaseRequests: authenticatedUser.user$.pipe(
								switchMap((user) =>
									user
										? releaseRequestEffect.listByUser$(
												user.uid
											)
										: of([] as ReleaseRequest[])
								),
								startWith([] as ReleaseRequest[])
							),
						})
					),
					tapResponse({
						next: ({ requests, responses, releaseRequests }) =>
							patchState(store, {
								requests,
								responses,
								releaseRequests,
								loading: false,
								failed: false,
							}),
						error: (error) => {
							console.error(
								'The requests could not be read',
								error
							);
							patchState(store, { loading: false, failed: true });
						},
					})
				)
			),
		})
	),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
		},
	})
);
