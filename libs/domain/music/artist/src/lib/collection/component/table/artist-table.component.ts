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
import { Bind } from 'primeng/bind';
import { Table, SortableColumn, SortIcon } from 'primeng/table';
import { PrimeTemplate } from 'primeng/api';
import { AutoComplete } from 'primeng/autocomplete';
import { Chip } from 'primeng/chip';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistTableService],
	selector: 'mc-artist-table',
	templateUrl: './artist-table.component.html',
	styleUrls: ['./artist-table.component.scss'],
	imports: [
		Bind,
		Table,
		PrimeTemplate,
		SortableColumn,
		SortIcon,
		AutoComplete,
		Chip,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
	],
})
export class ArtistTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(ArtistTableService);

	public params$!: Observable<ArtistTableParams>;

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
}
