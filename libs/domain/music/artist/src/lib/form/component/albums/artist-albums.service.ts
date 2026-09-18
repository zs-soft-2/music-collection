import { Observable, combineLatest, firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { Injectable, inject, signal } from '@angular/core';
import {
	AlbumEntity,
	ArtistEntity,
	ArtistExternalAlbum,
	ArtistStateService,
	ArtistUtilService,
} from '@music-collection/api';

/** One album found online, not yet in the catalog. */
export interface ArtistExternalAlbumRow {
	album: ArtistExternalAlbum;
	/** Whether the album is created on apply. */
	selected: boolean;
}

export interface ArtistAlbumsParams {
	albums: AlbumEntity[];
	artist: ArtistEntity | undefined;
}

/** Name for matching albums: case, spaces and punctuation left out. */
const albumKey = (name: string): string =>
	name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

@Injectable()
export class ArtistAlbumsService {
	private artistStateService = inject(ArtistStateService);
	private artistUtilService = inject(ArtistUtilService);

	private params: ArtistAlbumsParams = { albums: [], artist: undefined };

	public readonly externalAlbums = signal<ArtistExternalAlbumRow[] | null>(
		null
	);
	public readonly externalError = signal<string | null>(null);
	public readonly externalLoading = signal(false);

	public init$(artistId: string): Observable<ArtistAlbumsParams> {
		if (!artistId) {
			return of(this.params);
		}
		this.artistStateService.dispatchListAlbumsByIdAction(artistId);

		return combineLatest([
			this.artistStateService.selectEntityById$(artistId),
			this.artistStateService.selectAlbumsById$(artistId),
		]).pipe(
			map(([artist, albums]) => {
				this.params = {
					albums: albums
						.filter((album) => album.artist?.uid === artistId)
						.sort(
							(a, b) =>
								(a.year?.getTime() ?? 0) -
								(b.year?.getTime() ?? 0)
						),
					artist,
				};

				return this.params;
			})
		);
	}

	/** Creates the selected albums. */
	public applyExternal(): void {
		const artist = this.params.artist;
		const rows = this.externalAlbums();
		if (!artist || !rows) {
			return;
		}
		const albums = rows
			.filter((row) => row.selected)
			.map((row) =>
				this.artistUtilService.createAlbumFromExternal(
					artist,
					row.album
				)
			);
		if (albums.length) {
			this.artistStateService.dispatchAddAlbumsAction(albums);
		}
		this.externalAlbums.set(null);
	}

	public closeExternal(): void {
		this.externalAlbums.set(null);
	}

	/** Looks the artist's albums up online, keeping those not in the catalog. */
	public async loadExternal(): Promise<void> {
		const name = this.params.artist?.name?.trim();
		if (!name || this.externalLoading()) {
			return;
		}
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			const found = await firstValueFrom(
				this.artistStateService.fetchExternalAlbums$(name)
			);
			const known = new Set(
				this.params.albums.map((album) => albumKey(album.name))
			);
			const seen = new Set<string>();
			const rows = found
				.filter((album) => {
					const key = albumKey(album.name);
					if (known.has(key) || seen.has(key)) {
						return false;
					}
					seen.add(key);

					return true;
				})
				.map((album) => ({ album, selected: true }));

			if (!found.length) {
				this.externalError.set(`No albums found for "${name}".`);
			} else {
				this.externalAlbums.set(rows);
			}
		} catch (error) {
			console.error(error);
			this.externalError.set('Loading albums failed.');
		} finally {
			this.externalLoading.set(false);
		}
	}

	public toggleExternalRow(row: ArtistExternalAlbumRow): void {
		this.externalAlbums.update(
			(rows) =>
				rows &&
				rows.map((item) =>
					item === row ? { ...item, selected: !item.selected } : item
				)
		);
	}

	public toggleAllExternalRows(selected: boolean): void {
		this.externalAlbums.update(
			(rows) => rows && rows.map((row) => ({ ...row, selected }))
		);
	}
}
