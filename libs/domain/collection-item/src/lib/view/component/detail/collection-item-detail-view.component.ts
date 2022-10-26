import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-detail-view',
	templateUrl: './collection-item-detail-view.component.html',
	styleUrls: ['./collection-item-detail-view.component.scss'],
})
export class CollectionItemDetailViewComponent extends BaseComponent {}
