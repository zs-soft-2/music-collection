import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	ArtistEntity,
	ArtistTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { ArtistTableService } from './artist-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistTableService],
	selector: 'mc-artist-table',
	templateUrl: './artist-table.component.html',
	styleUrls: ['./artist-table.component.scss'],
  standalone: false,
})
export class ArtistTableComponent extends BaseComponent implements OnInit {
	public params$!: Observable<ArtistTableParams>;

	public constructor(private componentService: ArtistTableService) {
		super();
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
}
