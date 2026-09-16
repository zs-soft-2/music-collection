import { combineLatest, takeUntil, tap } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	AlbumStateService,
	ArtistStateService,
	BaseComponent,
} from '@music-collection/api';
import { ArtistCollectionModule } from '@music-collection/domain/artist';
import { AlbumCollectionModule } from '@music-collection/domain/album';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss'],
	imports: [ArtistCollectionModule, AlbumCollectionModule],
})
export class HomeComponent extends BaseComponent implements OnInit {
	private albumStateService = inject(AlbumStateService);
	private artistStateService = inject(ArtistStateService);

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
