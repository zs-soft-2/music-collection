import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-list-page',
	templateUrl: './album-list-page.component.html',
	styleUrls: ['./album-list-page.component.scss'],
})
export class AlbumListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
