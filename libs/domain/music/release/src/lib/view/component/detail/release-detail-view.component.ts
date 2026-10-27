import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-release-detail-view',
	imports: [...I18N_IMPORTS],
	templateUrl: './release-detail-view.component.html',
	styleUrls: ['./release-detail-view.component.scss'],
})
export class ReleaseDetailViewComponent extends BaseComponent {}
