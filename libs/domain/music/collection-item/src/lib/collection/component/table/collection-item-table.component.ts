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
import { Table } from 'primeng/table';
import { PrimeTemplate } from 'primeng/api';
import { AutoComplete } from 'primeng/autocomplete';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemTableService],
	selector: 'mc-collection-item-table',
	templateUrl: './collection-item-table.component.html',
	styleUrls: ['./collection-item-table.component.scss'],
	imports: [
		Bind,
		Table,
		PrimeTemplate,
		AutoComplete,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
	],
})
export class CollectionItemTableComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionItemTableService);

	public params$!: Observable<CollectionItemTableParams>;

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
