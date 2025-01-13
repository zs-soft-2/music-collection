import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseComponent, SimpleAlbum } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-simple-view',
	templateUrl: './album-simple-view.component.html',
	styleUrls: ['./album-simple-view.component.scss'],
  standalone: false,
})
export class AlbumSimpleViewComponent extends BaseComponent {
	@Input()
	public album!: SimpleAlbum;
	@Input()
	public width = '300';
	@Input()
	public height = '300';
}
