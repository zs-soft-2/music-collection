import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { ArtistEntity, BaseComponent } from '@music-collection/api';
import {
	DefaultLayoutDirective,
	DefaultFlexDirective,
	DefaultLayoutAlignDirective,
} from 'ng-flex-layout/flex';
import { Bind } from 'primeng/bind';
import { Chip } from 'primeng/chip';
import { Image } from 'primeng/image';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-artist-simple-view',
	templateUrl: './artist-simple-view.component.html',
	styleUrls: ['./artist-simple-view.component.scss'],
	imports: [
		DefaultLayoutDirective,
		DefaultFlexDirective,
		DefaultLayoutAlignDirective,
		Bind,
		Chip,
		Image,
	],
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
