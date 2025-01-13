import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-detail-view',
	templateUrl: './document-detail-view.component.html',
	styleUrls: ['./document-detail-view.component.scss'],
	standalone: false,
})
export class DocumentDetailViewComponent extends BaseComponent {}
