import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { MusicianStateService } from '@music-collection/api';

@Injectable()
export class MusicianEditResolverService implements Resolve<void> {
	private musicianStateService = inject(MusicianStateService);

	/** Loads the musician when the page is opened directly (id 0 = new). */
	public resolve(route: ActivatedRouteSnapshot): void {
		const musicianId = route.paramMap.get('musicianId');

		this.musicianStateService.dispatchChangeNewEntityButtonEnabled(false);

		if (musicianId && musicianId !== '0') {
			this.musicianStateService.dispatchLoadEntityAction(musicianId);
		}
	}
}
