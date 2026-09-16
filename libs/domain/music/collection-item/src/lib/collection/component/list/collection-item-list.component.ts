import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
	inject,
} from '@angular/core';
import {
	BaseComponent,
	CollectionItemEntity,
} from '@music-collection/api';

import { CollectionItemListService } from './collection-item-list.service';
import { CollectionItemListState } from './collection-item-list.store';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemListService, CollectionItemListState],
	selector: 'mc-collection-item-list',
	templateUrl: './collection-item-list.component.html',
	styleUrls: ['./collection-item-list.component.scss'],
  standalone: false,
})
export class CollectionItemListComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionItemListService);

	public store = inject(CollectionItemListState);

	@Output()
	public selectCollectionItem: EventEmitter<CollectionItemEntity>;

	public constructor() {
		super();

		this.selectCollectionItem = new EventEmitter();
	}

	public ngOnInit(): void {
		this.componentService.init$(this.selectCollectionItem);
	}
}
