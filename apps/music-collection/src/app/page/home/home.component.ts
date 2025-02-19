import { combineLatest, takeUntil, tap } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	AlbumStateService,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss'],
  standalone: false,
})
export class HomeComponent extends BaseComponent implements OnInit {
	public constructor(
		private albumStateService: AlbumStateService,
		private artistStateService: ArtistStateService
	) {
		super();
	}

	public ngOnInit(): void {
		combineLatest([
			this.albumStateService.selectEntities$(),
			this.artistStateService.selectEntities$(),
		])
			.pipe(
				tap(([albums, artists]) => {
					if (!albums?.length) {
						this.albumStateService.dispatchListEntitiesAction();
					}

					if (!artists?.length) {
						this.artistStateService.dispatchListEntitiesAction();
					}
				}),
				takeUntil(this.destroy)
			)
			.subscribe();
	}
}
