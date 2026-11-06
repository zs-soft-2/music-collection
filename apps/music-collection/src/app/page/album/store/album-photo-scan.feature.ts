import { filter, from, pipe, switchMap, tap } from 'rxjs';

import { type Signal, computed, inject } from '@angular/core';
import type { ReleaseRequest, ScanCandidate } from '@music-collection/api';
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

import { PhotoScanEffect, PreparedPhoto } from '../../../data/photo-scan';
import { AlbumProfileView, toPhotoVersionViews } from '../album.mapper';
import { describeScanError, keepPhoto } from './album-page.helpers';
import { requestedPressings } from './album-release-request.feature';

interface AlbumPhotoScanState {
	/**
	 * Identifying the pressing from a photo of it. The album is known here,
	 * so only the pressing is in question — which is exactly the part the
	 * catalog and the Discogs list cannot always answer.
	 */
	photoScanning: boolean;
	photoError: string | null;
	photoCandidates: ScanCandidate[];
	/**
	 * The photo as it was sent. Kept so a failed scan can be retried with
	 * the same picture — an overloaded reader is no reason to make the
	 * collector photograph the record again.
	 */
	photo: PreparedPhoto | null;
	/** A photo was scanned — tells "nothing found" from "not tried". */
	photoScanned: boolean;
}

const initialState: AlbumPhotoScanState = {
	photoScanning: false,
	photoError: null,
	photoCandidates: [],
	photo: null,
	photoScanned: false,
};

/** A new picture, or `'again'`: the one already taken, sent once more. */
type PhotoScanInput = Blob | 'again';

/**
 * Telling the pressing from a photo of the record, in the picker. The album
 * is known here, so the photo only has to give up what tells two pressings
 * of it apart.
 */
export function withAlbumPhotoScan() {
	return signalStoreFeature(
		{
			state: type<{ requests: ReleaseRequest[] }>(),
			props: type<{ album: Signal<AlbumProfileView | null> }>(),
		},
		withState(initialState),
		withComputed((store) => ({
			/** The pressings a photo found, as picker options. */
			photoOptions: computed(() =>
				toPhotoVersionViews(
					store.photoCandidates(),
					requestedPressings(store.requests())
				)
			),
			/** The photo being scanned, to show it while it is read. */
			photoPreviewUrl: computed(() => store.photo()?.previewUrl ?? null),
		})),
		withMethods((store, photoScanEffect = inject(PhotoScanEffect)) => ({
			/**
			 * Identifies the pressing from a photo of the record. The album
			 * is known here, so the search starts from it: the photo only has
			 * to give up the catalogue number or the barcode, which is what
			 * tells two pressings of the same album apart.
			 */
			scanPressingPhoto: rxMethod<PhotoScanInput>(
				pipe(
					filter(
						(input) =>
							!store.photoScanning() &&
							(input !== 'again' || !!store.photo())
					),
					tap(() =>
						patchState(store, {
							photoScanning: true,
							photoError: null,
							photoCandidates: [],
						})
					),
					switchMap((input) =>
						from(
							input === 'again'
								? Promise.resolve(
										store.photo() as PreparedPhoto
									)
								: photoScanEffect.prepare(input).catch(() => {
										// A format the browser cannot decode
										// (an untouched iPhone HEIC, say)
										// fails here, not at the lookup — say
										// so instead of blaming the server.
										throw new Error('unreadable-photo');
									})
						).pipe(
							tap((photo) => keepPhoto(store, photo)),
							switchMap((photo) => {
								const album = store.album();

								return photoScanEffect.identify$(
									photo,
									album
										? {
												name: album.title,
												artistName: album.artistName,
											}
										: null
								);
							}),
							tapResponse({
								next: (result) =>
									patchState(store, {
										photoCandidates: result.candidates,
										photoScanning: false,
										photoScanned: true,
									}),
								error: (error) => {
									console.error(error);
									patchState(store, {
										photoScanning: false,
										photoScanned: true,
										photoError:
											(error as Error)?.message ===
											'unreadable-photo'
												? 'This image could not be read. Try a JPEG or PNG — an iPhone photo may need to be shared as a picture first.'
												: describeScanError(error),
									});
								},
							})
						)
					)
				)
			),
		}))
	);
}
