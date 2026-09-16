import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Resolve } from '@angular/router';
import { LabelStateService } from '@music-collection/api';

@Injectable()
export class LabelEditResolverService implements Resolve<void> {
	private labelStateService = inject(LabelStateService);


	public resolve(): void | Observable<void> | Promise<void> {
		this.labelStateService.dispatchChangeNewEntityButtonEnabled(false);
	}
}
