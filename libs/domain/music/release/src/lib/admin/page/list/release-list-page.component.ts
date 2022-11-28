import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-list-page',
	templateUrl: './release-list-page.component.html',
	styleUrls: ['./release-list-page.component.scss'],
})
export class ReleaseListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
