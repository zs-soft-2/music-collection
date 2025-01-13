import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { ArtistEntity, BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-simple-view',
	templateUrl: './artist-simple-view.component.html',
	styleUrls: ['./artist-simple-view.component.scss'],
	standalone: false,
})
export class ArtistSimpleViewComponent extends BaseComponent {
	@Input()
	public artist!: ArtistEntity;
	@Output()
	public selectArtist: EventEmitter<ArtistEntity>;

	public constructor() {
		super();

		this.selectArtist = new EventEmitter();
	}

	public detailClickHandler(artist: ArtistEntity): void {
		this.selectArtist.emit(artist);
	}
}
