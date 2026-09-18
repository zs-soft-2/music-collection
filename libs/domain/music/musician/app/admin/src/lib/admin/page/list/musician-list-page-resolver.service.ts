import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { MusicianStateService } from '@music-collection/api';

@Injectable()
export class MusicianListPageResolverService implements Resolve<void> {
	private musicianStateService = inject(MusicianStateService);

	public resolve(): void {
		this.musicianStateService.dispatchSetSelectedEntityIdAction('');
		this.musicianStateService.dispatchChangeNewEntityButtonEnabled(true);
		this.musicianStateService.dispatchListEntitiesAction();
	}
}
