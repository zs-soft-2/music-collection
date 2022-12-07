import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	OnInit,
	Output,
} from '@angular/core';
import {
	AlbumEntity,
	ArtistDetailParams,
	BaseComponent,
} from '@music-collection/api';

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
	@Output()
	public selectAlbumDetail: EventEmitter<AlbumEntity>;

	public constructor(private componentService: ArtistDetailViewService) {
		super();

		this.selectAlbumDetail = new EventEmitter();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public selectAlbumDetailHandler(album: AlbumEntity): void {
		this.selectAlbumDetail.emit(album);
	}
}
