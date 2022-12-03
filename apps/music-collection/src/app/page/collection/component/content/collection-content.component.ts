import { Observable, takeUntil, tap } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	BaseComponent,
	CollectionItemEntity,
	CollectionItemListConfig,
} from '@music-collection/api';

import { CollectionContentParams } from '../../api';
import { CollectionContentService } from './collection-content.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionContentService],
	selector: 'mc-collection-content',
	templateUrl: './collection-content.component.html',
	styleUrls: ['./collection-content.component.scss'],
})
export class CollectionContentComponent
	extends BaseComponent
	implements OnInit
{
	public params$$!: Observable<CollectionContentParams>;

	public constructor(private componentService: CollectionContentService) {
		super();
	}

	public configChangeHandler(config: CollectionItemListConfig): void {
		this.componentService.configChange(config);
	}

	public ngOnInit(): void {
		this.params$$ = this.componentService.init$();
	}

	public selectCollectionItemHandler(
		collectionItem: CollectionItemEntity
	): void {
		this.componentService.selectCollectionItem(collectionItem);
	}
}
