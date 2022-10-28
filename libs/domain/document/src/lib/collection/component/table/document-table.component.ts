import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	DocumentEntity,
	DocumentTableParams,
	BaseComponent,
} from '@music-collection/api';
import { Observable } from 'rxjs';

import { DocumentTableService } from './document-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentTableService],
	selector: 'mc-document-table',
	templateUrl: './document-table.component.html',
	styleUrls: ['./document-table.component.scss'],
})
export class DocumentTableComponent extends BaseComponent implements OnInit {
	public params$!: Observable<DocumentTableParams>;

	public constructor(private componentService: DocumentTableService) {
		super();
	}

	public deleteDocument(document: DocumentEntity): void {
		console.log(document);
	}

	public editDocument(document: DocumentEntity): void {
		this.componentService.editDocument(document);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}
}
