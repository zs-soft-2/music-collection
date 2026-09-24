import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { CreditGroup } from '../../album.mapper';

/** Credits of the original release, grouped by category, one row per person. */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-album-credits',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		@for (group of groups(); track group.key) {
			<section
				class="group"
				[attr.aria-labelledby]="'credits-' + group.key"
			>
				<h3 class="group-label" [id]="'credits-' + group.key">
					{{ group.label }}
				</h3>
				<ul class="people">
					@for (person of group.people; track person.musicianUid) {
						<li class="person">
							<span class="name">
								<a
									[routerLink]="[
										'/musician',
										person.musicianUid,
									]"
									>{{ person.name }}</a
								>
								@if (person.creditedAs) {
									<span class="credited-as"
										>as {{ person.creditedAs }}</span
									>
								}
							</span>
							<span class="roles">
								@for (role of person.roles; track $index) {
									<span
										class="role"
										[class.limited]="role.tracks"
									>
										{{ role.label }}
										@if (role.tracks) {
											<span class="role-tracks"
												>({{ role.tracks }})</span
											>
										}
									</span>
								}
							</span>
						</li>
					}
				</ul>
			</section>
		}
	`,
	styles: `
		:host {
			display: block;
		}

		.group + .group {
			margin-top: 1.5rem;
		}

		.group-label {
			margin: 0 0 0.5rem;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-text-muted);
		}

		.people {
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.person {
			display: grid;
			grid-template-columns: minmax(9rem, 38%) minmax(0, 1fr);
			gap: 0.4rem 1rem;
			padding: 0.55rem 0;
			border-bottom: 1px solid var(--mc-border);
		}

		.name {
			font-weight: 600;
		}

		.name a {
			color: var(--mc-text);
			text-decoration: none;
		}

		.name a:hover {
			text-decoration: underline;
		}

		.name a:focus-visible {
			outline: 2px solid var(--mc-primary);
			outline-offset: 2px;
		}

		.credited-as {
			display: block;
			font-size: 0.75rem;
			font-weight: 400;
			color: var(--mc-text-subtle);
		}

		.roles {
			display: flex;
			flex-wrap: wrap;
			gap: 0.3rem;
			align-content: flex-start;
		}

		.role {
			padding: 0.1rem 0.5rem;
			font-size: 0.78rem;
			color: var(--mc-text);
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
		}

		.role.limited {
			color: var(--mc-text-muted);
			background: transparent;
		}

		.role-tracks {
			font-variant-numeric: tabular-nums;
		}

		@media (max-width: 560px) {
			.person {
				grid-template-columns: minmax(0, 1fr);
			}
		}
	`,
})
export class AlbumCreditsComponent {
	public readonly groups = input.required<CreditGroup[]>();
}
