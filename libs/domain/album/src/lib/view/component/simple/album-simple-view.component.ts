import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AlbumEntity, BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-simple-view',
	templateUrl: './album-simple-view.component.html',
	styleUrls: ['./album-simple-view.component.scss'],
})
export class AlbumSimpleViewComponent extends BaseComponent {
	@Input()
	public album!: AlbumEntity;
	@Input()
	public width = '300';
}
