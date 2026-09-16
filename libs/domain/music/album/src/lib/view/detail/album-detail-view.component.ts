import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { AlbumDetailViewParams, BaseComponent } from '@music-collection/api';

import { AlbumDetailViewStoreService } from './album-detail-view-store.service';
import { AlbumDetailViewService } from './album-detail-view.service';
import {
	DefaultLayoutDirective,
	DefaultLayoutAlignDirective,
	DefaultLayoutGapDirective,
} from 'ng-flex-layout/flex';
import { Bind } from 'primeng/bind';
import { Image } from 'primeng/image';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumDetailViewService, AlbumDetailViewStoreService],
	selector: 'mc-album-detail-view',
	templateUrl: './album-detail-view.component.html',
	styleUrls: ['./album-detail-view.component.scss'],
	imports: [
		DefaultLayoutDirective,
		DefaultLayoutAlignDirective,
		DefaultLayoutGapDirective,
		Bind,
		Image,
		AsyncPipe,
	],
})
export class AlbumDetailViewComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumDetailViewService);

	public params$!: Observable<AlbumDetailViewParams>;

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
