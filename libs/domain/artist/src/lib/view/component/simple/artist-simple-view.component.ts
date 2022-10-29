import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ArtistEntity, BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-simple-view',
	templateUrl: './artist-simple-view.component.html',
	styleUrls: ['./artist-simple-view.component.scss'],
})
export class ArtistSimpleViewComponent extends BaseComponent {
	@Input()
	public artist!: ArtistEntity;
}
