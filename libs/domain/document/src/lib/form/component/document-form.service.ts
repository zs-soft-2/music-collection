import { combineLatest, Observable, ReplaySubject } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';

import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
	DocumentEntity,
	DocumentEntityAdd,
	DocumentEntityUpdate,
	DocumentFormParams,
	DocumentStateService,
	DocumentUtilService,
} from '@music-collection/api';

@Injectable()
export class DocumentFormService {
	private activatedRoute = inject(ActivatedRoute);
	private documentStateService = inject(DocumentStateService);
	private documentUtilService = inject(DocumentUtilService);
	private componentUtil = inject(DocumentUtilService);
	private router = inject(Router);

	private document!: DocumentEntity | undefined;
	private formGroup!: FormGroup;
	private params!: DocumentFormParams;
	private params$$: ReplaySubject<DocumentFormParams>;
	private selectedFile!: File | undefined;

	public constructor() {
		this.params$$ = new ReplaySubject();
	}

	public cancel(): void {
		this.selectedFile = undefined;
		this.documentStateService.dispatchClearFilePathAction();

		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	public fileUpload(file: File): void {
		this.selectedFile = file;
		this.documentStateService.dispatchUploadFileAction({
			content: this.selectedFile,
			path: this.documentUtilService.createFilePath(
				this.selectedFile.name,
				'/document/'
			),
			meta: { type: 'image' },
		});
	}

	public init$(): Observable<DocumentFormParams> {
		return this.activatedRoute.params.pipe(
			switchMap((data) =>
				combineLatest([
					this.documentStateService.selectEntityById$(
						data['documentId']
					),
					this.documentStateService.selectFilePath$(),
				])
			),
			switchMap(([document, filePath]) => {
				this.document = document;
				this.formGroup = this.updateFormGroup(
					document,
					this.formGroup,
					this.selectedFile,
					filePath
				);

				this.params = this.createDocumentParams(this.formGroup);

				this.params$$.next(this.params);

				return this.params$$;
			})
		);
	}

	public submit(): void {
		if (this.document) {
			this.updateDocument();
		} else {
			this.addDocument();
		}

		this.selectedFile = undefined;
		this.documentStateService.dispatchClearFilePathAction();

		this.router.navigate(['../../list'], {
			relativeTo: this.activatedRoute,
		});
	}

	private addDocument(): void {
		const document: DocumentEntityAdd = this.componentUtil.createEntity(
			this.params.formGroup
		);

		this.documentStateService.dispatchAddEntityAction(document);
	}

	private createDocumentParams(formGroup: FormGroup): DocumentFormParams {
		const documentFormParams: DocumentFormParams = {
			formGroup,
		};

		return documentFormParams;
	}

	private updateDocument(): void {
		const document: DocumentEntityUpdate = this.componentUtil.updateEntity(
			this.params.formGroup
		);

		this.documentStateService.dispatchUpdateEntityAction(document);
	}

	private updateFormGroup(
		document: DocumentEntity | undefined,
		formGroup: FormGroup | undefined,
		file: File | undefined,
		filePath: string | undefined
	): FormGroup {
		return this.documentUtilService.createFormGroupByProperties({
			...document,
			name: formGroup?.value['name'] || document?.name || undefined,
			filePath:
				filePath ||
				formGroup?.value['filePath'] ||
				document?.filePath ||
				undefined,
			fileType:
				file?.type ||
				formGroup?.value['fileType'] ||
				document?.fileType ||
				undefined,
			originalName:
				file?.name ||
				formGroup?.value['originalName'] ||
				document?.originalName ||
				undefined,
			uid: formGroup?.value['uid'] || document?.uid || undefined,
		});
	}
}
