import { FormsModule } from '@angular/forms';
import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	ArtistEntity,
	ArtistTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { ArtistTableService } from './artist-table.service';
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
	providers: [ArtistTableService],
	selector: 'mc-artist-table',
	templateUrl: './artist-table.component.html',
	styleUrls: ['./artist-table.component.scss'],
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
export class ArtistTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistTableService);

	public params$!: Observable<ArtistTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	/** The uploaded main image, else the photo found on the web. */
	public imageOf(artist: ArtistEntity): string | null {
		return (
			artist.mainImage?.filePath ||
			artist.imageUrl ||
			artist.discogs?.imageUrl ||
			null
		);
	}

	public clearSearch(): void {
		this.componentService.clearSearch();
	}

	public deleteArtist(artist: ArtistEntity): void {
		console.log(artist);
	}

	public editArtist(artist: ArtistEntity): void {
		this.componentService.editArtist(artist);
	}

	public exportArtist(artist: ArtistEntity): void {
		this.componentService.exportArtist(artist);
	}

	public searchByNameHandler(event: any): void {
		this.componentService.searchByName(event['query']);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	/** Where the eye leads: the page that shows this artist. */
	public viewLink(artist: ArtistEntity): unknown[] {
		return this.componentService.viewLink(artist);
	}
}
