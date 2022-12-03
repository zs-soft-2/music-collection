import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';

@Injectable()
export class AlbumPageResolverService implements Resolve<void> {
	public constructor(private albumStateService: AlbumStateService) {}

	public resolve(
		activatedRoute: ActivatedRouteSnapshot
	): void | Observable<void> | Promise<void> {
		const albumId: string = activatedRoute.paramMap.get('albumId') || '';

		if (albumId) {
			this.albumStateService.dispatchLoadEntityAction(albumId);
		}
	}
}
