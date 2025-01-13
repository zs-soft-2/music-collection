import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-simple-view',
	templateUrl: './document-simple-view.component.html',
	styleUrls: ['./document-simple-view.component.scss'],
	standalone: false,
})
export class DocumentSimpleViewComponent extends BaseComponent {}
