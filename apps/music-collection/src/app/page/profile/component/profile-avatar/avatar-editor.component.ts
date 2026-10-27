import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	linkedSignal,
	output,
	signal,
} from '@angular/core';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	AvatarEffect,
	AvatarHair,
	AvatarLayerSize,
	AvatarLook,
	AvatarView,
	DEFAULT_AVATAR,
	avatarHairThumbnail,
	renderAvatar,
	sameAvatarLook,
} from '../../../../data/avatar';
import { AvatarFigureComponent } from '../../../../shared/avatar';
import { AVATAR_GROUPS } from './avatar-choices';

/**
 * Where the collector builds their character: the figure on one side, every
 * choice on the other, and the picture only kept when they say so.
 *
 * It takes the whole screen. Twelve groups of choices and a figure worth
 * looking at do not fit beside a settings page, and the character is the
 * kind of thing somebody sits down with rather than adjusts in passing.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-avatar-editor',
	imports: [...I18N_IMPORTS, AvatarFigureComponent],
	// Escape closes it, like every other layer over the page. Nothing is
	// lost by it: the character is only kept when the collector saves.
	host: { '(document:keydown.escape)': 'closed.emit()' },
	template: `
		<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="mc-avatar-title">
			<header>
				<h2 id="mc-avatar-title">
					{{ 'ui.avatarEditor.title' | transloco }}
				</h2>

				<button type="button" class="ghost" (click)="closed.emit()">
					<i class="pi pi-times" aria-hidden="true"></i>
					{{ 'common.close' | transloco }}
				</button>
			</header>

			<div class="body">
				<section class="stage" [class.is-zoomed]="zoomed()">
					<mc-avatar-figure
						[look]="look()"
						[view]="view()"
						[size]="layers"
					/>

					<div class="stage-controls">
						<button
							type="button"
							[attr.aria-pressed]="view() === 'back'"
							(click)="turn()"
						>
							<i class="pi pi-refresh" aria-hidden="true"></i>
							{{
								(view() === 'back'
									? 'ui.avatarEditor.front'
									: 'ui.avatarEditor.back'
								) | transloco
							}}
						</button>

						<button
							type="button"
							[attr.aria-pressed]="zoomed()"
							(click)="zoomed.set(!zoomed())"
						>
							<i class="pi pi-search-plus" aria-hidden="true"></i>
							{{
								(zoomed()
									? 'ui.avatarEditor.whole'
									: 'ui.avatarEditor.closer'
								) | transloco
							}}
						</button>
					</div>
				</section>

				<div class="choices">
					@for (group of groups; track group.key) {
						@let hidden = group.shows && !group.shows(look());

						<fieldset [class.is-muted]="hidden">
							<legend>
								{{
									'ui.avatarEditor.group.' + group.key
										| transloco
								}}
							</legend>

							<div
								class="options"
								[class.with-thumbnails]="group.thumbnails"
							>
								@for (value of group.values; track value) {
									<button
										type="button"
										[class.selected]="
											look()[group.key] === value
										"
										[attr.aria-pressed]="
											look()[group.key] === value
										"
										(click)="choose(group.key, value)"
									>
										@if (group.thumbnails) {
											<img
												[src]="thumbnail(value)"
												alt=""
												loading="lazy"
											/>
										}
										<span>{{
											'ui.avatarEditor.' +
												group.key +
												'.' +
												value | transloco
										}}</span>
									</button>
								}
							</div>

							@if (hidden) {
								<p class="hint">
									{{
										'ui.avatarEditor.needs.' + group.key
											| transloco
									}}
								</p>
							}
						</fieldset>
					}
				</div>
			</div>

			<footer>
				<button type="button" class="ghost" (click)="reset()">
					{{ 'ui.avatarEditor.reset' | transloco }}
				</button>

				<button
					type="button"
					class="ghost"
					[disabled]="downloading()"
					(click)="download()"
				>
					<i class="pi pi-download" aria-hidden="true"></i>
					{{ 'ui.avatarEditor.download' | transloco }}
				</button>

				<span class="spacer"></span>

				<button type="button" class="ghost" (click)="closed.emit()">
					{{ 'common.cancel' | transloco }}
				</button>

				<button
					type="button"
					class="primary"
					[disabled]="saving() || !changed()"
					(click)="save.emit(look())"
				>
					{{
						(saving() ? 'common.saving' : 'common.save') | transloco
					}}
				</button>
			</footer>
		</div>
	`,
	styles: `
		:host {
			position: fixed;
			inset: 0;
			z-index: 60;
			display: grid;
			place-items: center;
			padding: max(0.5rem, env(safe-area-inset-top)) 0.5rem 0.5rem;
			background: color-mix(in srgb, var(--mc-bg) 80%, black);
			backdrop-filter: blur(6px);
		}

		.sheet {
			display: flex;
			flex-direction: column;
			width: min(72rem, 100%);
			height: min(56rem, 100%);
			overflow: hidden;
			background: var(--mc-surface);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg, 1rem);
			box-shadow: 0 1.5rem 4rem rgb(0 0 0 / 45%);
		}

		header,
		footer {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			align-items: center;
			padding: 0.75rem 1rem;
			background: var(--mc-surface-2);
		}

		header {
			justify-content: space-between;
			border-bottom: 1px solid var(--mc-border);
		}

		footer {
			border-top: 1px solid var(--mc-border);
			padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
		}

		h2 {
			margin: 0;
			font-size: 1.05rem;
		}

		.spacer {
			flex: 1;
		}

		.body {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
			min-height: 0;
			flex: 1;
		}

		.stage {
			display: flex;
			flex-direction: column;
			gap: 0.75rem;
			align-items: center;
			justify-content: center;
			min-height: 0;
			padding: 1rem;
			overflow: hidden;
			background:
				radial-gradient(
					circle at 50% 35%,
					var(--mc-surface-2),
					var(--mc-bg-muted) 70%
				);
		}

		mc-avatar-figure {
			width: auto;
			height: 100%;
			min-height: 0;
			aspect-ratio: 2 / 3;
			overflow: hidden;
			border-radius: var(--mc-radius-md);
			transition: transform var(--mc-duration, 220ms) ease;
		}

		// The trousers are a quarter of the figure and half the choices are
		// about their cut, so there is a way to get close to them.
		.stage.is-zoomed mc-avatar-figure {
			transform: scale(2.4) translateY(18%);
		}

		.stage-controls {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
			justify-content: center;
		}

		.choices {
			min-height: 0;
			padding: 1rem 1.25rem;
			overflow-y: auto;
			overscroll-behavior: contain;
			border-left: 1px solid var(--mc-border);
		}

		fieldset {
			padding: 0 0 1rem;
			margin: 0 0 1rem;
			border: 0;
			border-bottom: 1px solid var(--mc-border);

			&:last-of-type {
				border-bottom: 0;
			}
		}

		fieldset.is-muted .options {
			opacity: 0.45;
		}

		legend {
			padding: 0;
			margin-bottom: 0.6rem;
			font-size: 0.75rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.options {
			display: grid;
			grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
			gap: 0.4rem;
		}

		.options.with-thumbnails {
			grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));

			button {
				justify-content: flex-start;
				text-align: left;
			}

			img {
				width: 2.5rem;
				height: 2.75rem;
				object-fit: cover;
				border-radius: var(--mc-radius-sm, 0.25rem);
				flex: none;
			}
		}

		.hint {
			margin: 0.5rem 0 0;
			font-size: 0.8125rem;
			color: var(--mc-text-muted);
		}

		button {
			display: inline-flex;
			gap: 0.45rem;
			align-items: center;
			justify-content: center;
			padding: 0.55rem 0.8rem;
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

			&.selected {
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}

			&.ghost {
				background: transparent;
			}

			&.primary {
				font-weight: 600;
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}
		}

		@media (max-width: 60rem) {
			:host {
				padding: 0;
			}

			.sheet {
				width: 100%;
				height: 100%;
				border: 0;
				border-radius: 0;
			}

			.body {
				grid-template-columns: 1fr;
				grid-template-rows: minmax(0, 40dvh) minmax(0, 1fr);
			}

			.choices {
				border-top: 1px solid var(--mc-border);
				border-left: 0;
			}
		}
	`,
})
export class AvatarEditorComponent {
	/** The character to open on: the saved one, or a fresh default. */
	public readonly initial = input<AvatarLook>(DEFAULT_AVATAR);
	public readonly saving = input(false);

	public readonly save = output<AvatarLook>();
	public readonly closed = output<void>();

	private readonly avatars = inject(AvatarEffect);

	/**
	 * Which cut of the wardrobe this screen draws. Read once, when the editor
	 * opens: turning a phone sideways would otherwise fetch every layer
	 * again, and the pictures scale to the stage either way.
	 *
	 * The breakpoint is the one the layout changes at, below which the stage
	 * is 40dvh and the small set is past telling apart.
	 */
	protected readonly layers: AvatarLayerSize = matchMedia('(max-width: 60rem)')
		.matches
		? 'small'
		: 'large';

	protected readonly groups = AVATAR_GROUPS;
	/** The character being built: the saved one until it is changed. */
	protected readonly look = linkedSignal<AvatarLook>(() => this.initial());
	protected readonly view = signal<AvatarView>('front');
	protected readonly zoomed = signal(false);
	protected readonly downloading = signal(false);

	protected readonly changed = computed(
		() => !sameAvatarLook(this.look(), this.initial())
	);

	protected choose(key: keyof AvatarLook, value: string): void {
		this.look.update((look) => ({ ...look, [key]: value }));
	}

	/**
	 * The picture a hair choice is offered with. The groups are one list of
	 * differently-typed choices, so what reaches here is a plain string; the
	 * group that asks for a thumbnail is the hair one, and only it.
	 */
	protected thumbnail(hair: string): string {
		return this.avatars.layerUrl(avatarHairThumbnail(hair as AvatarHair));
	}

	protected turn(): void {
		this.view.update((view) => (view === 'front' ? 'back' : 'front'));
	}

	protected reset(): void {
		this.look.set(DEFAULT_AVATAR);
		this.view.set('front');
		this.zoomed.set(false);
	}

	/**
	 * Hands the collector the whole figure as it stands, in the view they
	 * are looking at — what the profile keeps is a head-and-shoulders crop,
	 * which is not what somebody asking for the picture wants.
	 */
	protected async download(): Promise<void> {
		this.downloading.set(true);

		try {
			const picture = await renderAvatar(
				this.look(),
				this.view(),
				(file) => this.avatars.layerUrl(file),
				{ crop: 'full', width: 1024 }
			);
			const url = URL.createObjectURL(picture);
			const link = document.createElement('a');

			link.href = url;
			link.download = `avatar-${this.view()}.jpg`;
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error(error);
		} finally {
			this.downloading.set(false);
		}
	}
}
