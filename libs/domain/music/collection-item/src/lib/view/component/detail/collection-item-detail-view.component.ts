import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-collection-item-detail-view',
	imports: [...I18N_IMPORTS],
	templateUrl: './collection-item-detail-view.component.html',
	styleUrls: ['./collection-item-detail-view.component.scss'],
})
export class CollectionItemDetailViewComponent extends BaseComponent {}
