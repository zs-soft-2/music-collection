import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-detail-view',
	templateUrl: './artist-detail-view.component.html',
	styleUrls: ['./artist-detail-view.component.scss'],
})
export class ArtistDetailViewComponent extends BaseComponent {}
