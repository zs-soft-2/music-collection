import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	linkedSignal,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { ProfilePageStore } from '../../profile-page.store';

/**
 * Who the user is in the app: the photo and address come from the sign-in
 * provider, the display name is theirs to change.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-account',
	imports: [...I18N_IMPORTS],
	template: `
		<div class="identity">
			@if (photo(); as url) {
				<img
					class="avatar"
					[src]="url"
					alt=""
					referrerpolicy="no-referrer"
					(error)="failedPhoto.set(url)"
				/>
			} @else {
				<span class="avatar">{{ store.initials() || '?' }}</span>
			}

			<div class="who">
				<b>{{ store.displayName() || 'Nameless collector' }}</b>
				@if (store.email(); as email) {
					<span>{{ email }}</span>
				}
			</div>
		</div>

		<label class="label" for="mc-display-name">{{
			'ui.profileAccount.display-name' | transloco
		}}</label>
		<div class="row">
			<input
				id="mc-display-name"
				type="text"
				autocomplete="nickname"
				[value]="name()"
				[disabled]="store.saving()"
				(input)="name.set($any($event.target).value)"
				(keydown.enter)="save()"
			/>
			<button
				type="button"
				[disabled]="!changed() || store.saving()"
				(click)="save()"
			>
				{{
					(store.saving() ? 'common.saving' : 'common.save')
						| transloco
				}}
			</button>
		</div>

		<p class="note">
			{{ 'ui.profileAccount.note' | transloco }}
			@if (store.savedAt()) {
				<span class="saved">{{
					'ui.profileAccount.saved' | transloco
				}}</span>
			}
		</p>
	`,
	styles: `
		:host {
			display: flex;
			flex-direction: column;
			gap: 1rem;
		}

		.identity {
			display: flex;
			align-items: center;
			gap: 1rem;
		}

		.avatar {
			display: grid;
			place-items: center;
			width: 4rem;
			height: 4rem;
			object-fit: cover;
			font-size: 1.25rem;
			font-weight: 600;
			color: var(--mc-text);
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border);
			border-radius: 50%;
		}

		.who {
			display: flex;
			flex-direction: column;
			gap: 0.15rem;
			min-width: 0;

			b {
				font-size: 1.1rem;
			}

			span {
				font-size: 0.875rem;
				color: var(--mc-text-muted);
				overflow-wrap: anywhere;
			}
		}

		.label {
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		input {
			flex: 1 1 14rem;
			padding: 0.6rem 0.75rem;
			font: inherit;
			color: var(--mc-text);
			background: var(--mc-bg-muted);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);

			&:focus-visible {
				outline: 2px solid var(--mc-primary);
				outline-offset: 1px;
			}

			&:disabled {
				opacity: 0.6;
			}
		}

		button {
			padding: 0.6rem 1.1rem;
			font: inherit;
			font-weight: 600;
			color: var(--mc-on-primary);
			background: var(--mc-primary);
			border: 0;
			border-radius: var(--mc-radius-md);
			cursor: pointer;

			&:disabled {
				background: var(--mc-surface-2);
				color: var(--mc-text-subtle);
				cursor: default;
			}
		}

		.note {
			margin: 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}

		.saved {
			margin-left: 0.35rem;
			color: var(--mc-status-ok);
		}
	`,
})
export class ProfileAccountComponent {
	protected readonly store = inject(ProfilePageStore);

	/** The field follows the account until the user types in it. */
	protected readonly name = linkedSignal(() => this.store.displayName());

	/** A photo the provider refuses to serve stands in as the initials. */
	protected readonly failedPhoto = signal<string | null>(null);
	protected readonly photo = computed(() => {
		const url = this.store.photoUrl();

		return url && url !== this.failedPhoto() ? url : null;
	});

	protected readonly changed = computed(
		() =>
			!!this.name().trim() &&
			this.name().trim() !== this.store.displayName()
	);

	protected save(): void {
		this.store.saveDisplayName(this.name());
	}
}
