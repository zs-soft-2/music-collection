import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
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
})
export class CollectionItemTableComponent
	extends BaseComponent
	implements OnInit
{
	public params$!: Observable<CollectionItemTableParams>;

	public constructor(private componentService: CollectionItemTableService) {
		super();
	}

	public deleteCollectionItem(collectionItem: CollectionItemEntity): void {
		console.log(collectionItem);
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
