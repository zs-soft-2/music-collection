import { Observable, combineLatest, firstValueFrom, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { Injectable, inject, signal } from '@angular/core';
import {
	AlbumEntity,
	ArtistEntity,
	ArtistExternalAlbum,
	ArtistExternalQuery,
	ArtistStateService,
	ArtistUtilService,
	MUSICBRAINZ_ARTIST_URL,
	toMusicBrainzId,
} from '@music-collection/api';

import {
	ArtistExternalCandidateRow,
	toCandidateRow,
} from '../artist-external-candidate';

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
	/**
	 * The namesake picked here, for as long as the tab is open. The artist
	 * itself carries no id yet — saving it on the details tab is what makes
	 * the choice outlast the page — but asking again on every load would be
	 * asking the same question twice.
	 */
	private pickedMusicBrainzId: string | null = null;

	public readonly externalAlbums = signal<ArtistExternalAlbumRow[] | null>(
		null
	);
	/** The namesakes to choose between; null while there is nothing to ask. */
	public readonly externalCandidates = signal<
		ArtistExternalCandidateRow[] | null
	>(null);
	/** The artist page the albums on screen came from, to check them by. */
	public readonly externalSourceUrl = signal<string | null>(null);
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

	/**
	 * Looks the artist's albums up online. The artist's MusicBrainz id names
	 * the artist outright; without one the name is searched on, and where
	 * several artists carry it the admin is asked which theirs is — the
	 * albums of a namesake are worse than none, and nothing in the list
	 * would tell them apart afterwards.
	 */
	public async loadExternal(): Promise<void> {
		const artist = this.params.artist;
		const name = artist?.name?.trim();
		if (!name || this.externalLoading()) {
			return;
		}
		const musicBrainzId =
			toMusicBrainzId(artist?.musicBrainzId) ?? this.pickedMusicBrainzId;
		if (musicBrainzId) {
			await this.runExternal(() => this.loadAlbums(name, musicBrainzId));

			return;
		}

		await this.runExternal(async () => {
			const candidates = await firstValueFrom(
				this.artistStateService.searchExternalArtists$(
					this.externalQuery(name)
				)
			);

			if (candidates.length > 1) {
				this.externalCandidates.set(candidates.map(toCandidateRow));
			} else {
				await this.loadAlbums(
					name,
					candidates[0]?.musicBrainzId ?? null
				);
			}
		});
	}

	/** Loads the albums of the namesake the admin picked. */
	public async chooseExternalCandidate(
		candidate: ArtistExternalCandidateRow
	): Promise<void> {
		if (this.externalLoading()) {
			return;
		}
		this.externalCandidates.set(null);
		this.pickedMusicBrainzId = candidate.musicBrainzId;

		await this.runExternal(() =>
			this.loadAlbums(candidate.name, candidate.musicBrainzId)
		);
	}

	public closeExternalCandidates(): void {
		this.externalCandidates.set(null);
	}

	/** What the artist knows to search and rank the namesakes by. */
	private externalQuery(name: string): ArtistExternalQuery {
		const artist = this.params.artist;

		return {
			country: artist?.country ?? null,
			musicBrainzId: artist?.musicBrainzId,
			name,
			styles: artist?.styles ?? [],
		};
	}

	/** The albums found for one artist, those the catalog has left out. */
	private async loadAlbums(
		name: string,
		musicBrainzId: string | null
	): Promise<void> {
		const found = await firstValueFrom(
			this.artistStateService.fetchExternalAlbums$({
				...this.externalQuery(name),
				musicBrainzId,
			})
		);
		this.externalSourceUrl.set(
			musicBrainzId ? `${MUSICBRAINZ_ARTIST_URL}/${musicBrainzId}` : null
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
	}

	/** One online step: the button waits on it and a failure is reported. */
	private async runExternal(step: () => Promise<void>): Promise<void> {
		this.externalLoading.set(true);
		this.externalError.set(null);
		try {
			await step();
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
