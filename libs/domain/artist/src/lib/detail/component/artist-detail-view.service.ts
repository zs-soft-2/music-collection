import { Observable, ReplaySubject, switchMap } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
	ArtistDetailParams,
	ArtistEntity,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ArtistDetailViewService extends BaseComponent {
	private params!: ArtistDetailParams;
	private params$$: ReplaySubject<ArtistDetailParams>;

	public constructor(
		private activatedRoute: ActivatedRoute,
		private artistStateService: ArtistStateService,
		private router: Router
	) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(): Observable<ArtistDetailParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				this.artistStateService.selectEntityById$(data['artistId'])
			),
			switchMap((artist) => {
				this.params = {
					artist,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public searchHandler(query: string): void {
		this.artistStateService.dispatchSearch(query);
	}
}
