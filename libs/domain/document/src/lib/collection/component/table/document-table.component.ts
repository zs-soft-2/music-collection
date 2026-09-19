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
import { Table, SortableColumn, SortIcon } from 'primeng/table';
import { AutoComplete } from 'primeng/autocomplete';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import { DataView } from 'primeng/dataview';
import {
	CollectionViewToggleComponent,
	EntityCardComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentTableService],
	selector: 'mc-document-table',
	templateUrl: './document-table.component.html',
	styleUrls: ['./document-table.component.scss'],
	imports: [
		Bind,
		Table,
		SortableColumn,
		SortIcon,
		AutoComplete,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		DataView,
		CollectionViewToggleComponent,
		EntityCardComponent,
	],
})
export class DocumentTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(DocumentTableService);

	public params$!: Observable<DocumentTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	/** The file itself, when the document is an image. */
	public imageOf(document: DocumentEntity): string | null {
		return document.fileType?.startsWith('image/')
			? document.filePath || null
			: null;
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
