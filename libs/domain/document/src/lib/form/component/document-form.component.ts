import { Observable } from 'rxjs';

import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { DocumentFormParams, BaseComponent } from '@music-collection/api';

import { DocumentFormService } from './document-form.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentFormService],
	selector: 'mc-document-form',
	templateUrl: './document-form.component.html',
	styleUrls: ['./document-form.component.scss'],
})
export class DocumentFormComponent extends BaseComponent implements OnInit {
	public params$!: Observable<DocumentFormParams>;

	public constructor(private componentService: DocumentFormService) {
		super();
	}

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
