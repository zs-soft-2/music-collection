import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { FormsModule } from '@angular/forms';
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
import { toAlbumCoverUrl } from '@music-collection/common/engine';
import { Observable } from 'rxjs';

import { CollectionItemTableService } from './collection-item-table.service';
import { AutoComplete } from 'primeng/autocomplete';
import type { AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
	CollectionColumnDirective,
	CollectionListComponent,
	EntityCardComponent,
	ViewActionComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [CollectionItemTableService],
	selector: 'mc-collection-item-table',
	templateUrl: './collection-item-table.component.html',
	styleUrls: ['./collection-item-table.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Chip,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		CollectionColumnDirective,
		CollectionListComponent,
		EntityCardComponent,
		ViewActionComponent,
	],
})
export class CollectionItemTableComponent
	extends BaseComponent
	implements OnInit
{
	private componentService = inject(CollectionItemTableService);

	public params$!: Observable<CollectionItemTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	/** The cover of the item's album: the entered address, else the upload. */
	public imageOf(collectionItem: CollectionItemEntity): string | null {
		return toAlbumCoverUrl(collectionItem.release?.album);
	}

	public clearArtistSearch(): void {
		this.componentService.clearSearch('artist');
	}

	public clearNameSearch(): void {
		this.componentService.clearSearch('name');
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

	public searchByNameHandler(event: AutoCompleteCompleteEvent): void {
		this.componentService.searchByName(event['query']);
	}

	public searchByArtistNameHandler(event: AutoCompleteCompleteEvent): void {
		this.componentService.searchByArtistName(event['query']);
	}

	/** Where the eye leads: the page that shows this copy. */
	public viewLink(collectionItem: CollectionItemEntity): unknown[] {
		return this.componentService.viewLink(collectionItem);
	}
}
