import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-label-simple-view',
	imports: [...I18N_IMPORTS],
	templateUrl: './label-simple-view.component.html',
	styleUrls: ['./label-simple-view.component.scss'],
})
export class LabelSimpleViewComponent extends BaseComponent {}
