import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from '@music-collection/api';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-document-edit',
	templateUrl: './document-edit.component.html',
	styleUrls: ['./document-edit.component.scss'],
	standalone: false,
})
export class DocumentEditComponent extends BaseComponent implements OnInit {
	public documentId!: string;

	public constructor(private activatedRoute: ActivatedRoute) {
		super();
	}

	public ngOnInit(): void {
		this.documentId = this.activatedRoute.snapshot.params['documentId'];
	}
}
