import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { AlbumDetailViewParams, BaseComponent } from '@music-collection/api';

import { AlbumDetailViewStoreService } from './album-detail-view-store.service';
import { AlbumDetailViewService } from './album-detail-view.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumDetailViewService, AlbumDetailViewStoreService],
	selector: 'mc-album-detail-view',
	templateUrl: './album-detail-view.component.html',
	styleUrls: ['./album-detail-view.component.scss'],
  standalone: false,
})
export class AlbumDetailViewComponent extends BaseComponent implements OnInit {
	public params$!: Observable<AlbumDetailViewParams>;

	public constructor(private componentService: AlbumDetailViewService) {
		super();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
