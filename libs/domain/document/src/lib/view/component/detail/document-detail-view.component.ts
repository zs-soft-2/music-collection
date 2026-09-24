import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-detail-view',
	imports: [...I18N_IMPORTS],
	templateUrl: './document-detail-view.component.html',
	styleUrls: ['./document-detail-view.component.scss'],
})
export class DocumentDetailViewComponent extends BaseComponent {}
