import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import { FormsModule } from '@angular/forms';
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
import { AutoComplete } from 'primeng/autocomplete';
import { Ripple } from 'primeng/ripple';
import { ButtonDirective } from 'primeng/button';
import { AsyncPipe, DatePipe } from '@angular/common';
import {
	CollectionColumnDirective,
	CollectionListComponent,
	EntityCardComponent,
	ViewActionComponent,
} from '@music-collection/ui';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentTableService],
	selector: 'mc-document-table',
	templateUrl: './document-table.component.html',
	styleUrls: ['./document-table.component.scss'],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Ripple,
		ButtonDirective,
		AsyncPipe,
		DatePipe,
		CollectionColumnDirective,
		CollectionListComponent,
		EntityCardComponent,
		ViewActionComponent,
	],
})
export class DocumentTableComponent extends BaseComponent implements OnInit {
	private componentService = inject(DocumentTableService);

	public params$!: Observable<DocumentTableParams>;

	public readonly collectionView = this.componentService.collectionView;

	public readonly place = this.componentService.place;

	/** The document waiting for the withdrawal to be confirmed, if any. */
	public readonly pendingWithdrawal = this.componentService.pendingWithdrawal;

	/** The sets an admin can look at; the generated ones have their own. */
	public readonly filters: { value: DocumentFilterEnum; labelKey: string }[] =
		[
			{ value: DocumentFilterEnum.All, labelKey: 'common.all' },
			{
				value: DocumentFilterEnum.Badge,
				labelKey: 'ui.documentTable.badges',
			},
			{
				value: DocumentFilterEnum.Other,
				labelKey: 'ui.documentTable.uploads',
			},
			{
				value: DocumentFilterEnum.Withdrawn,
				labelKey: 'ui.documentTable.withdrawn',
			},
		];

	/** Withdrawn documents are faded, so the list says which are on offer. */
	public readonly withdrawnClass = (document: DocumentEntity): string =>
		isWithdrawnDocument(document) ? 'is-withdrawn' : '';

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

	/** Where the eye leads: the page that shows this document. */
	public viewLink(document: DocumentEntity): unknown[] {
		return this.componentService.viewLink(document);
	}
}
