import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AlbumEntity, BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-item-view',
	templateUrl: './album-item-view.component.html',
	styleUrls: ['./album-item-view.component.scss'],
})
export class AlbumItemViewComponent extends BaseComponent {
	@Input()
	public album!: AlbumEntity;
	@Input()
	public width = '100';
}
