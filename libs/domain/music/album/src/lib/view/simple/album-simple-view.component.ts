import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseComponent, SimpleAlbum } from '@music-collection/api';
import { Bind } from 'primeng/bind';
import { Image } from 'primeng/image';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-simple-view',
	templateUrl: './album-simple-view.component.html',
	styleUrls: ['./album-simple-view.component.scss'],
	imports: [...I18N_IMPORTS, Bind, Image],
})
export class AlbumSimpleViewComponent extends BaseComponent {
	@Input()
	public album!: SimpleAlbum;
	@Input()
	public width = '300';
	@Input()
	public height = '300';
}
