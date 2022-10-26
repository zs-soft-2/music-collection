import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ArtistEntity,
	ArtistEntityAdd,
	ArtistEntityUpdate,
	ArtistFormParams,
	ArtistStateService,
	ArtistUtilService,
	StyleList,
} from '@music-collection/api';

@Injectable()
export class ArtistFormService {
	private artist!: ArtistEntity | undefined;
	private params!: ArtistFormParams;
	private params$$: ReplaySubject<ArtistFormParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private artistStateService: ArtistStateService,
		private artistUtilService: ArtistUtilService,
		private componentUtil: ArtistUtilService,
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
				this.artistStateService.selectEntityById$(data['artistId'])
			),
			switchMap((artist) => {
				this.artist = artist;
				this.params = this.createArtistParams(artist);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
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
		artist: ArtistEntity | undefined
	): ArtistFormParams {
		const formGroup = this.artistUtilService.createFormGroup(artist);

		const artistFormParams: ArtistFormParams = {
			formGroup,
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
}
