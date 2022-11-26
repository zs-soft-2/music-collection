import { takeUntil, tap, Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent, CollectionItemListConfig } from '@music-collection/api';

import { CollectionContentService } from './collection-content.service';
import { CollectionContentParams } from '../../api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionContentService],
	selector: 'mc-collection-content',
	templateUrl: './collection-content.component.html',
	styleUrls: ['./collection-content.component.scss'],
})
export class CollectionContentComponent
	extends BaseComponent
	implements OnInit
{
	public params$$!: Observable<CollectionContentParams>;

	public constructor(private componentService: CollectionContentService) {
		super();
	}

	public ngOnInit(): void {
		this.params$$ = this.componentService.init$();
	}

	public configChangeHandler(config: CollectionItemListConfig): void {
		this.componentService.configChange(config);
	}
}
