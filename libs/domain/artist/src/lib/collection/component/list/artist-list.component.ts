import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { ArtistListService } from './artist-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistListService],
	selector: 'mc-artist-list',
	templateUrl: './artist-list.component.html',
	styleUrls: ['./artist-list.component.scss'],
})
export class ArtistListComponent extends BaseComponent implements OnInit {
	public constructor(private componentService: ArtistListService) {
		super();
	}

	public ngOnInit(): void {
		this.componentService.init$().pipe().subscribe();
	}
}
