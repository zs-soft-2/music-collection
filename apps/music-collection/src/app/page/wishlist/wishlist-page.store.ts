import { combineLatest, of, pairwise, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	AuthenticationStateService,
	EntityTypeEnum,
	RoleNames,
	WishlistItemEntity,
	WishlistItemEntityUpdate,
	WishlistItemPermissionsService,
	WishlistItemStateService,
} from '@music-collection/api';
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
import { NgxPermissionsService } from 'ngx-permissions';

import { FORMAT_LABELS, MediaFormat, ReleaseView } from '../../shared/music-ui';

export type WishlistFormatFilter = MediaFormat | 'all';

/** Cards per render chunk of the grid (see `chunks`). */
const RENDER_CHUNK_SIZE = 30;

/** One wanted album: the card view plus what the wishlist adds to it. */
export interface WishlistEntryView {
	id: string;
	release: ReleaseView;
	/** Every medium the user would accept. */
	formats: MediaFormat[];
	shopUrl: string | null;
	isActive: boolean;
}

interface WishlistPageState {
	/** The signed-in user's own wanted albums. */
	items: WishlistItemEntity[];
	isLoading: boolean;
	query: string;
	format: WishlistFormatFilter;
	showFound: boolean;
	/** The item whose found state is being written. */
	changingId: string | null;
	changeError: string | null;
	/** Who is signed in; a guest has no wishlist of their own. */
	userId: string | null;
	/** May change their own wanted albums (mark them found). */
	canEdit: boolean;
}

const initialState: WishlistPageState = {
	items: [],
	isLoading: true,
	query: '',
	format: 'all',
	showFound: false,
	changingId: null,
	changeError: null,
	userId: null,
	canEdit: false,
};

const FORMAT_ORDER: MediaFormat[] = ['vinyl', 'cd', 'cassette', 'dvd', 'other'];

function toFormat(media: string): MediaFormat {
	return media in FORMAT_LABELS ? (media as MediaFormat) : 'other';
}

function safeUrl(url: string | undefined | null): string | null {
	return url && /^https?:\/\//i.test(url.trim()) ? url.trim() : null;
}

export function toWishlistEntryView(
	item: WishlistItemEntity
): WishlistEntryView {
	const formats = (item.medias ?? [])
		.filter((media) => media !== 'all')
		.map(toFormat)
		.sort((a, b) => FORMAT_ORDER.indexOf(a) - FORMAT_ORDER.indexOf(b));

	return {
		id: item.uid,
		formats,
		shopUrl: safeUrl(item.sourceLink),
		isActive: item.isActive !== false,
		release: {
			id: item.uid,
			albumId: item.albumReference?.uid ?? '',
			releaseId: null,
			title: item.albumReference?.name ?? 'Unknown album',
			artistId: item.artistReference?.uid ?? '',
			artistName: item.artistReference?.name ?? 'Unknown artist',
			coverUrl: item.albumReference?.coverImage?.filePath || null,
			format: formats[0] ?? 'other',
			albumType: null,
			year: null,
			styles: [],
			editions: [],
			weight: null,
			boxSet: false,
			pictureDisc: false,
			addedAt: 0,
			labelName: null,
			country: null,
		},
	};
}

/** Wishlist page state: the wanted albums with search and format filter. */
export const WishlistPageStore = signalStore(
	withState(initialState),
	withComputed((store) => {
		const entries = computed(() => store.items().map(toWishlistEntryView));

		const searched = computed(() => {
			const query = store.query().trim().toLowerCase();

			return entries()
				.filter((entry) => store.showFound() || entry.isActive)
				.filter(
					(entry) =>
						!query ||
						entry.release.title.toLowerCase().includes(query) ||
						entry.release.artistName.toLowerCase().includes(query)
				);
		});

		const visible = computed(() =>
			searched()
				.filter(
					(entry) =>
						store.format() === 'all' ||
						entry.formats.includes(store.format() as MediaFormat)
				)
				.sort(
					(a, b) =>
						a.release.artistName.localeCompare(
							b.release.artistName
						) || a.release.title.localeCompare(b.release.title)
				)
		);

		return {
			entries,
			visible,
			/**
			 * Cards per render chunk: the first chunk renders at once, the
			 * rest when they approach the viewport (`@defer`).
			 */
			chunks: computed(() => {
				const entries = visible();
				const chunks: WishlistEntryView[][] = [];

				for (let i = 0; i < entries.length; i += RENDER_CHUNK_SIZE) {
					chunks.push(entries.slice(i, i + RENDER_CHUNK_SIZE));
				}
				return chunks;
			}),
			formatCounts: computed(() =>
				FORMAT_ORDER.map((format) => ({
					format,
					label: FORMAT_LABELS[format],
					count: searched().filter((entry) =>
						entry.formats.includes(format)
					).length,
				})).filter((option) => option.count > 0)
			),
			stats: computed(() => ({
				wanted: entries().filter((entry) => entry.isActive).length,
				found: entries().filter((entry) => !entry.isActive).length,
				artists: new Set(
					entries()
						.filter((entry) => entry.isActive)
						.map((entry) => entry.release.artistId)
				).size,
			})),
			hasFilter: computed(
				() => store.query().trim() !== '' || store.format() !== 'all'
			),
		};
	}),
	withMethods(
		(
			store,
			wishlistItemStateService = inject(WishlistItemStateService),
			authenticationStateService = inject(AuthenticationStateService),
			permissionsService = inject(NgxPermissionsService)
		) => ({
			/** The signed-in user's own wanted albums; a guest has none. */
			load: rxMethod<void>(
				pipe(
					tap(() => {
						patchState(store, { isLoading: true });
						wishlistItemStateService.dispatchListOwnEntitiesAction();
					}),
					switchMap(() =>
						combineLatest([
							wishlistItemStateService.selectEntities$(),
							authenticationStateService.selectAuthenticatedUser$(),
							permissionsService.permissions$,
						]).pipe(
							tapResponse({
								next: ([items, user, permissions]: [
									WishlistItemEntity[],
									{ uid?: string } | null | undefined,
									Record<string, unknown>,
								]) => {
									const userId = user?.uid ?? null;

									patchState(store, {
										userId,
										canEdit:
											!!userId &&
											(WishlistItemPermissionsService.updateWishlistItemEntity in
												permissions ||
												RoleNames.ADMIN in permissions),
										// The list is a collection group: the
										// admin's view may hold other users'.
										items: (items ?? []).filter(
											(item) =>
												!!userId &&
												item.userReference?.uid ===
													userId
										),
										isLoading: false,
									});
								},
								error: (error) => {
									console.error(error);
									patchState(store, { isLoading: false });
								},
							})
						)
					)
				)
			),
			/** Follows the write; the card stops waiting once it is saved. */
			watchChange: rxMethod<void>(
				pipe(
					switchMap(() =>
						combineLatest([
							wishlistItemStateService.selectUpdating$(),
							wishlistItemStateService.selectError$(),
						])
					),
					pairwise(),
					tap(([[wasUpdating], [updating, error]]) => {
						if (wasUpdating && !updating) {
							patchState(store, {
								changingId: null,
								changeError: error,
							});
						}
					})
				)
			),
			/**
			 * Marks a wanted album found (it is in the collection now), or
			 * wanted again. The item stays on the wishlist either way.
			 */
			setFound(entryId: string, found: boolean): void {
				const item = store
					.items()
					.find((wanted) => wanted.uid === entryId);

				if (!item || !store.canEdit() || store.changingId()) {
					return;
				}

				const update: WishlistItemEntityUpdate = {
					entityType: EntityTypeEnum.WishlistItem,
					uid: item.uid,
					userReference: item.userReference,
					// The album keeps the item's search parameters; without it
					// the write would clear them.
					albumReference: item.albumReference,
					isActive: !found,
				};

				patchState(store, {
					changingId: entryId,
					changeError: null,
					// The card would vanish from a wanted-only list: show the
					// found ones, so the change is seen and can be undone.
					showFound: found || store.showFound(),
				});
				wishlistItemStateService.dispatchUpdateEntityAction(update);
			},
			setQuery: (query: string) => patchState(store, { query }),
			setFormat: (format: WishlistFormatFilter) =>
				patchState(store, { format }),
			toggleFound: () =>
				patchState(store, { showFound: !store.showFound() }),
			clearFilters: () => patchState(store, { query: '', format: 'all' }),
		})
	),
	withHooks({
		onInit(store) {
			store.load(of(undefined));
			store.watchChange(of(undefined));
		},
	})
);
