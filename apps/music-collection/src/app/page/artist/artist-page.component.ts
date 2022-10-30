import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-page',
	templateUrl: './artist-page.component.html',
	styleUrls: ['./artist-page.component.scss'],
})
export class ArtistPageComponent {}
