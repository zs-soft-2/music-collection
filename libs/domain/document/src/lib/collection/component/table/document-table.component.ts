import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import {
	BaseComponent,
	DocumentEntity,
	DocumentTableParams,
} from '@music-collection/api';

import { DocumentTableService } from './document-table.service';
import { Bind } from 'primeng/bind';
import { Table } from 'primeng/table';
import { PrimeTemplate } from 'primeng/api';
import { AutoComplete } from 'primeng/autocomplete';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentTableService],
	selector: 'mc-document-table',
	templateUrl: './document-table.component.html',
	styleUrls: ['./document-table.component.scss'],
	imports: [
		Bind,
		Table,
		PrimeTemplate,
		AutoComplete,
		Ripple,
		ButtonDirective,
		AsyncPipe,
	],
})
export class DocumentTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(DocumentTableService);

	public params$!: Observable<DocumentTableParams>;

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
