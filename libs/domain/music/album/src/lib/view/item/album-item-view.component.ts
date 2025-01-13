import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { AlbumEntity, BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-item-view',
	templateUrl: './album-item-view.component.html',
	styleUrls: ['./album-item-view.component.scss'],
	standalone: false,
})
export class AlbumItemViewComponent extends BaseComponent {
	@Input()
	public album!: AlbumEntity;
	@Input()
	public width = '100';
	@Output()
	public selectAlbumDetail: EventEmitter<AlbumEntity>;

	public constructor() {
		super();

		this.selectAlbumDetail = new EventEmitter();
	}

	public detailClickHandler(): void {
		this.selectAlbumDetail.emit(this.album);
	}
}
