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
				])
			),
			switchMap(([album, artists]) => {
				this.album = album;
				this.params = this.createAlbumParams(album, artists);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchArtist(query: string): void {
		this.artistStateService.dispatchSearch(query);
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
		artists: ArtistEntity[]
	): AlbumFormParams {
		const formGroup = this.albumUtilService.createFormGroup(album);

		const albumFormParams: AlbumFormParams = {
			artists,
			formGroup,
			styleList: StyleList,
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
