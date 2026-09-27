import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { MyRequestFieldRow } from '../my-request.mapper';

/**
 * One field of a request, as the collector reads the answer to it.
 *
 * A new entity is shown as the value alone. There an arrow out of an empty
 * cell claims something changed where nothing did — the catalog simply had
 * no record of it, and every row would say the same nothing on the left.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-my-request-field',
	imports: [...I18N_IMPORTS],
	host: {
		'[attr.data-verdict]': 'field().verdict',
	},
	template: `
		<span class="label">{{ field().labelKey | transloco }}</span>
		<span class="change">
			@if (!isNew()) {
				<span class="was">{{ field().before }}</span>
				<span class="arrow" aria-hidden="true">→</span>
			}
			<span>{{ field().after }}</span>
		</span>
		@if (field().verdict; as verdict) {
			<span class="verdict">{{
				(verdict === 'accepted'
					? 'page.my-request.accepted'
					: 'page.my-request.rejected'
				) | transloco
			}}</span>
		}
		@if (field().reason) {
			<span class="reason">{{ field().reason }}</span>
		}
	`,
	styles: `
		:host {
			display: grid;
			gap: 0.125rem;
			padding-left: 0.75rem;
			font-size: 0.875rem;
			border-left: 2px solid var(--mc-border);
		}

		:host([data-verdict='rejected']) {
			border-left-color: var(--mc-status-bad, #b3261e);
		}

		:host([data-verdict='accepted']) {
			border-left-color: var(--mc-accent);
		}

		.label {
			font-weight: 600;
		}

		.change {
			display: flex;
			flex-wrap: wrap;
			gap: 0.375rem;
			color: var(--mc-text-muted);
		}

		.was {
			color: var(--mc-text-subtle);
			text-decoration: line-through;
		}

		.arrow {
			color: var(--mc-text-subtle);
		}

		.verdict {
			font-weight: 600;
		}

		.reason {
			color: var(--mc-text-muted);
		}
	`,
})
export class MyRequestFieldComponent {
	readonly field = input.required<MyRequestFieldRow>();

	/** True where the request asks for something the catalog does not hold. */
	readonly isNew = input(false);
}
