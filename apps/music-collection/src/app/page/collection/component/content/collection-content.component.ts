import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { CollectionContentStore } from './collection-content.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionContentStore],
	selector: 'mc-collection-content',
	templateUrl: './collection-content.component.html',
	styleUrls: ['./collection-content.component.scss'],
  standalone: false,
})
export class CollectionContentComponent
	extends BaseComponent
{
	public store = inject(CollectionContentStore);


}
