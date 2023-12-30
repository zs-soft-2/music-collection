import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-list-page',
	templateUrl: './document-list-page.component.html',
	styleUrls: ['./document-list-page.component.scss'],
})
export class DocumentListPageComponent extends BaseComponent {}
