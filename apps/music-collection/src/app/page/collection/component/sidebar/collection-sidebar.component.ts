import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
	inject,
} from '@angular/core';
import { BaseComponent, CollectionItemListConfig } from '@music-collection/api';

import { CollectionSidebarService } from './collection-sidebar.service';
import { CollectionSidebarStore } from './collection-sidebar.store';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionSidebarService, CollectionSidebarStore],
	selector: 'mc-collection-sidebar',
	templateUrl: './collection-sidebar.component.html',
	styleUrls: ['./collection-sidebar.component.scss'],
})
export class CollectionSidebarComponent
	extends BaseComponent
	implements OnInit
{
	public store = inject(CollectionSidebarStore);

	@Output()
	public configChange: EventEmitter<CollectionItemListConfig>;

	public constructor(private componentService: CollectionSidebarService) {
		super();

		this.configChange = new EventEmitter();
	}

	public ngOnInit(): void {
		this.componentService.init$(this.configChange);
	}
}
