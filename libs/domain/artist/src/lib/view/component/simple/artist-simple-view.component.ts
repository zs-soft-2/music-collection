import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-simple-view',
	templateUrl: './artist-simple-view.component.html',
	styleUrls: ['./artist-simple-view.component.scss'],
})
export class ArtistSimpleViewComponent extends BaseComponent {}
