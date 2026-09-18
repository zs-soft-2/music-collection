import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { ReleaseCollectionModule } from '@music-collection/domain/release';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-list-page',
	templateUrl: './release-list-page.component.html',
	styleUrls: ['./release-list-page.component.scss'],
	imports: [ReleaseCollectionModule],
})
export class ReleaseListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
