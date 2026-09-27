import { BehaviorSubject, EMPTY, Observable, map, of, shareReplay } from 'rxjs';

import { Injectable, inject, signal } from '@angular/core';
import {
	AlbumEntity,
	ArtistDataService,
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistExternalAlbum,
	ArtistExternalCandidate,
	ArtistExternalProfile,
	ArtistExternalQuery,
	ArtistStateService,
	ArtistUtilService,
} from '@music-collection/api';

import { OwnedArtistEffect } from './owned-artist.effect';

/**
 * The catalog's artist state, answered from the collector's own bands.
 *
 * The admin's artist form is a good form — the MusicBrainz lookup, the styles,
 * the duplicate warning, the picture picker — and a collector entering a band
 * the catalog has never heard of wants exactly that form. It talks to
 * `ArtistStateService`, so a page that swaps this one in gets the same form
 * writing somewhere else: `user/{uid}/owned-artist` instead of the catalog.
 *
 * Kept at the root rather than on the page, because the form navigates away
 * the moment it saves: a service living on the route would be torn down with
 * the page, and the error of a refused write would have nowhere to land.
 *
 * What the form does not ask for is not served. A collector's band has no
 * albums under it yet — that is the next piece of this — so those methods
 * answer with nothing rather than pretending.
 */
@Injectable({ providedIn: 'root' })
export class OwnedArtistStateService extends ArtistStateService {
	/**
	 * What the last write did, for the page to show. The form is fire and
	 * forget by design (`dispatch…`), so without this a refused write would
	 * look exactly like a saved one.
	 */
	public readonly lastError = signal<string | null>(null);

	/** The online lookup is the catalog's own and has nothing to do with where we write. */
	private readonly artistDataService = inject(ArtistDataService);
	private readonly effect = inject(OwnedArtistEffect);
	private readonly util = inject(ArtistUtilService);

	private readonly artists$: Observable<ArtistEntity[]> = this.effect
		.list$()
		.pipe(
			map((artists) =>
				artists.map((artist) => this.util.convertModelToEntity(artist))
			),
			shareReplay({ bufferSize: 1, refCount: false })
		);

	private readonly selectedEntityId$ = new BehaviorSubject<string>('');

	public dispatchAddEntityAction(entity: ArtistEntityAdd): void {
		this.write(
			this.effect.add$(this.util.convertEntityAddToModelAdd(entity))
		);
	}

	public dispatchDeleteEntityAction(entity: ArtistEntity): void {
		this.write(this.effect.remove$(this.util.convertEntityToModel(entity)));
	}

	public dispatchUpdateEntityAction(entity: ArtistEntityUpdate): void {
		this.write(
			this.effect.update$(
				this.util.convertEntityUpdateToModelUpdate(entity)
			)
		);
	}

	/** The list is a live stream; there is nothing to ask for. */
	public dispatchListEntitiesAction(): void {
		return;
	}

	public dispatchLoadEntitiesByIdsAction(): void {
		return;
	}

	public dispatchLoadEntityAction(): void {
		return;
	}

	public dispatchSearch(): void {
		return;
	}

	public dispatchSetSelectedEntityIdAction(entityId: string): void {
		this.selectedEntityId$.next(entityId);
	}

	public selectEntities$(): Observable<ArtistEntity[]> {
		return this.artists$;
	}

	public selectEntityById$(
		entityId: string
	): Observable<ArtistEntity | undefined> {
		return this.artists$.pipe(
			map((artists) => artists.find((artist) => artist.uid === entityId))
		);
	}

	public selectSelectedEntity$(): Observable<ArtistEntity | undefined> {
		return this.selectEntityById$(this.selectedEntityId$.value);
	}

	public selectSelectedEntityId$(): Observable<string> {
		return this.selectedEntityId$;
	}

	public selectSearchResult$(): Observable<ArtistEntity[]> {
		return this.artists$;
	}

	public isLoading$(): Observable<boolean> {
		return of(false);
	}

	/** The form's own button, which this page does not put up. */
	public dispatchChangeNewEntityButtonEnabled(): void {
		return;
	}

	public selectNewEntityButtonEnabled$(): Observable<boolean> {
		return of(true);
	}

	public dispatchSelectArtistAction(artist: ArtistEntity): void {
		this.dispatchSetSelectedEntityIdAction(artist.uid);
	}

	// ── The online lookup, as the catalog does it ───────────────────────────

	public fetchExternalAlbums$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalAlbum[]> {
		return this.artistDataService.fetchExternalAlbums$(query);
	}

	public fetchExternalProfile$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalProfile | null> {
		return this.artistDataService.fetchExternalProfile$(query);
	}

	public searchExternalArtists$(
		query: ArtistExternalQuery
	): Observable<ArtistExternalCandidate[]> {
		return this.artistDataService.searchExternalArtists$(query);
	}

	// ── Not served: a collector's band has nothing under it yet ─────────────

	public dispatchAddAlbumsAction(): void {
		return;
	}

	public dispatchListAlbumsByIdAction(): void {
		return;
	}

	public selectAlbumsById$(): Observable<AlbumEntity[]> {
		return EMPTY;
	}

	/**
	 * Runs the write and keeps whatever it says. The form has navigated away
	 * by the time an answer arrives, so nobody else is listening.
	 *
	 * The page shows a sentence a collector can read, which says nothing to
	 * whoever has to fix it — and a refused write is silent otherwise, because
	 * this is the only subscriber. So the error is also logged as it came:
	 * a missing permission and an offline browser look the same on the page.
	 */
	private write(write$: Observable<unknown>): void {
		this.lastError.set(null);
		write$.subscribe({
			error: (error: Error) => {
				console.error('An owned band was not saved', error);
				this.lastError.set(error?.message ?? 'failed');
			},
		});
	}
}
