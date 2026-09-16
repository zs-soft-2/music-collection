import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { AlbumListParams, BaseComponent } from '@music-collection/api';

import { AlbumListService } from './album-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumListService],
	selector: 'mc-album-list',
	templateUrl: './album-list.component.html',
	styleUrls: ['./album-list.component.scss'],
	standalone: false,
})
export class AlbumListComponent extends BaseComponent implements OnInit {
	private componentService = inject(AlbumListService);

	public params$!: Observable<AlbumListParams>;

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
