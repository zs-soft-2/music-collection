import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
	inject,
} from '@angular/core';
import {
	AlbumEntity,
	BaseComponent,
} from '@music-collection/api';

import { ArtistDetailViewService } from './artist-detail-view.service';
import { ArtistDetailViewStore } from './artist-detail-view.store';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [ArtistDetailViewService, ArtistDetailViewStore],
	selector: 'mc-artist-detail-view',
	templateUrl: './artist-detail-view.component.html',
	styleUrls: ['./artist-detail-view.component.scss'],
  standalone: false,
})
export class ArtistDetailViewComponent extends BaseComponent implements OnInit {
	public store = inject(ArtistDetailViewStore);

	@Output()
	public selectAlbumDetail: EventEmitter<AlbumEntity>;

	public constructor(private componentService: ArtistDetailViewService) {
		super();

		this.selectAlbumDetail = new EventEmitter();
	}

	public ngOnInit(): void {
		this.componentService.init(this.selectAlbumDetail);
	}
}
