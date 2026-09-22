import { Observable, combineLatest, filter, map, of, tap } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import {
	AlbumEntity,
	AlbumStateService,
	CollectionItemEntity,
	CollectionItemStateService,
	isSpotifyAlbumId,
	isYoutubePlaylistId,
	isYoutubeVideoId,
} from '@music-collection/api';
import { MusicCollectionEffect } from '@music-collection/domain/music-collection/core';

import {
	RADIO_LENGTH,
	RadioRecordName,
	RadioStation,
	TASTE_STYLES,
} from './radio.model';
import {
	RadioAlbum,
	ShelfCopy,
	byTaste,
	distinct,
	newest,
	onShelf,
	shuffle,
	styleWeights,
} from './radio-picks';

/** An album the app could put on at all, whichever source ends up playing it. */
const isPlayable = (album: AlbumEntity): boolean =>
	isSpotifyAlbumId(album.spotifyAlbumId ?? null) ||
	isYoutubePlaylistId(album.youtubePlaylistId ?? null) ||
	(album.youtubeVideoIds ?? []).some(isYoutubeVideoId);

const toRadioAlbum = (album: AlbumEntity): RadioAlbum => ({
	uid: album.uid,
	styles: album.styles ?? [],
	// A year is a poor stand-in for when the catalog got the record, but it
	// is what a document written before the sync stamps existed can offer.
	addedAt: album.updatedAt ?? album.year?.getTime() ?? 0,
});

const toShelfCopy = (item: CollectionItemEntity): ShelfCopy | null => {
	const albumUid = item.release?.album?.uid;

	return albumUid
		? {
				albumUid,
				placement: item.placement ?? null,
				addedAt: item.date?.getTime?.() ?? 0,
			}
		: null;
};

/**
 * What a radio station plays: a list of album ids, in the order they go on.
 *
 * Every station reads the catalog and the shelf the app already holds, so
 * tuning in costs a pass over memory rather than a query. What a station may
 * reach for is decided by the caller — the player knows which records it can
 * actually put on, and a station that offered the rest would only fall
 * silent on them.
 */
@Injectable({ providedIn: 'root' })
export class RadioEffect {
	private readonly albumStateService = inject(AlbumStateService);
	private readonly collectionItemStateService = inject(
		CollectionItemStateService
	);
	private readonly musicCollectionEffect = inject(MusicCollectionEffect);

	public albums$(
		station: RadioStation,
		playable: ReadonlySet<string>
	): Observable<string[]> {
		const keep = (uids: string[]) =>
			uids.filter((uid) => playable.has(uid)).slice(0, RADIO_LENGTH);

		switch (station.kind) {
			case 'new':
				return this.catalog$().pipe(
					map((albums) => keep(newest(albums, RADIO_LENGTH * 2)))
				);
			case 'random':
				return this.catalog$().pipe(
					map((albums) =>
						keep(shuffle(albums).map((album) => album.uid))
					)
				);
			case 'taste':
				return combineLatest([this.catalog$(), this.owned$()]).pipe(
					map(([albums, copies]) =>
						keep(
							byTaste(
								albums,
								styleWeights(
									this.stylesOf(copies),
									TASTE_STYLES
								),
								RADIO_LENGTH * 2
							)
						)
					)
				);
			case 'shelf':
				return this.owned$().pipe(
					map((copies) =>
						keep(
							onShelf(
								copies
									.map(toShelfCopy)
									.filter(
										(copy): copy is ShelfCopy => !!copy
									),
								station
							)
						)
					)
				);
			case 'collection':
				return station.slug
					? this.musicCollectionEffect
							.loadStanding$(station.slug)
							.pipe(
								map((standing) =>
									keep(
										shuffle(
											distinct(
												(
													standing?.resolved.albums ??
													[]
												).map((album) => album.albumUid)
											)
										)
									)
								)
							)
					: of([]);
		}
	}

	/**
	 * The catalog's records by id, for a page that wants to say which ones a
	 * station would put on rather than only how many.
	 */
	public names$(): Observable<Map<string, RadioRecordName>> {
		return this.albumStateService.selectEntities$().pipe(
			map(
				(albums) =>
					new Map(
						(albums ?? []).map((album) => [
							album.uid,
							{
								albumTitle: album.name,
								artistName: album.artist?.name ?? null,
							},
						])
					)
			)
		);
	}

	/**
	 * Every album the catalog could play, as the stations weigh them. The
	 * catalog is asked for while it is empty and nothing is said until it has
	 * arrived: a station chosen out of nothing would be an empty station.
	 */
	private catalog$(): Observable<RadioAlbum[]> {
		return this.albumStateService.selectEntities$().pipe(
			tap((albums) => {
				if (!albums?.length) {
					this.albumStateService.dispatchListEntitiesAction();
				}
			}),
			filter((albums) => albums?.length > 0),
			map((albums) => albums.filter(isPlayable).map(toRadioAlbum))
		);
	}

	/** The copies still on the collector's shelf; empty while signed out. */
	private owned$(): Observable<CollectionItemEntity[]> {
		return this.collectionItemStateService.selectLoadedEntities$();
	}

	/** The styles standing on the shelf, one entry per copy. */
	private stylesOf(copies: CollectionItemEntity[]): { styles: string[] }[] {
		return copies.map((item) => ({
			styles: item.release?.album?.styles ?? [],
		}));
	}
}
