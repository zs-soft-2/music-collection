import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ArtistEntity, BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-detail-view',
	templateUrl: './artist-detail-view.component.html',
	styleUrls: ['./artist-detail-view.component.scss'],
})
export class ArtistDetailViewComponent extends BaseComponent {
	@Input()
	public artist!: ArtistEntity;
}
