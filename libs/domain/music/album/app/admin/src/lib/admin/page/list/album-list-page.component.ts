import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { AlbumCollectionModule } from '@music-collection/domain/album';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-list-page',
	templateUrl: './album-list-page.component.html',
	styleUrls: ['./album-list-page.component.scss'],
	imports: [AlbumCollectionModule],
})
export class AlbumListPageComponent extends BaseComponent {}
