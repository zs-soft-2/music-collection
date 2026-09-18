import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { DocumentStateService } from '@music-collection/api';

@Injectable()
export class DocumentListPageResolverService implements Resolve<void> {
	private documentStateService = inject(DocumentStateService);


	public resolve(): void {
		this.documentStateService.dispatchSetSelectedEntityIdAction('');
		this.documentStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
