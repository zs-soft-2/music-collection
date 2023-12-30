import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { AlbumStateService } from '@music-collection/api';

@Injectable()
export class AlbumListPageResolverService implements Resolve<void> {
	constructor(private albumStateService: AlbumStateService) {}

	public resolve(): void {
		this.albumStateService.dispatchSetSelectedEntityIdAction('');
		this.albumStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
