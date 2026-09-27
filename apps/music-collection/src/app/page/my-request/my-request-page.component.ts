import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { PageBreadcrumbComponent } from '../../shared/page-breadcrumb';
import { MyRequestPageStore } from './my-request-page.store';

/**
 * The collector's own requests, with the answers to them.
 *
 * A refusal is shown field by field with its reason, because that is what
 * makes it answerable: the collector can come back with better grounds for
 * exactly the field that was turned down.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [MyRequestPageStore],
	selector: 'mc-my-request-page',
	templateUrl: './my-request-page.component.html',
	styleUrls: ['./my-request-page.component.scss'],
	imports: [...I18N_IMPORTS, PageBreadcrumbComponent, RouterLink],
})
export class MyRequestPageComponent {
	protected readonly store = inject(MyRequestPageStore);

	/**
	 * What a collector can ask the catalog to take in. `0` is the new one,
	 * the way the admin's editors name it — the same forms open on it.
	 */
	protected readonly kinds = [
		{
			feature: 'artist',
			icon: 'pi-microphone',
			labelKey: 'page.my-request.add-artist',
		},
		{
			feature: 'album',
			icon: 'pi-circle',
			labelKey: 'page.my-request.add-album',
		},
		{
			feature: 'release',
			icon: 'pi-clone',
			labelKey: 'page.my-request.add-release',
		},
		{
			feature: 'label',
			icon: 'pi-building',
			labelKey: 'page.my-request.add-label',
		},
		{
			feature: 'musician',
			icon: 'pi-user',
			labelKey: 'page.my-request.add-musician',
		},
	];
}
