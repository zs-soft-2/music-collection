import { takeUntil, tap } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	AlbumStateService,
	BaseComponent,
	ReleaseStateService,
} from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-home',
	templateUrl: './home.component.html',
	styleUrls: ['./home.component.scss'],
})
export class HomeComponent extends BaseComponent implements OnInit {
	public constructor(private releaseStateService: ReleaseStateService) {
		super();
	}

	public ngOnInit(): void {
		this.releaseStateService
			.selectEntities$()
			.pipe(
				tap((entities) => {
					if (!entities?.length) {
						this.releaseStateService.dispatchListEntitiesAction();
					}
				}),
				takeUntil(this.destroy)
			)
			.subscribe();
	}
}
