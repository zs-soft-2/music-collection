import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-simple-view',
	imports: [...I18N_IMPORTS],
	templateUrl: './document-simple-view.component.html',
	styleUrls: ['./document-simple-view.component.scss'],
})
export class DocumentSimpleViewComponent extends BaseComponent {}
