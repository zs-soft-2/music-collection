import { FormsModule } from '@angular/forms';
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
import { AutoComplete } from 'primeng/autocomplete';
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
	providers: [AlbumTableService],
	selector: 'mc-album-table',
	templateUrl: './album-table.component.html',
	styleUrls: ['./album-table.component.scss'],
	imports: [
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
export class AlbumTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumTableService);

	public params$!: Observable<AlbumTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	/** The uploaded cover, else the cover found on the web. */
	public imageOf(album: AlbumEntity): string | null {
		return album.coverImage?.filePath || album.coverImageUrl || null;
	}

	public clearArtistSearch(): void {
		this.componentService.clearSearch('artist');
	}

	public clearNameSearch(): void {
		this.componentService.clearSearch('name');
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

	/** Where the eye leads: the page that shows this album. */
	public viewLink(album: AlbumEntity): unknown[] {
		return this.componentService.viewLink(album);
	}
}
