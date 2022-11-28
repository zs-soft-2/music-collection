import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-list-page',
	templateUrl: './collection-item-list-page.component.html',
	styleUrls: ['./collection-item-list-page.component.scss'],
})
export class CollectionItemListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
