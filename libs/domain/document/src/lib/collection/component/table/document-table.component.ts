import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import {
	BaseComponent,
	DocumentEntity,
	DocumentTableParams,
} from '@music-collection/api';

import { DocumentTableService } from './document-table.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentTableService],
	selector: 'mc-document-table',
	templateUrl: './document-table.component.html',
	styleUrls: ['./document-table.component.scss'],
	standalone: false,
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

	public searchHandler(event: any): void {
		this.componentService.searchHandler(event['query']);
	}
}
