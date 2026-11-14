import { Observable, filter, tap } from 'rxjs';

import type { Signal } from '@angular/core';
import type { AlbumEntity, CollectionItemEntity } from '@music-collection/api';
import { WritableStateSource, patchState } from '@ngrx/signals';

import { CopySerialTakenError } from '../../../data/copy-serial';
import { PreparedPhoto, scanQuotaMessage } from '../../../data/photo-scan';

/** The album the page is open on, as the catalog has it. */
export function albumOf(
	albums: AlbumEntity[],
	albumId: string | null
): AlbumEntity | undefined {
	return albums.find((album) => album.uid === albumId);
}

/** A release is collected once: a copy of it is already owned. */
export function ownsRelease(
	ownedItems: CollectionItemEntity[],
	releaseId: string | undefined
): boolean {
	return (
		!!releaseId &&
		ownedItems.some((item) => item.release?.uid === releaseId)
	);
}

/** What the collector reads when the number is already spoken for. */
export function toSerialError(error: unknown): string {
	if (error instanceof CopySerialTakenError) {
		return error.conflict === 'mine'
			? 'You have already registered this number on another copy.'
			: 'Another collector has registered this copy. If it is the one in your hands, check the number on it.';
	}
	console.error(error);

	return 'The number could not be checked just now. Try again.';
}

/** What the collector reads when a request or a Discogs lookup fails. */
export function describeError(error: unknown): string {
	const code = (error as { code?: string })?.code ?? '';

	if (code.endsWith('resource-exhausted')) {
		return 'Discogs is busy right now. Try again in a minute.';
	}
	if (code.endsWith('not-found')) {
		return 'This album was not found on Discogs.';
	}
	if (code.endsWith('permission-denied')) {
		return 'You are not allowed to do this.';
	}
	if (code.endsWith('unavailable')) {
		return 'Discogs cannot be reached right now.';
	}
	return 'Something went wrong. Try again later.';
}

/**
 * What the collector reads when the photo scan fails. The source matters: a
 * busy photo reader is not an unreachable Discogs, and only one of the two
 * is worth retrying with the same picture.
 */
export function describeScanError(error: unknown): string {
	const { code = '', details } = (error ?? {}) as {
		code?: string;
		details?: { source?: string };
	};
	const quota = scanQuotaMessage(error);

	if (quota) {
		return quota;
	}
	if (details?.source === 'vision') {
		return code.endsWith('resource-exhausted')
			? 'The photo reader is busy right now. Try again in a moment.'
			: 'This photo could not be read. Try another one, or describe the pressing.';
	}

	return describeError(error);
}

type PhotoState = { photo: PreparedPhoto | null };
type PhotoHolder = WritableStateSource<PhotoState> & {
	photo: Signal<PreparedPhoto | null>;
};

/**
 * Holds on to the photo being scanned, releasing the preview of the one
 * before it — an object URL lives until it is revoked, and a collector who
 * photographs a shelf-full of records would leak one per record.
 */
export function keepPhoto(
	store: PhotoHolder,
	photo: PreparedPhoto | null
): void {
	const previous = store.photo();

	if (previous && previous !== photo) {
		URL.revokeObjectURL(previous.previewUrl);
	}

	patchState(store, { photo });
}

/** Selects a feature's entities and requests the list while it is empty. */
export function entities$<T>(
	select: () => Observable<T[]>,
	dispatchList: () => void
): Observable<T[]> {
	return select().pipe(
		tap((items) => {
			if (!items?.length) {
				dispatchList();
			}
		}),
		filter((items) => items?.length > 0)
	);
}
