import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { CollectionItemListService } from './collection-item-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemListService],
	selector: 'mc-collection-item-list',
	templateUrl: './collection-item-list.component.html',
	styleUrls: ['./collection-item-list.component.scss'],
})
export class CollectionItemListComponent
	extends BaseComponent
	implements OnInit
{
	public constructor(private componentService: CollectionItemListService) {
		super();
	}

	public ngOnInit(): void {
		this.componentService.init$().pipe().subscribe();
	}
}
