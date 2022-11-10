import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
	AlbumEntity,
	AlbumStateService,
	ArtistEntity,
	ArtistStateService,
	CountryList,
	EntityTypeEnum,
	FormatDescriptionList,
	FormatList,
	LabelEntity,
	LabelStateService,
	MediaList,
	ParamItem,
	QueryConstraintTypeEnum,
	QueryOperatorEnum,
	ReleaseEntity,
	ReleaseEntityAdd,
	ReleaseEntityUpdate,
	ReleaseFormParams,
	ReleaseStateService,
	ReleaseUtilService,
	SearchParams,
} from '@music-collection/api';

@Injectable()
export class ReleaseFormService {
	private formGroup!: FormGroup;
	private params!: ReleaseFormParams;
	private params$$: ReplaySubject<ReleaseFormParams>;
	private release!: ReleaseEntity | undefined;

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
					this.releaseStateService.selectEntityById$(
						data['releaseId']
					),
					this.artistStateService.selectSearchResult$(),
					this.albumStateService.selectSearchResult$(),
					this.labelStateService.selectSearchResult$(),
				])
			),
			switchMap(([release, artists, albums, labels]) => {
				this.release = release;
				this.formGroup =
					this.releaseUtilService.createOrUpdateFormGroupForDisabling(
						this.formGroup,
						release,
						!!artists?.length,
						!release
					);
				this.params = this.updateReleaseParams(
					this.params,
					artists,
					albums,
					labels,
					this.formGroup
				);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchAlbum(term: string): void {
		const searchParams: SearchParams = this.createSearchParams(
			EntityTypeEnum.Album,
			term
		);

		this.albumStateService.dispatchSearch(searchParams);
	}

	public searchArtist(term: string): void {
		const searchParams: SearchParams = this.createSearchParams(
			EntityTypeEnum.Artist,
			term
		);

		this.artistStateService.dispatchSearch(searchParams);
	}

	public searchLabel(term: string): void {
		const searchParams: SearchParams = this.createSearchParams(
			EntityTypeEnum.Label,
			term
		);

		this.labelStateService.dispatchSearch(term);
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

	private createSearchParams(
		entityType: EntityTypeEnum,
		term: string
	): SearchParams {
		const query: ParamItem<string> = {
			queryConstraint: QueryConstraintTypeEnum.where,
			operation: QueryOperatorEnum.arrayContains,
			field: 'searchParameters',
			value: term.toLowerCase(),
		};

		const searchParams: SearchParams = [{ entityType, query }];

		return searchParams;
	}

	private updateRelease(): void {
		const release: ReleaseEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.releaseStateService.dispatchUpdateEntityAction(release);
	}

	private updateReleaseParams(
		params: ReleaseFormParams,
		artists: ArtistEntity[],
		albums: AlbumEntity[],
		labels: LabelEntity[],
		formGroup: FormGroup
	): ReleaseFormParams {
		let releaseFormParams: ReleaseFormParams;

		if (!params) {
			releaseFormParams = {
				artists,
				albums,
				countryList: CountryList,
				formGroup,
				formatList: FormatList,
				formatDescriptionList: FormatDescriptionList,
				labels,
				mediaList: MediaList,
			};
		} else {
			params.artists = artists;
			params.albums = albums;
			params.formGroup = formGroup;
			params.labels = labels;

			releaseFormParams = params;
		}

		return releaseFormParams;
	}
}
