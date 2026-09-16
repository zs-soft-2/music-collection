import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { LabelCollectionModule } from '@music-collection/domain/label';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-label-list-page',
	templateUrl: './label-list-page.component.html',
	styleUrls: ['./label-list-page.component.scss'],
	imports: [LabelCollectionModule],
})
export class LabelListPageComponent extends BaseComponent {
	public constructor() {
		super();
	}
}
