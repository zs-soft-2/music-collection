import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-simple-view',
	templateUrl: './collection-item-simple-view.component.html',
	styleUrls: ['./collection-item-simple-view.component.scss'],
})
export class CollectionItemSimpleViewComponent extends BaseComponent {}
