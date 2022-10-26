import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-list-page',
	templateUrl: './artist-list-page.component.html',
	styleUrls: ['./artist-list-page.component.scss'],
})
export class ArtistListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
