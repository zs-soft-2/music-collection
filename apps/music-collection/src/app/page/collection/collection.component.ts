import { takeUntil, tap } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	BaseComponent,
	CollectionItemStateService,
} from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection',
	templateUrl: './collection.component.html',
	styleUrls: ['./collection.component.scss'],
})
export class CollectionComponent extends BaseComponent implements OnInit {
	public display = false;

	public constructor(
		private collectionItemStateService: CollectionItemStateService
	) {
		super();
	}

	public ngOnInit(): void {
		this.collectionItemStateService
			.selectEntities$()
			.pipe(
				tap((entities) => {
					if (!entities?.length) {
						this.collectionItemStateService.dispatchListEntitiesAction();
					}
				}),
				takeUntil(this.destroy)
			)
			.subscribe();
	}
}
