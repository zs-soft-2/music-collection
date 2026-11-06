import { of, pipe, switchMap } from 'rxjs';

import { computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { AlbumEntity } from '@music-collection/api';
import { tapResponse } from '@ngrx/operators';
import {
	patchState,
	signalStoreFeature,
	type,
	withComputed,
	withMethods,
	withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';

import {
	AlbumRating,
	AlbumRatingSummary,
	RatedAlbum,
	RatingEffect,
	communityVoice,
	ratingFor,
} from '../../../data/rating';
import { albumOf } from './album-page.helpers';

interface AlbumRatingState {
	/** The collector's own verdicts; empty while signed out. */
	ratings: AlbumRating[];
	/** What everybody together said about this record; null while nobody did. */
	ratingSummary: AlbumRatingSummary | null;
	/** A verdict is on its way; the stars wait rather than lie about it. */
	ratingWriting: boolean;
	ratingError: string | null;
}

const initialState: AlbumRatingState = {
	ratings: [],
	ratingSummary: null,
	ratingWriting: false,
	ratingError: null,
};

/**
 * The collector's stars for the album shown, and what everybody else makes
 * of it. The verdict is the collector's own; the community voice follows the
 * album, not the page, since one page is reused from album to album.
 */
export function withAlbumRating() {
	return signalStoreFeature(
		{
			state: type<{
				albumId: string | null;
				albums: AlbumEntity[];
				userId: string | null;
			}>(),
		},
		withState(initialState),
		withComputed((store) => ({
			/** The collector's own verdict on this record; null while unjudged. */
			myRating: computed(() =>
				ratingFor(store.ratings(), store.albumId())
			),
			/**
			 * What everybody else makes of it, once enough collectors have said
			 * so. Null is the usual answer and not a failure: most records are
			 * rated by nobody, or by too few to call it a crowd.
			 */
			community: computed(() =>
				communityVoice(
					store.ratingSummary(),
					ratingFor(store.ratings(), store.albumId())?.stars ?? null
				)
			),
			/** Signed out there is nobody to keep a verdict for. */
			canRate: computed(() => !!store.userId()),
		})),
		withMethods((store, ratingEffect = inject(RatingEffect)) => {
			const albumId$ = toObservable(store.albumId);

			/**
			 * The record as a verdict names it. The title and the artist travel
			 * into the document, so a top list on a shared profile reads as
			 * sentences to a visitor who has no catalog.
			 */
			const ratedAlbum = (): RatedAlbum | null => {
				const album = albumOf(store.albums(), store.albumId());

				return album
					? {
							albumId: album.uid,
							albumTitle: album.name,
							artistName: album.artist?.name ?? null,
							artistId: album.artist?.uid ?? null,
						}
					: null;
			};

			const write = async (
				run: (album: RatedAlbum) => Promise<void>
			): Promise<void> => {
				const album = ratedAlbum();

				if (!album || !store.canRate() || store.ratingWriting()) {
					return;
				}

				patchState(store, { ratingWriting: true, ratingError: null });

				try {
					await run(album);
				} catch (error) {
					console.error('Verdict not kept', error);
					patchState(store, {
						ratingError:
							error instanceof Error
								? error.message
								: String(error),
					});
				} finally {
					patchState(store, { ratingWriting: false });
				}
			};

			return {
				/** The collector's own verdicts; follows sign-in. */
				loadRatings: rxMethod<void>(
					pipe(
						switchMap(() =>
							ratingEffect.list$().pipe(
								tapResponse({
									next: (ratings: AlbumRating[]) =>
										patchState(store, { ratings }),
									error: (error) => console.error(error),
								})
							)
						)
					)
				),
				/**
				 * Everybody's stars for the record shown. It follows the album
				 * rather than the page: moving to another album of the artist
				 * reuses this page, and the old average would otherwise stand
				 * under the new record.
				 */
				watchRatingSummary: rxMethod<void>(
					pipe(
						switchMap(() => albumId$),
						switchMap((albumId) =>
							(albumId
								? ratingEffect.summary$(albumId)
								: of(null)
							).pipe(
								tapResponse({
									next: (
										ratingSummary: AlbumRatingSummary | null
									) => patchState(store, { ratingSummary }),
									error: (error) => console.error(error),
								})
							)
						)
					)
				),
				/** Gives the record its stars, keeping whatever note stands. */
				rate(stars: number): Promise<void> {
					const note = store.myRating()?.note ?? null;

					return write((album) =>
						ratingEffect.rate(album, { stars, note })
					);
				},
				/**
				 * Writes the line about why. Nothing to write it next to is
				 * nothing to write: the note belongs to a verdict.
				 */
				writeRatingNote(note: string): Promise<void> {
					const stars = store.myRating()?.stars;

					return stars
						? write((album) =>
								ratingEffect.rate(album, { stars, note })
							)
						: Promise.resolve();
				},
				/** Leaves the record unjudged again rather than poor. */
				clearRating(): Promise<void> {
					return write((album) => ratingEffect.clear(album.albumId));
				},
			};
		})
	);
}
