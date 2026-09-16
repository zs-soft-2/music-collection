import { of, pipe, switchMap, tap } from 'rxjs';

import { computed, inject } from '@angular/core';
import {
	WishlistItemEntity,
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

import { FORMAT_LABELS, MediaFormat, ReleaseView } from '../../shared/music-ui';

export type WishlistFormatFilter = MediaFormat | 'all';

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
	entries: WishlistEntryView[];
	isLoading: boolean;
	query: string;
	format: WishlistFormatFilter;
	showFound: boolean;
}

const initialState: WishlistPageState = {
	entries: [],
	isLoading: true,
	query: '',
	format: 'all',
	showFound: false,
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
		const searched = computed(() => {
			const query = store.query().trim().toLowerCase();

			return store
				.entries()
				.filter((entry) => store.showFound() || entry.isActive)
				.filter(
					(entry) =>
						!query ||
						entry.release.title.toLowerCase().includes(query) ||
						entry.release.artistName.toLowerCase().includes(query)
				);
		});

		return {
			visible: computed(() =>
				searched()
					.filter(
						(entry) =>
							store.format() === 'all' ||
							entry.formats.includes(
								store.format() as MediaFormat
							)
					)
					.sort(
						(a, b) =>
							a.release.artistName.localeCompare(
								b.release.artistName
							) || a.release.title.localeCompare(b.release.title)
					)
			),
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
				wanted: store.entries().filter((entry) => entry.isActive)
					.length,
				found: store.entries().filter((entry) => !entry.isActive)
					.length,
				artists: new Set(
					store
						.entries()
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
			wishlistItemStateService = inject(WishlistItemStateService)
		) => ({
			load: rxMethod<void>(
				pipe(
					tap(() => {
						patchState(store, { isLoading: true });
						wishlistItemStateService.dispatchListEntitiesAction();
					}),
					switchMap(() =>
						wishlistItemStateService.selectEntities$().pipe(
							tapResponse({
								next: (items: WishlistItemEntity[]) =>
									patchState(store, {
										entries: (items ?? []).map(
											toWishlistEntryView
										),
										isLoading: false,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, { isLoading: false });
								},
							})
						)
					)
				)
			),
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
		},
	})
);
