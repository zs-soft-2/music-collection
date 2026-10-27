import { I18N_IMPORTS } from '@music-collection/core/i18n';
import {
	ChangeDetectionStrategy,
	Component,
	EventEmitter,
	Input,
	Output,
} from '@angular/core';
import { AlbumEntity, BaseComponent } from '@music-collection/api';
import { Bind } from 'primeng/bind';
import { Image } from 'primeng/image';
import { Button } from 'primeng/button';
import { DatePipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-item-view',
	templateUrl: './album-item-view.component.html',
	styleUrls: ['./album-item-view.component.scss'],
	imports: [...I18N_IMPORTS, Bind, Image, Button, DatePipe],
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
