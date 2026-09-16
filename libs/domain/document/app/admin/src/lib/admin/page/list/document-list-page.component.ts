import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BaseComponent } from '@music-collection/api';
import { DocumentCollectionModule } from '@music-collection/domain/document';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-list-page',
	templateUrl: './document-list-page.component.html',
	styleUrls: ['./document-list-page.component.scss'],
	imports: [DocumentCollectionModule],
})
export class DocumentListPageComponent extends BaseComponent {}
