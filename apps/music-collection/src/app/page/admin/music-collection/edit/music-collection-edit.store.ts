import {
	Observable,
	combineLatest,
	debounceTime,
	exhaustMap,
	filter,
	map,
	of,
	pipe,
	switchMap,
	tap,
} from 'rxjs';

import { computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
	ArtistStateService,
	MusicianStateService,
} from '@music-collection/api';
import {
	BadgeCandidate,
	GenerateBadgeResult,
	MusicCollectionEntity,
	MusicCollectionMembership,
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

import { describeWriteError } from '../music-collection-admin.errors';
import { derivedBasePoints } from '@music-collection/domain/music-collection/engine';

import {
	slugify,
	toBasePoints,
	toCriteria,
	toDraft,
	toForm,
} from '../music-collection-admin.mapper';
import { PickerOption } from '../component/entity-picker.component';
import {
	CollectionForm,
	CriteriaForm,
	emptyCollectionForm,
} from '../music-collection-admin.model';

/**
 * A named entity list for a picker: asked for while it is empty, sorted by
 * name, and narrowed to what the picker shows.
 */
function options$(
	select: () => Observable<{ uid: string; name: string }[]>,
	dispatchList: () => void,
	store: (options: PickerOption[]) => void
) {
	return pipe(
		switchMap(() => select()),
		tap((entities) => {
			if (!entities?.length) {
				dispatchList();
			}
		}),
		filter((entities) => entities?.length > 0),
		tapResponse({
			next: (entities: { uid: string; name: string }[]) =>
				store(
					entities
						.map(({ uid, name }) => ({ uid, name }))
						.sort((a, b) => a.name.localeCompare(b.name))
				),
			error: (error: unknown) => console.error(error),
		})
	);
}

/** The uid the other admin lists use for "not saved yet". */
const NEW_UID = '0';
/** The preview lists this many records; the rest is a count. */
const PREVIEW_SIZE = 24;
/** Keystrokes settle before the catalog is walked again. */
const PREVIEW_DEBOUNCE_MS = 250;

interface MusicCollectionEditState {
	/** Null while adding a new collection. */
	uid: string | null;
	isLoading: boolean;
	isSaving: boolean;
	error: string | null;
	form: CollectionForm;
	/** The slug follows the name until the admin writes one. */
	slugTouched: boolean;
	previewAlbums: MusicCollectionMembership[];
	previewTotal: number;
	/** What the rule alone would make this collection worth. */
	previewPoints: number;
	isPreviewing: boolean;
	/** The other definitions, to pick a parent from. */
	parents: PickerOption[];
	artists: PickerOption[];
	musicians: PickerOption[];
	/** The badge already frozen onto the definition, as an `<img>` can load it. */
	badgeImageUrl: string | null;
	/** Freshly drawn candidates, until one of them is picked. */
	badgeCandidates: BadgeCandidate[];
	/** What the last run was drawn from; travels with the picked candidate. */
	badgeDraw: GenerateBadgeResult | null;
	isGeneratingBadge: boolean;
	isPickingBadge: boolean;
}

const initialState: MusicCollectionEditState = {
	uid: null,
	isLoading: true,
	isSaving: false,
	error: null,
	form: emptyCollectionForm(),
	slugTouched: false,
	previewAlbums: [],
	previewTotal: 0,
	previewPoints: 0,
	isPreviewing: false,
	parents: [],
	artists: [],
	musicians: [],
	badgeImageUrl: null,
	badgeCandidates: [],
	badgeDraw: null,
	isGeneratingBadge: false,
	isPickingBadge: false,
};

/**
 * Admin: one collection definition. The rule is resolved against the catalog
 * while it is being written, so the admin sees what a collection would ask
 * for before anybody is measured against it.
 */
export const MusicCollectionEditStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		isNew: computed(() => store.uid() === null),
		criteria: computed(() => toCriteria(store.form().criteria)),
		/** A rule that catches everything is almost never what was meant. */
		matchesEverything: computed(
			() => !Object.keys(toCriteria(store.form().criteria)).length
		),
		canSave: computed(
			() => !!store.form().name.trim() && !store.isSaving()
		),
		/** What the rule alone would make the collection worth. */
		derivedPoints: computed(() => store.previewPoints()),
		/** The curator's number, once it is a number. */
		curatedPoints: computed(() => toBasePoints(store.form().basePoints)),
	})),
	withMethods(
		(
			store,
			effect = inject(MusicCollectionEffect),
			artistStateService = inject(ArtistStateService),
			musicianStateService = inject(MusicianStateService),
			router = inject(Router)
		) => {
			const preview = rxMethod<CriteriaForm>(
				pipe(
					tap(() => patchState(store, { isPreviewing: true })),
					debounceTime(PREVIEW_DEBOUNCE_MS),
					switchMap((criteria) =>
						effect.preview$(toCriteria(criteria))
					),
					tapResponse({
						next: (resolved) =>
							patchState(store, {
								previewAlbums: resolved.albums.slice(
									0,
									PREVIEW_SIZE
								),
								previewTotal: resolved.total,
								previewPoints: derivedBasePoints(
									resolved.albums
								),
								isPreviewing: false,
							}),
						error: (error) => {
							console.error(error);
							patchState(store, { isPreviewing: false });
						},
					})
				)
			);

			const patchForm = (patch: Partial<CollectionForm>) => {
				const form = { ...store.form(), ...patch };

				patchState(store, { form });

				if (patch.criteria) {
					preview(of(form.criteria));
				}
			};

			const finish = () => {
				patchState(store, { isSaving: false });
				router.navigate(['/admin/music-collection']);
			};

			const fail = (error: unknown) => {
				console.error(error);
				patchState(store, {
					isSaving: false,
					error: describeWriteError(error),
				});
			};

			/** The frozen badge, turned into something an `<img>` can load. */
			return {
				/** `0` opens an empty editor, as the other admin lists do. */
				load: rxMethod<string>(
					pipe(
						tap(() =>
							patchState(store, {
								isLoading: true,
								error: null,
							})
						),
						switchMap((uid) =>
							uid === NEW_UID
								? of(null)
								: effect
										.loadResolution$(uid)
										.pipe(
											map(
												(resolution) =>
													resolution?.collection ??
													null
											)
										)
						),
						tapResponse({
							next: (
								collection: MusicCollectionEntity | null
							) => {
								const form = collection
									? toForm(collection)
									: emptyCollectionForm();

								patchState(store, {
									uid: collection?.uid ?? null,
									form,
									slugTouched: !!collection,
									isLoading: false,
									badgeCandidates: [],
									badgeDraw: null,
									badgeImageUrl:
										collection?.badge?.image?.filePath ??
										null,
								});
								preview(of(form.criteria));
							},
							error: (error) => {
								console.error(error);
								patchState(store, {
									isLoading: false,
									error: describeWriteError(error),
								});
							},
						})
					)
				),
				loadOptions: rxMethod<void>(
					pipe(
						switchMap(() => effect.listAllResolutions$()),
						tapResponse({
							next: (resolutions) =>
								patchState(store, {
									parents: resolutions
										.map(({ collection }) => ({
											uid: collection.uid,
											name: collection.name,
										}))
										.sort((a, b) =>
											a.name.localeCompare(b.name)
										),
								}),
							error: (error) => console.error(error),
						})
					)
				),
				loadArtists: rxMethod<void>(
					options$(
						() => artistStateService.selectEntities$(),
						() => artistStateService.dispatchListEntitiesAction(),
						(artists) => patchState(store, { artists })
					)
				),
				/**
				 * The musicians are loaded for the credits picker only — the
				 * criteria name them, the resolver matches on the credits.
				 */
				loadMusicians: rxMethod<void>(
					options$(
						() => musicianStateService.selectEntities$(),
						() => musicianStateService.dispatchListEntitiesAction(),
						(musicians) => patchState(store, { musicians })
					)
				),
				setField: (patch: Partial<CollectionForm>) => patchForm(patch),
				setName: (name: string) =>
					patchForm(
						store.slugTouched()
							? { name }
							: { name, slug: slugify(name) }
					),
				setSlug: (slug: string) => {
					patchState(store, { slugTouched: true });
					patchForm({ slug });
				},
				setCriteria: (criteria: CriteriaForm) =>
					patchForm({ criteria }),
				/**
				 * Draws candidates. This is not a write: nothing reaches the
				 * definition until one is picked, so a bad draw never becomes
				 * a badge. The collection must be saved first — the server
				 * builds the prompt from what is stored, not from the form.
				 */
				generateBadge: rxMethod<void>(
					pipe(
						filter(
							() => !!store.uid() && !store.isGeneratingBadge()
						),
						tap(() =>
							patchState(store, {
								isGeneratingBadge: true,
								error: null,
								badgeCandidates: [],
							})
						),
						exhaustMap(() =>
							effect.generateBadge$(
								store.uid() as string,
								store.curatedPoints() ?? store.derivedPoints()
							)
						),
						tapResponse({
							next: (draw: GenerateBadgeResult) =>
								patchState(store, {
									badgeDraw: draw,
									badgeCandidates: draw.candidates,
									isGeneratingBadge: false,
								}),
							error: (error: unknown) => {
								console.error(error);
								patchState(store, {
									isGeneratingBadge: false,
									error: describeWriteError(error),
								});
							},
						})
					)
				),

				/** Freezes the chosen candidate onto the definition. */
				pickBadge: rxMethod<BadgeCandidate>(
					pipe(
						filter(() => !!store.uid() && !store.isPickingBadge()),
						tap(() =>
							patchState(store, {
								isPickingBadge: true,
								error: null,
							})
						),
						exhaustMap((candidate) => {
							const draw = store.badgeDraw();

							return effect
								.setBadgeImage$(store.uid() as string, {
									// A jelölt sehol nem volt eltárolva, ezért a
									// kép maga megy vissza — csak ebből az
									// egyből lesz fájl, dokumentummal a tetején.
									image: candidate.dataUrl.replace(
										/^data:[^,]*,/,
										''
									),
									prompt: draw?.prompt ?? '',
									negativePrompt: draw?.negativePrompt ?? '',
									seed: draw?.seed ?? 0,
									styleVersion: draw?.styleVersion ?? 0,
									model: draw?.model ?? '',
								})
								.pipe(map(() => candidate));
						}),
						tapResponse({
							next: (candidate: BadgeCandidate) =>
								patchState(store, {
									// A feltöltött fájl URL-je a következő
									// betöltéskor jön; addig a jelölt képe áll.
									badgeImageUrl: candidate.dataUrl,
									badgeCandidates: [],
									isPickingBadge: false,
								}),
							error: (error: unknown) => {
								console.error(error);
								patchState(store, {
									isPickingBadge: false,
									error: describeWriteError(error),
								});
							},
						})
					)
				),

				save: rxMethod<void>(
					pipe(
						tap(() =>
							patchState(store, { isSaving: true, error: null })
						),
						exhaustMap(() => {
							const uid = store.uid();
							const draft = toDraft(store.form());

							return uid
								? effect.update$(uid, draft)
								: effect.create$(draft);
						}),
						tapResponse({ next: finish, error: fail })
					)
				),
			};
		}
	),
	withHooks({
		onInit(store) {
			store.loadOptions(of(undefined));
			store.loadArtists(of(undefined));
			store.loadMusicians(of(undefined));
		},
	})
);
