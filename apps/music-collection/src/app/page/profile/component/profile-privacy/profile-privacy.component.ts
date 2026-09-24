import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	CITY_MAX_LENGTH,
	UserLocationLevel,
	countries,
	countryName,
} from '../../../../data/user-location';
import { ProfilePageStore } from '../../profile-page.store';

interface LevelChoice {
	value: UserLocationLevel;
	labelKey: string;
	description: string;
}

/**
 * How much of where the collector is may be shown on the community map. The
 * level is a consent: it decides what is published, not merely what the map
 * draws, so anything a level does not allow never leaves this page.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-privacy',
	imports: [...I18N_IMPORTS],
	template: `
		<fieldset class="levels">
			<legend>
				{{ 'ui.profilePrivacy.show-where-you-collect' | transloco }}
			</legend>

			@for (choice of levels; track choice.value) {
				<label
					class="level"
					[class.selected]="level() === choice.value"
				>
					<input
						type="radio"
						name="mc-location-level"
						[checked]="level() === choice.value"
						(change)="store.setLocation({ level: choice.value })"
					/>
					<span class="level-text">
						<b>{{ choice.labelKey | transloco }}</b>
						<span>{{ choice.description }}</span>
					</span>
				</label>
			}
		</fieldset>

		@if (level() !== 'off') {
			<div class="place">
				<label class="label" for="mc-location-country">{{
					'ui.profilePrivacy.country' | transloco
				}}</label>
				<select
					id="mc-location-country"
					(change)="selectCountry($event)"
				>
					<option value="" [selected]="!store.location().countryCode">
						{{ 'ui.profilePrivacy.not-chosen' | transloco }}
					</option>
					@for (country of countries; track country.code) {
						<option
							[value]="country.code"
							[selected]="
								country.code === store.location().countryCode
							"
						>
							{{ country.name }}
						</option>
					}
				</select>

				@if (level() !== 'country') {
					<label class="label" for="mc-location-city">{{
						'ui.profilePrivacy.city' | transloco
					}}</label>
					<input
						id="mc-location-city"
						type="text"
						autocomplete="address-level2"
						[attr.maxlength]="cityMaxLength"
						[value]="city()"
						(input)="city.set($any($event.target).value)"
						(blur)="saveCity()"
						(keydown.enter)="saveCity()"
					/>
				}
			</div>
		}

		<p class="preview">{{ preview() }}</p>

		<fieldset class="levels">
			<legend>
				{{ 'ui.profilePrivacy.outside-players' | transloco }}
			</legend>

			<label class="level" [class.selected]="store.externalPlayers()">
				<input
					type="checkbox"
					[checked]="store.externalPlayers()"
					(change)="
						store.setExternalPlayers($any($event.target).checked)
					"
				/>
				<span class="level-text">
					<b>{{
						'ui.profilePrivacy.let-me-listen-here' | transloco
					}}</b>
					<span>
						{{ 'ui.profilePrivacy.puts-youtube-s-and' | transloco }}
					</span>
				</span>
			</label>
		</fieldset>

		<fieldset class="levels">
			<legend>
				{{ 'ui.profilePrivacy.usage-measurement' | transloco }}
			</legend>

			<label class="level" [class.selected]="store.measurement()">
				<input
					type="checkbox"
					[checked]="store.measurement()"
					(change)="store.setMeasurement($any($event.target).checked)"
				/>
				<span class="level-text">
					<b>{{
						'ui.profilePrivacy.count-how-the-app' | transloco
					}}</b>
					<span>
						{{
							'ui.profilePrivacy.which-pages-and-features'
								| transloco
						}}
					</span>
				</span>
			</label>
		</fieldset>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
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

		.place {
			display: flex;
			flex-direction: column;
			gap: 0.35rem;
		}

		.label {
			margin-top: 0.5rem;
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		select,
		input[type='text'] {
			padding: 0.55rem 0.7rem;
			font: inherit;
			font-size: 0.9375rem;
			color: var(--mc-text);
			background: var(--mc-bg-muted);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 1px;
			}
		}

		.preview {
			max-width: 52ch;
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}
	`,
})
export class ProfilePrivacyComponent {
	protected readonly store = inject(ProfilePageStore);

	protected readonly countries = countries();
	protected readonly cityMaxLength = CITY_MAX_LENGTH;

	protected readonly levels: LevelChoice[] = [
		{
			value: 'off',
			labelKey: 'ui.profilePrivacy.place.off',
			description:
				'Nothing about where you are leaves your own settings.',
		},
		{
			value: 'country',
			labelKey: 'ui.profilePrivacy.place.country',
			description:
				'You are counted into your country, with nothing that points back to you.',
		},
		{
			value: 'city',
			labelKey: 'ui.profilePrivacy.place.city',
			description: 'A pin on your city, with no name on it.',
		},
		{
			value: 'profile',
			labelKey: 'ui.profilePrivacy.place.profile',
			description:
				'The pin carries your name and picture, and leads to your profile.',
		},
	];

	protected readonly level = computed(() => this.store.location().level);

	/** The field follows what is stored until the user types in it. */
	protected readonly city = linkedSignal(
		() => this.store.location().city ?? ''
	);

	protected readonly preview = computed(() => {
		const { level, countryCode } = this.store.location();

		if (level === 'off') {
			return 'You are not on the map, and nothing of this is published.';
		}

		if (!countryCode) {
			return 'Pick a country, and that is when anything is published.';
		}

		const city = this.city().trim();
		const place =
			level === 'country' || !city
				? countryName(countryCode)
				: `${city}, ${countryName(countryCode)}`;

		if (level === 'profile') {
			return `Others see a pin on ${place} with your name and picture on it.`;
		}

		return `Others see a pin on ${place}. Nothing on it says who you are.`;
	});

	protected selectCountry(event: Event): void {
		const code = (event.target as HTMLSelectElement).value;

		this.store.setLocation({ countryCode: code || null });
	}

	protected saveCity(): void {
		const city = this.city().trim();

		if (city !== (this.store.location().city ?? '')) {
			this.store.setLocation({ city: city || null });
		}
	}
}
