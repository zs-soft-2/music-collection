import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	CollectionItemEntity,
	CollectionItemTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { CollectionItemTableService } from './collection-item-table.service';
import { Bind } from 'primeng/bind';
import { Table, SortableColumn, SortIcon } from 'primeng/table';
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import { DataView } from 'primeng/dataview';
import {
	CollectionViewToggleComponent,
	EntityCardComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemTableService],
	selector: 'mc-collection-item-table',
	templateUrl: './collection-item-table.component.html',
	styleUrls: ['./collection-item-table.component.scss'],
	imports: [
		Bind,
		Table,
		SortableColumn,
		SortIcon,
		AutoComplete,
		Chip,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		DataView,
		CollectionViewToggleComponent,
		EntityCardComponent,
	],
})
export class CollectionItemTableComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionItemTableService);

	public params$!: Observable<CollectionItemTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	/** The cover of the item's album (uploaded, else found on the web). */
	public imageOf(collectionItem: CollectionItemEntity): string | null {
		return (
			collectionItem.release?.album?.coverImage?.filePath ||
			collectionItem.release?.album?.coverImageUrl ||
			null
		);
	}

	public deleteCollectionItem(collectionItem: CollectionItemEntity): void {
		this.componentService.deleteCollectionItem(collectionItem);
	}

	public editCollectionItem(collectionItem: CollectionItemEntity): void {
		this.componentService.editCollectionItem(collectionItem);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public searchHandler(event: any): void {
		this.componentService.searchHandler(event['query']);
	}
}
