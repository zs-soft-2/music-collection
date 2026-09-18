import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { ArtistCollectionModule } from '@music-collection/domain/artist';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-list-page',
	templateUrl: './artist-list-page.component.html',
	styleUrls: ['./artist-list-page.component.scss'],
	imports: [ArtistCollectionModule],
})
export class ArtistListPageComponent extends BaseComponent {}
