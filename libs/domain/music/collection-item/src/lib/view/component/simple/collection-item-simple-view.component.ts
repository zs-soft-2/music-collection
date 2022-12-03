import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { BaseComponent, CollectionItemEntity } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-simple-view',
	templateUrl: './collection-item-simple-view.component.html',
	styleUrls: ['./collection-item-simple-view.component.scss'],
})
export class CollectionItemSimpleViewComponent extends BaseComponent {
	@Input()
	public collectionItem!: CollectionItemEntity;
	@Output()
	public selectCollectionItem: EventEmitter<void>;

	public constructor() {
		super();

		this.selectCollectionItem = new EventEmitter();
	}

	public releaseClickHandler(): void {
		this.selectCollectionItem.emit();
	}
}
