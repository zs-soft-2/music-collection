import { Observable } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { DocumentFormParams, BaseComponent } from '@music-collection/api';

import { DocumentFormService } from './document-form.service';
import { ReactiveFormsModule } from '@angular/forms';
import { Bind } from 'primeng/bind';
import { InputText } from 'primeng/inputtext';
import { FileUpload } from 'primeng/fileupload';
import { Image } from 'primeng/image';
import { Button } from 'primeng/button';
import { AsyncPipe } from '@angular/common';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentFormService],
	selector: 'mc-document-form',
	templateUrl: './document-form.component.html',
	styleUrls: ['./document-form.component.scss'],
	imports: [
		ReactiveFormsModule,
		Bind,
		InputText,
		FileUpload,
		Image,
		Button,
		AsyncPipe,
	],
})
export class DocumentFormComponent extends BaseComponent implements OnInit {
	private componentService = inject(DocumentFormService);

	public params$!: Observable<DocumentFormParams>;

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
