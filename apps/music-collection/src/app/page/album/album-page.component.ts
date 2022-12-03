import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-page',
	templateUrl: './album-page.component.html',
	styleUrls: ['./album-page.component.scss'],
})
export class AlbumPageComponent {}
