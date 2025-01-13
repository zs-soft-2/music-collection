import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-label-list-page',
	templateUrl: './label-list-page.component.html',
	styleUrls: ['./label-list-page.component.scss'],
	standalone: false,
})
export class LabelListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
