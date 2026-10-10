import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	SceneModel,
	SceneProbeResult,
	SceneStyleDraft,
} from '@music-collection/domain/music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';
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

import { describeWriteError } from '../../music-collection/music-collection-admin.errors';

/**
 * The scene probe — TEMPORARY.
 *
 * The collection backdrops need a style lock the way the badges have one:
 * the same sentences on every draw, or six pictures that were meant to be a
 * set read as six pictures. A lock like that cannot be written blind, so
 * this is the bench where the candidates are tried out, cheaply, before the
 * real thing is built around the winner.
 *
 * Nothing it draws is kept. The images arrive as `data:` urls and leave with
 * the page — a probe costs the draw and nothing else, which is the whole
 * reason to run one first.
 */
interface SceneProbeState {
	/** What should be in the picture: the collection's "place", in a sentence. */
	subject: string;
	draft: SceneStyleDraft;
	size: string;
	count: number;
	/** Which model to draw with; empty leaves it to the gateway's bracket. */
	model: string;
	isProbing: boolean;
	result: SceneProbeResult | null;
	error: string | null;
	/** What this tenant can actually reach. Free to ask for; nothing is drawn. */
	models: SceneModel[];
	modelsError: string | null;
}

const initialState: SceneProbeState = {
	subject: '',
	// The one the mockup's hero came closest to; the others are a click away.
	draft: 'nocturne',
	// 16:9, because a backdrop is wider than it is tall. Whether this model
	// accepts it is exactly what a probe finds out.
	size: '1536x864',
	// Two is enough to tell whether a lock holds, and half the bill of four.
	count: 2,
	// Empty means the gateway's bracket decides — which is how every picture
	// so far came out of the cheapest image model it has.
	model: '',
	isProbing: false,
	result: null,
	error: null,
	models: [],
	modelsError: null,
};

/** The server clamps this too; the form refuses the obvious nonsense first. */
const MAX_IMAGES = 4;

export const SceneProbeStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		/** Nothing is drawn for an empty subject — it would cost and say nothing. */
		canProbe: computed(
			() => !store.isProbing() && store.subject().trim().length > 0
		),
	})),
	withMethods((store, effect = inject(MusicCollectionEffect)) => ({
		set(change: Partial<SceneProbeState>): void {
			patchState(store, { ...change, error: null });
		},
		setCount(value: string): void {
			const parsed = Number.parseInt(value, 10);

			patchState(store, {
				count: Number.isFinite(parsed)
					? Math.min(Math.max(parsed, 1), MAX_IMAGES)
					: store.count(),
				error: null,
			});
		},
		run: rxMethod<void>(
			pipe(
				tap(() =>
					patchState(store, {
						isProbing: true,
						error: null,
						// The old pictures go the moment a new draw starts:
						// a grid that still shows the previous lock's work
						// while the next is drawing is how two of them end
						// up being compared to each other by mistake.
						result: null,
					})
				),
				switchMap(() =>
					effect.probeScene$({
						subject: store.subject().trim(),
						draft: store.draft(),
						size: store.size(),
						count: store.count(),
						model: store.model().trim() || null,
					})
				),
				tapResponse({
					next: (result: SceneProbeResult) =>
						patchState(store, { result, isProbing: false }),
					error: (error: unknown) => {
						console.error(error);
						patchState(store, {
							isProbing: false,
							error: describeWriteError(error),
						});
					},
				})
			)
		),
		/**
		 * What this tenant may draw with. Free — nothing is generated — and
		 * the only honest answer to "why does it look like that": until now
		 * the bracket picked, and the bracket picks the cheapest.
		 */
		loadModels: rxMethod<void>(
			pipe(
				switchMap(() => effect.listSceneModels$()),
				tapResponse({
					next: (models: SceneModel[]) =>
						patchState(store, { models, modelsError: null }),
					error: (error: unknown) => {
						console.error(error);
						patchState(store, {
							modelsError: describeWriteError(error),
						});
					},
				})
			)
		),
	})),
	withHooks({
		onInit(store) {
			store.loadModels();
		},
	})
);
