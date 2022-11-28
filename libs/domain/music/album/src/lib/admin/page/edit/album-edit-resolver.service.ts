import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';

@Injectable()
export class AlbumEditResolverService implements Resolve<void> {
	public constructor(private albumStateService: AlbumStateService) {}

	public resolve(): void | Observable<void> | Promise<void> {
		this.albumStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
