import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { DocumentStateService } from '@music-collection/api';

@Injectable()
export class DocumentEditResolverService implements Resolve<void> {
	public constructor(private documentStateService: DocumentStateService) {}

	public resolve(): void | Observable<void> | Promise<void> {
		this.documentStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
