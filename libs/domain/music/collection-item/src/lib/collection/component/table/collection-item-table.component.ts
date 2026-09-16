import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {
	CollectionItemEntity,
	CollectionItemTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { CollectionItemTableService } from './collection-item-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemTableService],
	selector: 'mc-collection-item-table',
	templateUrl: './collection-item-table.component.html',
	styleUrls: ['./collection-item-table.component.scss'],
  standalone: false,
})
export class CollectionItemTableComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionItemTableService);

	public params$!: Observable<CollectionItemTableParams>;

	public deleteCollectionItem(collectionItem: CollectionItemEntity): void {
		this.componentService.deleteCollectionItem(collectionItem);
	}

	public editCollectionItem(collectionItem: CollectionItemEntity): void {
		this.componentService.editCollectionItem(collectionItem);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public searchHandler(event: any): void {
		this.componentService.searchHandler(event['query']);
	}
}
