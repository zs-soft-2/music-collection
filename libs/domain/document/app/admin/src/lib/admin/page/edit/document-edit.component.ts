import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
	private activatedRoute = inject(ActivatedRoute);

	public documentId!: string;

	public ngOnInit(): void {
		this.documentId = this.activatedRoute.snapshot.params['documentId'];
	}
}
