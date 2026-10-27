import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';
import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	computed,
	inject,
} from '@angular/core';
import {
	DOCUMENT_CATEGORIES,
	DocumentFormParams,
	BaseComponent,
} from '@music-collection/api';

import { DocumentFormService } from './document-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { InputText } from 'primeng/inputtext';
import { FileUpload } from 'primeng/fileupload';
import { Image } from 'primeng/image';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentFormService],
	selector: 'mc-document-form',
	templateUrl: './document-form.component.html',
	styleUrls: ['./document-form.component.scss'],
	imports: [
		...I18N_IMPORTS,
		ReactiveFormsModule,
		Bind,
		InputText,
		FileUpload,
		Image,
		Select,
		Button,
		AsyncPipe,
	],
})
export class DocumentFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(DocumentFormService);
	private text = inject(TextService);

	public params$!: Observable<DocumentFormParams>;

	/**
	 * What the document can be filed as, in the language in force. Built
	 * from `text.catalog()` so that a language switch re-makes the labels
	 * instead of leaving the first ones on the page.
	 */
	public readonly categoryOptions = computed(() => {
		const label = this.text.catalog();

		return DOCUMENT_CATEGORIES.map((category) => ({
			label: label('documentCategory', category),
			value: category,
		}));
	});

	public cancel(): void {
		this.componentService.cancel();
	}

	public ngOnInit(): void {
		this.params$ = this.componentService.init$();
	}

	public fileUpload(event: any): void {
		this.componentService.fileUpload(event['files'][0]);
	}

	public submit(): void {
		this.componentService.submit();
	}
}
