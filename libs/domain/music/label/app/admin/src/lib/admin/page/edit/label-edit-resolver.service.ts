import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { LabelStateService } from '@music-collection/api';

@Injectable()
export class LabelEditResolverService implements Resolve<void> {
	private labelStateService = inject(LabelStateService);

	/** Loads the label when the page is opened directly (id 0 = new). */
	public resolve(route: ActivatedRouteSnapshot): void {
		const labelId = route.paramMap.get('labelId');

		this.labelStateService.dispatchChangeNewEntityButtonEnabled(false);

		if (labelId && labelId !== '0') {
			this.labelStateService.dispatchLoadEntityAction(labelId);
		}
	}
}
