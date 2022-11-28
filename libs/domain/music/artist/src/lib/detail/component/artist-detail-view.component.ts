import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ArtistDetailParams, BaseComponent } from '@music-collection/api';

import { ArtistDetailViewService } from './artist-detail-view.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistDetailViewService],
	selector: 'mc-artist-detail-view',
	templateUrl: './artist-detail-view.component.html',
	styleUrls: ['./artist-detail-view.component.scss'],
})
export class ArtistDetailViewComponent extends BaseComponent implements OnInit {
	public params$!: Observable<ArtistDetailParams>;

	public constructor(private componentService: ArtistDetailViewService) {
		super();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
