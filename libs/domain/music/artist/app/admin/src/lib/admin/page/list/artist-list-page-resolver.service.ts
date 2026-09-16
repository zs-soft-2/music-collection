import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { ArtistStateService } from '@music-collection/api';

@Injectable()
export class ArtistListPageResolverService implements Resolve<void> {
	private artistStateService = inject(ArtistStateService);


	public resolve(): void {
		this.artistStateService.dispatchSetSelectedEntityIdAction('');
		this.artistStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
