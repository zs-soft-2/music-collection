import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { DocumentListService } from './document-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentListService],
	selector: 'mc-document-list',
	templateUrl: './document-list.component.html',
	styleUrls: ['./document-list.component.scss'],
	standalone: false,
})
export class DocumentListComponent extends BaseComponent implements OnInit {
	public constructor(private componentService: DocumentListService) {
		super();
	}

	public ngOnInit(): void {
		this.componentService.init$().pipe().subscribe();
	}
}
