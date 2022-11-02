import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { DocumentStateService } from '@music-collection/api';

@Injectable()
export class DocumentListPageResolverService implements Resolve<void> {
	constructor(private documentStateService: DocumentStateService) {}

	public resolve(): void {
		this.documentStateService.dispatchSetSelectedEntityIdAction('');
		this.documentStateService.dispatchChangeNewEntityButtonEnabled(true);
	}
}
