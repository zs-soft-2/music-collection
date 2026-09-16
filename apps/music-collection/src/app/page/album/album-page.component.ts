import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AlbumDetailViewModule } from '@music-collection/domain/album';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-page',
	templateUrl: './album-page.component.html',
	styleUrls: ['./album-page.component.scss'],
	imports: [AlbumDetailViewModule],
})
export class AlbumPageComponent {}
