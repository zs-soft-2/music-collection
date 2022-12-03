import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
} from '@angular/core';
import {
	BaseComponent,
	CollectionItem,
	CollectionItemEntity,
	CollectionItemListParams,
} from '@music-collection/api';

import { CollectionItemListService } from './collection-item-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemListService],
	selector: 'mc-collection-item-list',
	templateUrl: './collection-item-list.component.html',
	styleUrls: ['./collection-item-list.component.scss'],
})
export class CollectionItemListComponent
	extends BaseComponent
	implements OnInit
{
	public params$!: Observable<CollectionItemListParams>;
	@Output()
	public selectCollectionItem: EventEmitter<CollectionItemEntity>;

	public constructor(private componentService: CollectionItemListService) {
		super();

		this.selectCollectionItem = new EventEmitter();
	}

	public collectionItemClickHandler(
		collectionItem: CollectionItemEntity
	): void {
		this.componentService.collectionItemClick(collectionItem);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$(this.selectCollectionItem);
	}
}
