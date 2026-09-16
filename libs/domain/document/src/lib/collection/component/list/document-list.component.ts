import {
	ChangeDetectionStrategy,
	Component,
	OnInit,
	inject,
} from '@angular/core';
import { BaseComponent } from '@music-collection/api';

import { DocumentListService } from './document-list.service';

@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DocumentListService],
	selector: 'mc-document-list',
	templateUrl: './document-list.component.html',
	styleUrls: ['./document-list.component.scss'],
})
export class DocumentListComponent extends BaseComponent implements OnInit {
	private componentService = inject(DocumentListService);

	public ngOnInit(): void {
		this.componentService.init$().pipe().subscribe();
	}
}
