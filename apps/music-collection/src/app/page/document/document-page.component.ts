import { DatePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { AdminEditLinkComponent } from '../../shared/music-ui';
import { DocumentPageStore } from './document-page.store';
import { EntityFact, EntityFactsComponent } from '../../shared/entity-view';
import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';

/**
 * The document page: what an uploaded file is, and the file itself. An image
 * and a PDF are shown here; anything else is offered to be opened, because a
 * page that cannot render a file should not pretend it has.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DatePipe, DocumentPageStore],
	selector: 'mc-document-page',
	templateUrl: './document-page.component.html',
	styleUrls: ['./document-page.component.scss'],
	imports: [
		...I18N_IMPORTS,
		PageBreadcrumbComponent,
		RouterLink,
		EntityFactsComponent,
		AdminEditLinkComponent,
	],
})
export class DocumentPageComponent {
	private readonly datePipe = inject(DatePipe);
	private readonly sanitizer = inject(DomSanitizer);

	protected readonly store = inject(DocumentPageStore);

	/**
	 * The file's own address, marked safe to frame: it is the download URL
	 * this catalog wrote itself, not something a reader supplied.
	 */
	protected readonly framedUrl = computed(() => {
		const url = this.store.fileUrl();

		return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
	});

	protected readonly facts = computed<EntityFact[]>(() => {
		const document = this.store.document();
		const withdrawnAt = this.store.withdrawnAt();

		return [
			{
				labelKey: 'fact.originalName',
				value: document?.originalName ?? null,
			},
			{
				labelKey: 'fact.madeFor',
				value: document?.category ?? 'Uploaded by hand',
			},
			{ labelKey: 'fact.fileType', value: document?.fileType ?? null },
			{
				labelKey: 'fact.lastChange',
				value: document?.updatedAt
					? this.datePipe.transform(document.updatedAt, 'medium')
					: null,
			},
			{
				labelKey: 'fact.withdrawn',
				value: withdrawnAt
					? this.datePipe.transform(withdrawnAt, 'medium')
					: null,
			},
			{
				labelKey: 'fact.file',
				value: this.store.fileUrl() ? 'Open in a new tab' : null,
				href: this.store.fileUrl(),
			},
		];
	});
}
