import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { ArtistStateService } from '@music-collection/api';

@Injectable()
export class ArtistEditResolverService implements Resolve<void> {
	private artistStateService = inject(ArtistStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		this.artistStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
