import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-label-detail-view',
	imports: [...I18N_IMPORTS],
	templateUrl: './label-detail-view.component.html',
	styleUrls: ['./label-detail-view.component.scss'],
})
export class LabelDetailViewComponent extends BaseComponent {}
