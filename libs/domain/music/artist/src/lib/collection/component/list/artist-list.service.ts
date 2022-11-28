import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable } from '@angular/core';
import {
	ArtistEntity,
	ArtistListParams,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ArtistListService extends BaseComponent {
	private params!: ArtistListParams;
	private params$$: ReplaySubject<ArtistListParams>;

	public constructor(private artistStateService: ArtistStateService) {
		super();

		this.params$$ = new ReplaySubject();
	}

	public init$(): Observable<ArtistListParams> {
		return this.artistStateService.selectEntities$().pipe(
			switchMap((artists) => {
				this.params = {
					artists,
				};

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public selectArtistHandler(artist: ArtistEntity): void {
		this.artistStateService.dispatchSelectArtistAction(artist);
	}
}
