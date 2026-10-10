import { pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	SceneLockText,
	SceneModel,
	SceneProbeResult,
	SceneProbeSetup,
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

import { CollectionImageEffect } from '../../../../data/collection-image';
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
	/** The lock texts, so the page can show what will be sent. */
	locks: SceneLockText[];
	/** Until this is true, an empty list means "not asked yet", not "none". */
	setupLoaded: boolean;
	setupError: string | null;
	/** Which picture is being filed right now; null when none is. */
	keeping: number | null;
	/** Which ones are already in the library, by their place in the grid. */
	kept: number[];
}

const initialState: SceneProbeState = {
	subject: '',
	/*
	 * No lock by default. Anything typed or pasted here goes to the model
	 * exactly as written — a lock wrapping a finished prompt produced
	 * "…at blue hour of Use case: stylized-concept", and nothing on the page
	 * said it would. The locks are still a click away, and the preview under
	 * the field shows what each one does before it costs anything.
	 */
	draft: 'none',
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
	locks: [],
	setupLoaded: false,
	setupError: null,
	keeping: null,
	kept: [],
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
		/**
		 * Exactly what the model will be sent.
		 *
		 * Built from the server's own lock texts rather than a copy kept
		 * here: a second copy would drift, and the whole point of showing
		 * this is that it is the truth rather than a description of it.
		 */
		outgoingPrompt: computed(() => {
			const subject = store.subject().trim();
			const lock = store.locks().find((one) => one.id === store.draft());

			if (!subject) {
				return '';
			}

			return lock ? `${lock.prefix}${subject}${lock.suffix}` : subject;
		}),
	})),
	withMethods((
		store,
		effect = inject(MusicCollectionEffect),
		images = inject(CollectionImageEffect)
	) => ({
		/**
		 * One probe picture, kept.
		 *
		 * The bench stores nothing by itself — three quarters of what it
		 * draws is born to be thrown away — but the one that works has to
		 * survive the page, and downloading it only to upload it again is a
		 * silly way to spend somebody's evening. This is the same path the
		 * editor's own upload takes: the file goes to Storage and a
		 * `document` is filed over it, which is what puts it in the picture
		 * library every collection can pick from.
		 */
		async keep(index: number): Promise<void> {
			const result = store.result();
			const image = result?.images[index];

			if (!image || store.keeping() !== null) {
				return;
			}

			patchState(store, { keeping: index, error: null });

			try {
				const name = `jelenet-${result.draft}-${Date.now()}`;
				// A `data:` url-t a böngésző maga bontja vissza bájtokra;
				// kézi base64-dekódolás nélkül, és a típus is megmarad.
				const blob = await (await fetch(image)).blob();

				await images.storeAsDocument(
					name,
					new File([blob], `${name}.png`, {
						type: blob.type || 'image/png',
					})
				);

				patchState(store, {
					keeping: null,
					kept: [...store.kept(), index],
				});
			} catch (error) {
				console.error(error);
				patchState(store, {
					keeping: null,
					error: describeWriteError(error),
				});
			}
		},
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
		 * What this tenant may draw with, and what each lock would send.
		 *
		 * Free — nothing is generated — and the only honest answer to "why
		 * does it look like that": until now the bracket picked the model,
		 * and the bracket picks the cheapest.
		 */
		loadSetup: rxMethod<void>(
			pipe(
				switchMap(() => effect.loadProbeSetup$()),
				tapResponse({
					next: (setup: SceneProbeSetup) =>
						patchState(store, {
							models: setup.models,
							locks: setup.locks,
							setupLoaded: true,
							setupError: null,
						}),
					error: (error: unknown) => {
						console.error(error);
						patchState(store, {
							setupLoaded: true,
							setupError: describeWriteError(error),
						});
					},
				})
			)
		),
	})),
	withHooks({
		onInit(store) {
			store.loadSetup();
		},
	})
);
