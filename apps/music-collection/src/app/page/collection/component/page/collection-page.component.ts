import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { CollectionContentComponent } from '../content/collection-content.component';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-page',
	templateUrl: './collection-page.component.html',
	styleUrls: ['./collection-page.component.scss'],
	imports: [CollectionContentComponent],
})
export class CollectionPageComponent extends BaseComponent {}
