import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { CollectionItemCollectionModule } from '@music-collection/domain/collection-item';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-list-page',
	templateUrl: './collection-item-list-page.component.html',
	styleUrls: ['./collection-item-list-page.component.scss'],
	imports: [CollectionItemCollectionModule],
})
export class CollectionItemListPageComponent extends BaseComponent {}
