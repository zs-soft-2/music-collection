import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS, TextService } from '@music-collection/core/i18n';

import { renderShareCard } from '../../../../data/collector-profile';
import { ProfilePageStore } from '../../profile-page.store';

/** How long the button says it copied before going back to offering it. */
const COPIED_FOR = 2000;

/**
 * Whether the collector has a public page, and what is on it.
 *
 * Two consents, because they are two different readers: a stranger who
 * follows a link and sees a shelf, and the family who reads the wishlist to
 * buy something off it. The page itself is the sharing — switching it off
 * deletes the document — so the section reports what is actually out there
 * rather than what the switch asked for.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-profile-sharing',
	imports: [...I18N_IMPORTS, RouterLink],
	template: `
		<fieldset class="levels">
			<legend>{{ 'ui.profileSharing.page' | transloco }}</legend>

			<label class="level" [class.selected]="store.sharing().shared">
				<input
					type="checkbox"
					[checked]="store.sharing().shared"
					(change)="
						store.setSharing({
							shared: $any($event.target).checked,
						})
					"
				/>
				<span class="level-text">
					<b>{{ 'ui.profileSharing.share' | transloco }}</b>
					<span>{{ 'ui.profileSharing.shareHint' | transloco }}</span>
				</span>
			</label>

			@if (store.sharing().shared) {
				<label
					class="level"
					[class.selected]="store.sharing().shareWishlist"
				>
					<input
						type="checkbox"
						[checked]="store.sharing().shareWishlist"
						(change)="
							store.setSharing({
								shareWishlist: $any($event.target).checked,
							})
						"
					/>
					<span class="level-text">
						<b>{{ 'ui.profileSharing.wishlist' | transloco }}</b>
						<span>{{
							'ui.profileSharing.wishlistHint'
								| transloco: { count: wishes() }
						}}</span>
					</span>
				</label>
			}
		</fieldset>

		@if (store.sharing().shared) {
			<p class="preview">
				{{
					'ui.profileSharing.preview'
						| transloco
							: {
									copies: copies(),
									badges: badges(),
									points: points(),
							  }
				}}
				@if (store.sharing().shareWishlist) {
					{{
						'ui.profileSharing.previewWishlist'
							| transloco: { count: wishes() }
					}}
				}
			</p>

			<div class="link">
				<label class="label" for="mc-collector-link">{{
					'ui.profileSharing.link' | transloco
				}}</label>

				<div class="link-row">
					<input
						id="mc-collector-link"
						type="text"
						readonly
						[value]="store.profileLink()"
						(focus)="$any($event.target).select()"
					/>
					<button type="button" (click)="copy()">
						<i
							class="pi"
							[class.pi-copy]="!copied()"
							[class.pi-check]="copied()"
							aria-hidden="true"
						></i>
						{{
							(copied()
								? 'ui.profileSharing.copied'
								: 'ui.profileSharing.copy'
							) | transloco
						}}
					</button>

					@if (store.profilePath(); as path) {
						<a [routerLink]="path">
							<i
								class="pi pi-external-link"
								aria-hidden="true"
							></i>
							{{ 'ui.profileSharing.look' | transloco }}
						</a>
					}

					<!--
						The picture that travels with the link. A chat shows a
						bare link to this app as a grey rectangle — the app has
						no server rendering, so there is nothing for it to
						preview — and this draws one out of the published page.
					-->
					<button
						type="button"
						[disabled]="drawing()"
						(click)="shareCard()"
					>
						<i class="pi pi-share-alt" aria-hidden="true"></i>
						{{
							(drawing()
								? 'ui.profileSharing.drawing'
								: 'ui.profileSharing.shareCard'
							) | transloco
						}}
					</button>
				</div>

				@if (store.profilePublished()) {
					<p class="stamp">
						{{ 'ui.profileSharing.updated' | transloco }}
						{{ store.profileUpdatedAt() | mcDate: 'medium' }}
					</p>
				} @else {
					<p class="stamp">
						{{ 'ui.profileSharing.pending' | transloco }}
					</p>
				}
			</div>
		} @else {
			<p class="preview">{{ 'ui.profileSharing.off' | transloco }}</p>
		}
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
				font-size: 0.95rem;
			}

			span {
				font-size: 0.8rem;
				color: var(--mc-text-subtle);
			}
		}

		.preview {
			margin: 0;
			font-size: 0.85rem;
			color: var(--mc-text-subtle);
		}

		.link {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
		}

		.label {
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.link-row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;

			input {
				flex: 1 1 14rem;
				min-width: 0;
				padding: 0.55rem 0.7rem;
				font-family: inherit;
				font-size: 0.85rem;
				color: var(--mc-text);
				background: var(--mc-surface-2);
				border: 1px solid var(--mc-border);
				border-radius: var(--mc-radius-md);
			}

			button,
			a {
				display: inline-flex;
				align-items: center;
				gap: 0.4rem;
				text-decoration: none;
				padding: 0.55rem 0.9rem;
				font: inherit;
				font-size: 0.85rem;
				color: var(--mc-text);
				background: var(--mc-surface-2);
				border: 1px solid var(--mc-border);
				border-radius: var(--mc-radius-md);
				cursor: pointer;

				&:hover {
					border-color: var(--mc-primary);
				}
			}
		}

		.stamp {
			margin: 0;
			font-size: 0.8rem;
			color: var(--mc-text-subtle);
		}
	`,
})
export class ProfileSharingComponent {
	protected readonly store = inject(ProfilePageStore);
	private readonly text = inject(TextService);

	/** Set for a moment after the link went to the clipboard. */
	protected readonly copied = signal(false);
	/** Set while the card is being drawn; its covers have to load first. */
	protected readonly drawing = signal(false);

	protected readonly copies = computed(
		() => this.store.profilePreview()?.numbers.copies ?? 0
	);
	protected readonly badges = computed(
		() => this.store.profilePreview()?.badges.length ?? 0
	);
	protected readonly points = computed(
		() => this.store.profilePreview()?.points.total ?? 0
	);
	protected readonly wishes = computed(() => this.store.wishes().length);

	/**
	 * Draws the card and hands it to the share sheet with the link next to
	 * it. Where the browser has no share sheet for files — most desktops —
	 * the picture is saved instead, which is the same job done by hand.
	 */
	protected async shareCard(): Promise<void> {
		const profile = this.store.profilePreview();
		const link = this.store.profileLink();

		if (!profile || !link || this.drawing()) {
			return;
		}

		const translate = this.text.translator();

		this.drawing.set(true);

		try {
			const blob = await renderShareCard(
				profile,
				{
					records: translate('page.collector.records'),
					points: translate('page.collector.points'),
					badges: translate('page.collector.badges'),
					tagline: translate('ui.profileSharing.cardTagline'),
				},
				profile.displayName ?? translate('page.collector.aCollector')
			);
			const file = new File([blob], 'collection.png', {
				type: 'image/png',
			});

			if (navigator.canShare?.({ files: [file] })) {
				await navigator.share({
					files: [file],
					text: translate('ui.profileSharing.shareText'),
					url: link,
				});
			} else {
				this.save(blob);
			}
		} catch (error) {
			// A share sheet the collector closed is not a failure, and
			// neither is a card that could not be drawn: both leave the link,
			// which works on its own.
			console.warn('Collector card not shared', error);
		} finally {
			this.drawing.set(false);
		}
	}

	/** The card as a file, where there is nowhere to share it to. */
	private save(blob: Blob): void {
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');

		anchor.href = url;
		anchor.download = 'collection.png';
		anchor.click();
		URL.revokeObjectURL(url);
	}

	protected async copy(): Promise<void> {
		const link = this.store.profileLink();

		if (!link) {
			return;
		}

		try {
			await navigator.clipboard.writeText(link);
			this.copied.set(true);
			setTimeout(() => this.copied.set(false), COPIED_FOR);
		} catch (error) {
			// A browser that refuses the clipboard leaves the field selected,
			// which is the same job done by hand.
			console.warn('Collector link not copied', error);
		}
	}
}
