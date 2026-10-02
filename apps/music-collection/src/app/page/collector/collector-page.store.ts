import { map, of, pipe, switchMap, tap } from 'rxjs';

import { inject } from '@angular/core';
import { AuthenticationStateService } from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import { computed } from '@angular/core';
import {
	patchState,
	signalStore,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import {
	CollectorAlbumsDocument,
	CollectorProfileEffect,
} from '../../data/collector-profile';

import { CollectorAlbumsView, CollectorView } from './collector.model';
import {
	toCollectorAlbums,
	toCollectorCardView,
	toCollectorView,
} from './collector.mapper';

interface CollectorPageState {
	/** The page as it is drawn, or null while there is nothing to draw. */
	view: CollectorView | null;
	loading: boolean;
	/** Whose page this is, out of the address. */
	uid: string;
	/** Who is reading, where anybody is signed in. */
	visitorUid: string | null;
	/**
	 * The whole shelf, which is a second document and a second read — so it
	 * is only fetched when a visitor asks to see it.
	 */
	albums: CollectorAlbumsView | null;
	albumsLoading: boolean;
}

const initialState: CollectorPageState = {
	view: null,
	loading: true,
	uid: '',
	visitorUid: null,
	albums: null,
	albumsLoading: false,
};

/**
 * One collector's public page.
 *
 * Deliberately the thinnest store in the app: it reads one document and maps
 * it. Nothing here asks for the catalog — not an album, not an artist, not a
 * sync — because a visitor who followed a link has no catalog cached, and
 * fetching one would turn a single read into megabytes of bundle for a page
 * that already carries every title, cover and name it draws.
 *
 * That is also why nothing on this page links into the catalog: a cover opens
 * nothing, because opening it is what would cost the visit its promise.
 */
export const CollectorPageStore = signalStore(
	withState(initialState),
	withComputed((store) => ({
		isAuthenticated: computed(() => !!store.visitorUid()),
		/**
		 * Whether the reader is looking at their own page. Computed rather
		 * than stored, so it holds whichever arrives last — the address or
		 * the sign-in.
		 */
		isSelf: computed(
			() => !!store.visitorUid() && store.visitorUid() === store.uid()
		),
	})),
	withMethods(
		(
			store,
			profiles = inject(CollectorProfileEffect),
			authentication = inject(AuthenticationStateService)
		) => ({
			/**
			 * The page of the collector the address names.
			 *
			 * The shelf first, and the directory entry only where there is no
			 * shelf: a collector who showed a hunt without publishing their
			 * records still has a page worth opening, and that second read is
			 * made only for them — a shared page carries its own hunts
			 * already.
			 */
			load: rxMethod<string>(
				pipe(
					tap((uid) => patchState(store, { uid, loading: true })),
					switchMap((uid) =>
						uid
							? profiles
									.profile$(uid)
									.pipe(
										switchMap((profile) =>
											profile
												? of(toCollectorView(profile))
												: profiles
														.card$(uid)
														.pipe(
															map(
																toCollectorCardView
															)
														)
										)
									)
							: of(null)
					),
					tapResponse({
						next: (view: CollectorView | null) =>
							patchState(store, { view, loading: false }),
						error: (error) => {
							console.error('Collector page not read', error);
							patchState(store, { view: null, loading: false });
						},
					})
				)
			),

			/**
			 * Who is reading. Only to word the invitation: a visitor is asked
			 * to start their own shelf, and the owner is told this is how
			 * theirs looks from outside.
			 */
			watchVisitor: rxMethod<void>(
				pipe(
					switchMap(() => authentication.selectAuthenticatedUser$()),
					tap((user) =>
						patchState(store, {
							visitorUid: user?.uid ?? null,
						})
					)
				)
			),

			/**
			 * The rest of the shelf. One more read, made on a click rather
			 * than on arrival: most visits are here for the page, and the
			 * list is a few hundred kilobytes of records with no covers.
			 */
			showAlbums: rxMethod<void>(
				pipe(
					tap(() => patchState(store, { albumsLoading: true })),
					switchMap(() =>
						store.uid() ? profiles.albums$(store.uid()) : of(null)
					),
					tapResponse({
						next: (albums: CollectorAlbumsDocument | null) =>
							patchState(store, {
								albums: toCollectorAlbums(albums),
								albumsLoading: false,
							}),
						error: (error) => {
							console.error('Collector shelf not read', error);
							patchState(store, { albumsLoading: false });
						},
					})
				)
			),

			login(): void {
				authentication.dispatchLogin();
			},
		})
	)
);
