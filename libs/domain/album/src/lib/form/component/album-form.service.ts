import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumEntityAdd,
	AlbumEntityUpdate,
	AlbumFormParams,
	AlbumStateService,
	AlbumUtilService,
	ArtistEntity,
	ArtistStateService,
	DocumentEntity,
	DocumentStateService,
	EntityTypeEnum,
	SearchParams,
	StyleList,
} from '@music-collection/api';

@Injectable()
export class AlbumFormService {
	private album!: AlbumEntity | undefined;
	private params!: AlbumFormParams;
	private params$$: ReplaySubject<AlbumFormParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private albumStateService: AlbumStateService,
		private albumUtilService: AlbumUtilService,
		private artistStateService: ArtistStateService,
		private componentUtil: AlbumUtilService,
		private documentStateService: DocumentStateService,
		private router: Router
	) {
		this.params$$ = new ReplaySubject();
	}

	public cancel(): void {
		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<AlbumFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.albumStateService.selectEntityById$(data['albumId']),
					this.artistStateService.selectSearchResult$(),
					this.documentStateService.selectSearchResult$(),
				])
			),
			switchMap(([album, artists, documents]) => {
				this.album = album;
				this.params = this.createAlbumParams(album, artists, documents);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchArtist(term: string): void {
		const searchParams: SearchParams =
			this.albumUtilService.createSearchParams(
				EntityTypeEnum.Artist,
				term
			);

		this.artistStateService.dispatchSearch(searchParams);
	}

	public searchDocument(term: string): void {
		const searchParams: SearchParams =
			this.albumUtilService.createSearchParams(
				EntityTypeEnum.Document,
				term
			);

		this.documentStateService.dispatchSearch(searchParams);
	}

	public submit(): void {
		if (this.album) {
			this.updateAlbum();
		} else {
			this.addAlbum();
		}

		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	private addAlbum(): void {
		const album: AlbumEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.albumStateService.dispatchAddEntityAction(album);
	}

	private createAlbumParams(
		album: AlbumEntity | undefined,
		artists: ArtistEntity[],
		documents: DocumentEntity[]
	): AlbumFormParams {
		const formGroup = this.albumUtilService.createFormGroup(album);

		const albumFormParams: AlbumFormParams = {
			artists,
			documents,
			formGroup,
			styleList: StyleList,
			isImagesTabActive: !!album,
		};

		return albumFormParams;
	}

	private updateAlbum(): void {
		const album: AlbumEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.albumStateService.dispatchUpdateEntityAction(album);
	}
}
