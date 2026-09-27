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
}
