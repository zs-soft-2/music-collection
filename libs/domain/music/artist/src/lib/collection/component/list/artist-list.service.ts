import { Observable, ReplaySubject } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import {
	ArtistEntity,
	ArtistListParams,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';

@Injectable()
export class ArtistListService extends BaseComponent {
	private artistStateService = inject(ArtistStateService);

	private params!: ArtistListParams;
	private params$$: ReplaySubject<ArtistListParams>;

	public constructor() {
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
