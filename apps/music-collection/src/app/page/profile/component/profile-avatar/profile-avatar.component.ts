import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { AvatarLook, DEFAULT_AVATAR } from '../../../../data/avatar';
import { AvatarFigureComponent } from '../../../../shared/avatar';
import { ProfilePageStore } from '../../profile-page.store';
import { AvatarEditorComponent } from './avatar-editor.component';

/**
 * The collector's own character, which stands in for a photo.
 *
 * Only the preview and the way in live here; the editor itself is a screen
 * of its own and is not loaded — nor is a single garment fetched — until
 * somebody opens it. A profile that nobody builds a character on stays as
 * light as it was.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-avatar',
	imports: [...I18N_IMPORTS, AvatarFigureComponent, AvatarEditorComponent],
	template: `
		<div class="row">
			@if (store.avatarPicture(); as picture) {
				<img class="portrait shot" [src]="picture" alt="" />
			} @else if (look(); as built) {
				<!--
					A character with no picture kept for it yet: saved, but the
					upload did not finish. Rare, and worth the layers.
				-->
				<mc-avatar-figure
					class="portrait figure"
					[look]="built"
					size="small"
				/>
			} @else {
				<div class="portrait empty">
					<i class="pi pi-user" aria-hidden="true"></i>
				</div>
			}

			<div class="what">
				<p>
					{{
						(look()
							? 'ui.profileAvatar.yours'
							: 'ui.profileAvatar.none'
						) | transloco
					}}
				</p>

				<div class="actions">
					<button
						type="button"
						class="primary"
						[disabled]="store.avatarSaving()"
						(click)="editing.set(true)"
					>
						<i class="pi pi-palette" aria-hidden="true"></i>
						{{
							(look()
								? 'ui.profileAvatar.edit'
								: 'ui.profileAvatar.build'
							) | transloco
						}}
					</button>

					@if (look()) {
						<button
							type="button"
							[disabled]="store.avatarSaving()"
							(click)="store.clearAvatar()"
						>
							{{ 'ui.profileAvatar.remove' | transloco }}
						</button>
					}
				</div>

				<p class="note">
					{{ 'ui.profileAvatar.note' | transloco }}
					@if (store.avatarSavedAt()) {
						<span class="saved">{{
							'ui.profileAvatar.saved' | transloco
						}}</span>
					}
				</p>
			</div>
		</div>

		@defer (when editing()) {
			@if (editing()) {
				<mc-avatar-editor
					[initial]="look() ?? fresh"
					[saving]="store.avatarSaving()"
					(save)="keep($event)"
					(closed)="editing.set(false)"
				/>
			}
		} @placeholder {
			<span></span>
		} @loading (minimum 200ms) {
			<p class="note">{{ 'common.loading' | transloco }}</p>
		}
	`,
	styles: `
		:host {
			display: block;
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 1rem;
			align-items: flex-start;
		}

		.portrait {
			width: 6rem;
			flex: none;
			overflow: hidden;
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
		}

		// The kept picture is the head-and-shoulders square; the stacked
		// figure, which only stands in when there is no picture, is the whole
		// character and so is taller.
		.portrait.shot,
		.portrait.empty {
			aspect-ratio: 1;
		}

		.portrait.shot {
			object-fit: cover;
		}

		.portrait.empty {
			display: grid;
			place-items: center;
			font-size: 1.75rem;
			color: var(--mc-text-subtle);
			background: var(--mc-surface-2);
		}

		.what {
			display: flex;
			flex-direction: column;
			gap: 0.6rem;
			min-width: min(100%, 16rem);
			flex: 1;
		}

		p {
			margin: 0;
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		button {
			display: inline-flex;
			gap: 0.45rem;
			align-items: center;
			padding: 0.55rem 1rem;
			font: inherit;
			font-size: 0.875rem;
			color: var(--mc-text);
			background: var(--mc-surface-2);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			cursor: pointer;

			&:hover:not(:disabled) {
				border-color: var(--mc-primary);
			}

			&:disabled {
				opacity: 0.55;
				cursor: default;
			}

			&.primary {
				font-weight: 600;
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}
		}

		.note {
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}

		.saved {
			margin-left: 0.35rem;
			color: var(--mc-status-ok);
		}
	`,
})
export class ProfileAvatarComponent {
	protected readonly store = inject(ProfilePageStore);

	protected readonly editing = signal(false);
	protected readonly look = computed(() => this.store.avatar());
	/** What the editor opens on when there is no character yet. */
	protected readonly fresh = DEFAULT_AVATAR;

	protected keep(look: AvatarLook): void {
		this.store.saveAvatar(look);
		this.editing.set(false);
	}
}
