import {
	Observable,
	combineLatest,
	from,
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
	DocumentEntity,
	MusicianStateService,
	StyleName,
} from '@music-collection/api';
import {
	BadgeImage,
	GenerateBadgeResult,
	MusicCollectionEntity,
	MusicCollectionMembership,
} from '@music-collection/domain/music-collection/api';
import { GenreEffect } from '@music-collection/domain/genre';
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

import { slugify } from '@music-collection/common/engine';

import {
	CollectionImageEffect,
	StoredImage,
} from '../../../../data/collection-image';

import { describeWriteError } from '../music-collection-admin.errors';
import { derivedBasePoints } from '@music-collection/domain/music-collection/engine';

import {
	toBasePoints,
	toCriteria,
	toDraft,
	toForm,
} from '../music-collection-admin.mapper';
import { PickerOption } from '../component/entity-picker.component';
import { LibraryImage } from '../component/image-library.component';
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

/** The form fields an admin may fill by uploading a picture. */
export type UploadableField = 'coverImageUrl' | 'badgeArtworkUrl';

/**
 * What the image library was opened for: one of the two picture fields, or
 * the pin itself. A field only takes the address of the picture; the pin
 * goes to the server, because the gallery is the server's to write.
 */
export type LibraryTarget = UploadableField | 'pin';

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
	/** Every style of the taxonomy; what the style criteria choose from. */
	styles: StyleName[];
	/** The badge already frozen onto the definition, as an `<img>` can load it. */
	badgeImageUrl: string | null;
	/** Which gallery image that is — the one marked as the current pin. */
	badgeImageUid: string | null;
	/**
	 * Every image drawn for this collection that is still on offer, oldest
	 * first. Drawing adds to it rather than replacing it, so an admin can
	 * still pick a pin out of last month's run without paying the model
	 * again; the ones withdrawn in the document admin are left out.
	 */
	badgeGallery: BadgeImage[];
	isGeneratingBadge: boolean;
	isPickingBadge: boolean;
	/** Which picture is on its way to Storage, if any. */
	uploadingField: UploadableField | null;
	/**
	 * A hand-made pin on its way: it travels further than the other two —
	 * Storage, then the server, which files a document over it and takes it
	 * into the gallery — so it has its own flag rather than a form field's.
	 */
	isUploadingPin: boolean;
	/**
	 * Every picture already uploaded, newest first — what the library
	 * offers instead of a fresh upload. It is every image `document`: the
	 * pins drawn for any collection, the ones uploaded from this editor,
	 * and whatever was filed in the document admin.
	 */
	library: LibraryImage[];
	/** Which field the library is open for, if any. */
	libraryTarget: LibraryTarget | null;
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
	styles: [],
	badgeImageUrl: null,
	badgeImageUid: null,
	badgeGallery: [],
	isGeneratingBadge: false,
	isPickingBadge: false,
	uploadingField: null,
	isUploadingPin: false,
	library: [],
	libraryTarget: null,
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
			imageEffect = inject(CollectionImageEffect),
			artistStateService = inject(ArtistStateService),
			genreEffect = inject(GenreEffect),
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

			/**
			 * The gallery narrowed to what may still be picked: an image
			 * withdrawn in the document admin stays where it is, and the
			 * definition goes on pointing at it, but it is not offered.
			 */
			const offerGallery = rxMethod<BadgeImage[]>(
				pipe(
					switchMap((gallery) =>
						effect.offeredBadgeGallery$(gallery)
					),
					tapResponse({
						next: (badgeGallery: BadgeImage[]) =>
							patchState(store, { badgeGallery }),
						error: (error: unknown) => console.error(error),
					})
				)
			);

			/**
			 * The library: every picture already uploaded. Asked for when it
			 * is first opened rather than on load, so a collection whose
			 * pictures are all in place never pays for the list.
			 */
			const loadLibrary = rxMethod<void>(
				pipe(
					switchMap(() => effect.uploadedImages$()),
					tapResponse({
						next: (documents: DocumentEntity[]) =>
							patchState(store, {
								library: documents.map(
									({ uid, name, filePath }) => ({
										uid,
										name,
										filePath,
									})
								),
							}),
						error: (error: unknown) => console.error(error),
					})
				)
			);

			/**
			 * A picture out of the library, taken into this collection's
			 * gallery and made its pin. Nothing travels: the file is where it
			 * was, and the document over it stays the one it always was — the
			 * gallery only comes to point at it as well.
			 */
			const adoptLibraryImage = rxMethod<LibraryImage>(
				pipe(
					filter(() => !!store.uid() && !store.isPickingBadge()),
					tap(() =>
						patchState(store, {
							isPickingBadge: true,
							error: null,
						})
					),
					exhaustMap((image) =>
						effect.adoptBadgeDocument$(
							store.uid() as string,
							image.uid
						)
					),
					tapResponse({
						next: (image: BadgeImage) => {
							// Ugyanaz a sorrend, amit a szerver írt: ami már
							// bent volt, marad a helyén.
							const gallery = store
								.badgeGallery()
								.some(
									({ documentUid }) =>
										documentUid === image.documentUid
								)
								? store.badgeGallery()
								: [...store.badgeGallery(), image];

							patchState(store, {
								badgeGallery: gallery,
								badgeImageUrl: image.filePath,
								badgeImageUid: image.documentUid,
								isPickingBadge: false,
								libraryTarget: null,
							});
							offerGallery(of(gallery));
						},
						error: (error: unknown) => {
							console.error(error);
							patchState(store, {
								isPickingBadge: false,
								error: describeWriteError(error),
							});
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

								const gallery =
									collection?.badge?.gallery ?? [];

								patchState(store, {
									uid: collection?.uid ?? null,
									form,
									slugTouched: !!collection,
									isLoading: false,
									badgeImageUrl:
										collection?.badge?.image?.filePath ??
										null,
									badgeImageUid:
										collection?.badge?.image?.documentUid ??
										null,
									badgeGallery: gallery,
								});
								offerGallery(of(gallery));
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
				/**
				 * The styles the criteria may name: the taxonomy's, not a list
				 * in the code. It starts empty and fills in, so a taxonomy
				 * that cannot be read leaves the editor usable.
				 */
				loadStyles: rxMethod<void>(
					pipe(
						switchMap(() => genreEffect.styles$),
						tapResponse({
							next: (styles) => patchState(store, { styles }),
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
				 * Takes a hand-made image into Storage and writes the URL it
				 * can be loaded from into the field it was chosen for — the
				 * cover or the badge artwork. Nothing is saved here: the Save
				 * button writes the definition, as it does for every other
				 * field of the form.
				 */
				uploadImage: rxMethod<{ field: UploadableField; file: File }>(
					pipe(
						filter(() => !store.uploadingField()),
						tap(({ field }) =>
							patchState(store, {
								uploadingField: field,
								error: null,
							})
						),
						exhaustMap(({ field, file }) =>
							from(
								// Dokumentummal: a feltöltött kép így marad
								// megtalálható, és a következő collectionhöz
								// már a könyvtárból választható.
								imageEffect.storeAsDocument(
									`${store.form().slug}-${
										field === 'coverImageUrl'
											? 'cover'
											: 'badge'
									}`,
									file
								)
							).pipe(
								tapResponse({
									next: ({ url }: StoredImage) => {
										patchForm({ [field]: url });
										patchState(store, {
											uploadingField: null,
										});
									},
									error: (error: unknown) => {
										console.error(error);
										patchState(store, {
											uploadingField: null,
											error:
												error instanceof Error
													? error.message
													: describeWriteError(error),
										});
									},
								})
							)
						)
					)
				),

				/**
				 * Takes a picture the admin made and makes it the pin.
				 *
				 * It goes the same road as a drawn one from here on: the file
				 * lands in Storage, the server files a `document` over it and
				 * takes it into the gallery, and from there it is a pin like
				 * any other — pickable later, and visible in the document
				 * admin. What it does not do is wait to be chosen: an admin
				 * who uploads a picture has already chosen it.
				 *
				 * The collection must be saved first, as drawing must: the
				 * gallery lives on the stored definition.
				 */
				uploadPin: rxMethod<File>(
					pipe(
						filter(() => !!store.uid() && !store.isUploadingPin()),
						tap(() =>
							patchState(store, {
								isUploadingPin: true,
								error: null,
							})
						),
						exhaustMap((file) =>
							from(
								imageEffect.store(
									`${store.form().slug}-pin`,
									file
								)
							).pipe(
								switchMap(({ path }: StoredImage) =>
									effect.adoptBadgeImage$(
										store.uid() as string,
										path,
										file.name
									)
								),
								tapResponse({
									next: (image: BadgeImage) => {
										const gallery = [
											...store
												.badgeGallery()
												.filter(
													({ documentUid }) =>
														documentUid !==
														image.documentUid
												),
											image,
										];

										patchState(store, {
											badgeGallery: gallery,
											badgeImageUrl: image.filePath,
											badgeImageUid: image.documentUid,
											isUploadingPin: false,
										});
										// A galéria élő stream mögött áll: ha
										// a dokumentumok újra megszólalnak, a
										// betöltéskori listát írnák vissza —
										// ezért a frissel etetjük meg.
										offerGallery(of(gallery));
									},
									error: (error: unknown) => {
										console.error(error);
										patchState(store, {
											isUploadingPin: false,
											error:
												error instanceof Error
													? error.message
													: describeWriteError(error),
										});
									},
								})
							)
						)
					)
				),

				/**
				 * Opens the library for one field. The list is asked for at
				 * the same time: by the time an admin has looked at the
				 * panel, the pictures are in it.
				 */
				openLibrary(target: LibraryTarget): void {
					patchState(store, { libraryTarget: target, error: null });
					loadLibrary(of(undefined));
				},

				closeLibrary(): void {
					patchState(store, { libraryTarget: null });
				},

				/**
				 * A picture picked out of the library.
				 *
				 * Into a field it is only an address, written like any other
				 * value of the form and saved with it. As the pin it is more
				 * than that — the gallery has to come to hold it — so that
				 * one goes to the server, and happens at once, as uploading
				 * a pin does.
				 */
				pickFromLibrary(image: LibraryImage): void {
					const target = store.libraryTarget();

					if (!target) {
						return;
					}

					if (target === 'pin') {
						adoptLibraryImage(of(image));

						return;
					}

					patchForm({ [target]: image.filePath });
					patchState(store, { libraryTarget: null });
				},

				/**
				 * Draws candidates. Each one is filed the moment it exists and
				 * joins the gallery, but none of them becomes the badge until
				 * an admin picks it — so a bad draw is never a pin, and a good
				 * one is never lost. The collection must be saved first: the
				 * server builds the prompt from what is stored, not from the
				 * form.
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
							})
						),
						exhaustMap(() =>
							effect.generateBadge$(
								store.uid() as string,
								store.curatedPoints() ?? store.derivedPoints()
							)
						),
						tapResponse({
							next: (draw: GenerateBadgeResult) => {
								// A szerver már beírta őket a galériába; itt
								// csak a végére fűzzük, hogy ne kelljen
								// újratölteni a definíciót.
								const badgeGallery = [
									...store.badgeGallery(),
									...draw.candidates,
								];

								patchState(store, {
									badgeGallery,
									isGeneratingBadge: false,
								});
								offerGallery(of(badgeGallery));
							},
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

				/** Marks one image of the gallery as the collection's pin. */
				pickBadge: rxMethod<BadgeImage>(
					pipe(
						filter(() => !!store.uid() && !store.isPickingBadge()),
						tap(() =>
							patchState(store, {
								isPickingBadge: true,
								error: null,
							})
						),
						exhaustMap((image) =>
							effect
								// A kép a rajzolás óta fájl: elég megmondani,
								// melyik legyen a jelvény.
								.setBadgeImage$(
									store.uid() as string,
									image.documentUid
								)
								.pipe(map(() => image))
						),
						tapResponse({
							next: (image: BadgeImage) =>
								patchState(store, {
									badgeImageUrl: image.filePath,
									badgeImageUid: image.documentUid,
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

				/**
				 * Takes the pin off. The gallery is left alone — the image
				 * stays among the ones on offer — so what changes is only
				 * which picture the badge wears: with no pin, the hand-made
				 * artwork is the badge.
				 */
				clearBadgeImage: rxMethod<void>(
					pipe(
						filter(
							() =>
								!!store.uid() &&
								!!store.badgeImageUid() &&
								!store.isPickingBadge()
						),
						tap(() =>
							patchState(store, {
								isPickingBadge: true,
								error: null,
							})
						),
						exhaustMap(() =>
							effect.setBadgeImage$(store.uid() as string, null)
						),
						tapResponse({
							next: () =>
								patchState(store, {
									badgeImageUrl: null,
									badgeImageUid: null,
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
			store.loadStyles(of(undefined));
		},
	})
);
