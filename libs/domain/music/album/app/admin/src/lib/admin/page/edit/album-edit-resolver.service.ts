import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';

@Injectable()
export class AlbumEditResolverService implements Resolve<void> {
	private albumStateService = inject(AlbumStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		this.albumStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
