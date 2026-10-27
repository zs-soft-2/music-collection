import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
	inject,
} from '@angular/core';
import { BaseComponent, CollectionItemEntity } from '@music-collection/api';

import { CollectionItemListService } from './collection-item-list.service';
import { CollectionItemListState } from './collection-item-list.store';
import { Bind } from 'primeng/bind';
import { ProgressSpinner } from 'primeng/progressspinner';
import {
	DefaultLayoutDirective,
	DefaultLayoutAlignDirective,
	DefaultLayoutGapDirective,
} from 'ng-flex-layout/flex';
import { NgTemplateOutlet } from '@angular/common';
import { CollectionItemSimpleViewComponent } from '../../../view/component/simple/collection-item-simple-view.component';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemListService, CollectionItemListState],
	selector: 'mc-collection-item-list',
	templateUrl: './collection-item-list.component.html',
	styleUrls: ['./collection-item-list.component.scss'],
	imports: [
		...I18N_IMPORTS,
		Bind,
		ProgressSpinner,
		DefaultLayoutDirective,
		DefaultLayoutAlignDirective,
		DefaultLayoutGapDirective,
		NgTemplateOutlet,
		CollectionItemSimpleViewComponent,
	],
})
export class CollectionItemListComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionItemListService);

	public store = inject(CollectionItemListState);

	@Output()
	public selectCollectionItem: EventEmitter<CollectionItemEntity>;

	public constructor() {
		super();

		this.selectCollectionItem = new EventEmitter();
	}

	public ngOnInit(): void {
		this.componentService.init$(this.selectCollectionItem);
	}
}
