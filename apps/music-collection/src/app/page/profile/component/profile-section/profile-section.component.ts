import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

/**
 * One setting's card: its name, the line that says what it is for, and the
 * controls themselves.
 *
 * The page used to spell this header out ten times over. Naming it once means
 * every section is titled the same way — and a tab full of cards reads as a
 * list of answers to "what can I change here?" rather than as ten unrelated
 * boxes.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-section',
	imports: [...I18N_IMPORTS],
	template: `
		<header class="head">
			<h2>{{ heading() | transloco }}</h2>
			<p>{{ intro() | transloco }}</p>
		</header>

		<div class="body">
			<ng-content />
		</div>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			padding: 1.5rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);
		}

		.head {
			margin-bottom: 1.25rem;

			h2 {
				margin: 0;
				font-size: 1.125rem;
				font-weight: 600;
			}

			p {
				max-width: 52ch;
				margin: 0.35rem 0 0;
				font-size: 0.875rem;
				color: var(--mc-text-muted);
			}
		}

		/* The controls take whatever height is left, so two cards side by
		   side end their frames together however unequal their contents. */
		.body {
			display: flex;
			flex: 1;
			flex-direction: column;
		}
	`,
})
export class ProfileSectionComponent {
	/** The section's name, as a dictionary key. */
	public readonly heading = input.required<string>();
	/** The line under it, as a dictionary key. */
	public readonly intro = input.required<string>();
}
