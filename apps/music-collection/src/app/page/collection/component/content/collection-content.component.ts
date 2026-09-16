import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { CollectionContentStore } from './collection-content.service';
import { CollectionItemCollectionModule } from '@music-collection/domain/collection-item';
import { CollectionSidebarComponent } from '../sidebar/collection-sidebar.component';
import { Bind } from 'primeng/bind';
import { ScrollTop } from 'primeng/scrolltop';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionContentStore],
	selector: 'mc-collection-content',
	templateUrl: './collection-content.component.html',
	styleUrls: ['./collection-content.component.scss'],
	imports: [
		CollectionItemCollectionModule,
		CollectionSidebarComponent,
		Bind,
		ScrollTop,
	],
})
export class CollectionContentComponent extends BaseComponent {
	public store = inject(CollectionContentStore);
}
