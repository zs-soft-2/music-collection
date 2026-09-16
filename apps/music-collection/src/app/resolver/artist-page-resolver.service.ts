import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, Resolve } from '@angular/router';
import { ArtistStateService } from '@music-collection/api';

@Injectable()
export class ArtistPageResolverService implements Resolve<void> {
	private activatedRoute = inject(ActivatedRoute);
	private artistStateService = inject(ArtistStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		const artistId: string =
			this.activatedRoute.snapshot.params['artistId'];

		this.artistStateService.dispatchLoadEntityAction(artistId);
	}
}
