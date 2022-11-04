import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseFormParams,
	ReleaseStateService,
	ReleaseUtilService,
	ArtistEntity,
	ArtistStateService,
	AlbumEntity,
	MediaList,
	FormatList,
	FormatDescriptionList,
	AlbumStateService,
	LabelStateService,
	LabelEntity,
	CountryList,
} from '@music-collection/api';
import { FormGroup } from '@angular/forms';

@Injectable()
export class ReleaseFormService {
	private formGroup!: FormGroup;
	private release!: ReleaseEntity | undefined;
	private params!: ReleaseFormParams;
	private params$$: ReplaySubject<ReleaseFormParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private releaseStateService: ReleaseStateService,
		private releaseUtilService: ReleaseUtilService,
		private albumStateService: AlbumStateService,
		private artistStateService: ArtistStateService,
		private componentUtil: ReleaseUtilService,
		private labelStateService: LabelStateService,
		private router: Router
	) {
		this.params$$ = new ReplaySubject();
	}

	public cancel(): void {
		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	public init$(): Observable<ReleaseFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.releaseStateService
						.selectEntityById$(data['releaseId'])
						.pipe(
							tap((release) => {
								this.formGroup =
									this.releaseUtilService.createFormGroup(
										release
									);
							})
						),
					this.artistStateService.selectSearchResult$(),
					this.albumStateService.selectSearchResult$(),
					this.labelStateService.selectSearchResult$(),
				])
			),
			switchMap(([release, artists, albums, labels]) => {
				this.release = release;
				this.params = this.createReleaseParams(
					artists,
					albums,
					labels,
					this.formGroup,
					!!artists?.length,
					!release
				);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchAlbum(query: string): void {
		this.albumStateService.dispatchSearch(query);
	}

	public searchArtist(query: string): void {
		this.artistStateService.dispatchSearch(query);
	}

	public searchLabel(query: string): void {
		this.labelStateService.dispatchSearch(query);
	}

	public submit(): void {
		if (this.release) {
			this.updateRelease();
		} else {
			this.addRelease();
		}

		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	private addRelease(): void {
		const release: ReleaseEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.releaseStateService.dispatchAddEntityAction(release);
	}

	private createReleaseParams(
		artists: ArtistEntity[],
		albums: AlbumEntity[],
		labels: LabelEntity[],
		formGroup: FormGroup,
		isAlbumsActive: boolean,
		isArtistsActive: boolean
	): ReleaseFormParams {
		const releaseFormParams: ReleaseFormParams = {
			artists,
			albums,
			countryList: CountryList,
			formGroup,
			isAlbumsActive,
			isArtistsActive,
			formatList: FormatList,
			formatDescriptionList: FormatDescriptionList,
			labels,
			mediaList: MediaList,
		};

		return releaseFormParams;
	}

	private updateRelease(): void {
		const release: ReleaseEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.releaseStateService.dispatchUpdateEntityAction(release);
	}
}
