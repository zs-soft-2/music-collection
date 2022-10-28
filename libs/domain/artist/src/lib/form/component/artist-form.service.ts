import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistFormParams,
	ArtistStateService,
	ArtistUtilService,
	DocumentEntity,
	DocumentStateService,
	StyleList,
} from '@music-collection/api';
import { FormGroup } from '@angular/forms';

@Injectable()
export class ArtistFormService {
	private artist!: ArtistEntity | undefined;
	private formGroup!: FormGroup;
	private params!: ArtistFormParams;
	private params$$: ReplaySubject<ArtistFormParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private artistStateService: ArtistStateService,
		private artistUtilService: ArtistUtilService,
		private componentUtil: ArtistUtilService,
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

	public init$(): Observable<ArtistFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.artistStateService.selectEntityById$(data['artistId']),
					this.documentStateService.selectSearchResult$(),
				])
			),
			switchMap(([artist, documents]) => {
				this.artist = artist;
				this.formGroup = this.artistUtilService.createFormGroup(artist);
				this.params = this.createArtistParams(
					this.formGroup,
					documents,
					!!artist
				);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchDocument(term: string): void {
		this.documentStateService.dispatchSearch(term);
	}

	public submit(): void {
		if (this.artist) {
			this.updateArtist();
		} else {
			this.addArtist();
		}

		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	private addArtist(): void {
		const artist: ArtistEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.artistStateService.dispatchAddEntityAction(artist);
	}

	private createArtistParams(
		formGroup: FormGroup,
		documents: DocumentEntity[],
		isImagesTabActive: boolean
	): ArtistFormParams {
		const artistFormParams: ArtistFormParams = {
			documents,
			formGroup,
			isImagesTabActive,
			styleList: StyleList,
		};

		return artistFormParams;
	}

	private updateArtist(): void {
		const artist: ArtistEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.artistStateService.dispatchUpdateEntityAction(artist);
	}

	public mainImageUpload(file: File): void {
		console.log(file);
	}
}
