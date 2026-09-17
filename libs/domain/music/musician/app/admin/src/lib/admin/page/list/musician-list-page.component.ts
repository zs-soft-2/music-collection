import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { MusicianCollectionModule } from '@music-collection/domain/musician';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-musician-list-page',
	templateUrl: './musician-list-page.component.html',
	styleUrls: ['./musician-list-page.component.scss'],
	imports: [MusicianCollectionModule],
})
export class MusicianListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
