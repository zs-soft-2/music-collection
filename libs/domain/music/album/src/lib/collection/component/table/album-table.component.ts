import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	AlbumEntity,
	AlbumTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { AlbumTableService } from './album-table.service';
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
	providers: [AlbumTableService],
	selector: 'mc-album-table',
	templateUrl: './album-table.component.html',
	styleUrls: ['./album-table.component.scss'],
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
export class AlbumTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumTableService);

	public params$!: Observable<AlbumTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	/** The uploaded cover, else the cover found on the web. */
	public imageOf(album: AlbumEntity): string | null {
		return album.coverImage?.filePath || album.coverImageUrl || null;
	}

	public deleteAlbum(album: AlbumEntity): void {
		console.log(album);
	}

	public editAlbum(album: AlbumEntity): void {
		this.componentService.editAlbum(album);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public searchByNameHandler(event: any): void {
		this.componentService.searchByName(event['query']);
	}

	public searchByArtistNameHandler(event: any): void {
		this.componentService.searchByArtistName(event['query']);
	}
}
