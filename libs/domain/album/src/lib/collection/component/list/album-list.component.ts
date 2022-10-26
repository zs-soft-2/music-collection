import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { AlbumListService } from './album-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [AlbumListService],
	selector: 'mc-album-list',
	templateUrl: './album-list.component.html',
	styleUrls: ['./album-list.component.scss'],
})
export class AlbumListComponent extends BaseComponent implements OnInit {
	public constructor(private componentService: AlbumListService) {
		super();
	}

	public ngOnInit(): void {
		this.componentService.init$().pipe().subscribe();
	}
}
