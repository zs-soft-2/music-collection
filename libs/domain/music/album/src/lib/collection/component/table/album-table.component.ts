import { I18N_IMPORTS } from '@music-collection/core/i18n';
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

import { ALBUM_IN_USE } from '../../../deletion/album-deletion.effect';
import { provideAlbumDeletion } from '../../../deletion/album-deletion.providers';
import { AlbumDeletionStore } from '../../../deletion/album-deletion.store';

import { AlbumTableService } from './album-table.service';
import { Dialog } from 'primeng/dialog';
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
import { Ripple } from 'primeng/ripple';
import { Button, ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
	CollectionColumnDirective,
	CollectionListComponent,
	EntityCardComponent,
	ViewActionComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [
		AlbumTableService,
		AlbumDeletionStore,
		...provideAlbumDeletion(),
	],
	selector: 'mc-album-table',
	templateUrl: './album-table.component.html',
	styleUrls: ['./album-table.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Chip,
		Ripple,
		Button,
		ButtonDirective,
		Dialog,
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

	/** The confirmation behind the trash icon; the template reads it. */
	public readonly deletion = inject(AlbumDeletionStore);

	/** The one error the dialog has a sentence of its own for. */
	public readonly inUse = ALBUM_IN_USE;

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

	/**
	 * Asks before deleting, and asks the server what holds the album: what
	 * goes with it, and whether anybody else's copy stands in the way.
	 */
	public deleteAlbum(album: AlbumEntity): void {
		this.deletion.ask(album);
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
