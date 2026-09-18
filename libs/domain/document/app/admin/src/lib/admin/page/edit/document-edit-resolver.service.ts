import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { DocumentStateService } from '@music-collection/api';

@Injectable()
export class DocumentEditResolverService implements Resolve<void> {
	private documentStateService = inject(DocumentStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		this.documentStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
