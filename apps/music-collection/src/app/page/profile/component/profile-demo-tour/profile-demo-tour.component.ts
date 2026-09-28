import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ProfilePageStore } from '../../profile-page.store';

/**
 * The guided tour's switch, and the one place it can be started from other
 * than the launcher itself. It is here rather than only in the corner of the
 * screen because the launcher is what a collector who has seen the tour wants
 * gone — and the last stop of the tour is this very section, so they know
 * where to come.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-demo-tour',
	imports: [...I18N_IMPORTS],
	template: `
		<fieldset>
			<legend>{{ 'ui.profileDemoTour.the-launcher' | transloco }}</legend>

			<label class="level" [class.selected]="store.demoTour()">
				<input
					type="checkbox"
					[checked]="store.demoTour()"
					(change)="store.setDemoTour($any($event.target).checked)"
				/>
				<span class="level-text">
					<b>{{ 'ui.profileDemoTour.show-me-around' | transloco }}</b>
					<span>
						{{
							'ui.profileDemoTour.puts-the-play-button'
								| transloco
						}}
					</span>
				</span>
			</label>
		</fieldset>

		@if (store.demoTour()) {
			<button type="button" class="start" (click)="store.startDemoTour()">
				<i class="pi pi-play-circle" aria-hidden="true"></i>
				{{ 'ui.profileDemoTour.start-the-tour-now' | transloco }}
			</button>
		}
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		fieldset {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			padding: 0;
			margin: 0;
			border: 0;
		}

		legend {
			padding: 0;
			margin-bottom: 0.5rem;
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.level {
			display: flex;
			align-items: flex-start;
			gap: 0.6rem;
			padding: 0.7rem 0.9rem;
			background: var(--mc-surface-2);
			border: 1px solid transparent;
			border-radius: var(--mc-radius-md);
			cursor: pointer;

			&.selected {
				border-color: var(--mc-primary);
			}

			input {
				margin-top: 0.2rem;
				accent-color: var(--mc-primary);
			}
		}

		.level-text {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;

			b {
				font-size: 0.9375rem;
				font-weight: 600;
			}

			span {
				font-size: 0.8125rem;
				color: var(--mc-text-muted);
			}
		}

		.start {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.55rem 1rem;
			font: inherit;
			font-size: 0.875rem;
			font-weight: 600;
			color: var(--mc-on-primary);
			background: var(--mc-primary);
			border: 0;
			border-radius: var(--mc-radius-md);
			cursor: pointer;

			&:hover {
				filter: brightness(1.1);
			}

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 2px;
			}
		}
	`,
})
export class ProfileDemoTourComponent {
	protected readonly store = inject(ProfilePageStore);
}
