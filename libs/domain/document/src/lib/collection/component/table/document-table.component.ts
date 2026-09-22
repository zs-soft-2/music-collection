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
	DocumentFilterEnum,
	DocumentTableParams,
	isWithdrawnDocument,
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

	/** The document waiting for the withdrawal to be confirmed, if any. */
	public readonly pendingWithdrawal = this.componentService.pendingWithdrawal;

	/** The sets an admin can look at; the generated ones have their own. */
	public readonly filters: { value: DocumentFilterEnum; label: string }[] = [
		{ value: DocumentFilterEnum.All, label: 'All' },
		{ value: DocumentFilterEnum.Badge, label: 'Badges' },
		{ value: DocumentFilterEnum.Other, label: 'Uploads' },
		{ value: DocumentFilterEnum.Withdrawn, label: 'Withdrawn' },
	];

	public askWithdrawal(document: DocumentEntity): void {
		this.componentService.askWithdrawal(document);
	}

	public cancelWithdrawal(): void {
		this.componentService.cancelWithdrawal();
	}

	public clearSearch(): void {
		this.componentService.clearSearch();
	}

	public confirmWithdrawal(): void {
		this.componentService.confirmWithdrawal();
	}

	public editDocument(document: DocumentEntity): void {
		this.componentService.editDocument(document);
	}

	/** The file itself, when the document is an image. */
	public imageOf(document: DocumentEntity): string | null {
		return document.fileType?.startsWith('image/')
			? document.filePath || null
			: null;
	}

	public isWithdrawn(document: DocumentEntity): boolean {
		return isWithdrawnDocument(document);
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public restoreDocument(document: DocumentEntity): void {
		this.componentService.restoreDocument(document);
	}

	public searchHandler(event: any): void {
		this.componentService.searchHandler(event['query']);
	}

	public setFilter(filter: DocumentFilterEnum): void {
		this.componentService.setFilter(filter);
	}
}
