import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GENRE_IN_USE } from '@music-collection/domain/genre';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { GenreAdminStore } from './genre-admin.store';

/**
 * Admin: the genres the catalog files records under, and the styles under each.
 *
 * This is the taxonomy itself — what the artist and album forms offer, and what
 * an import matches the names it reads against. A genre nothing carries can be
 * deleted; one the catalog names is retired instead, so the styles already
 * saved keep their genre.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-genre-admin',
	providers: [GenreAdminStore],
	imports: [...I18N_IMPORTS],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'admin.genre.title' | transloco }}</h1>
				<p>{{ 'admin.genre.intro' | transloco }}</p>
			</div>
			<div class="mc-page-actions">
				<button
					type="button"
					class="button is-primary"
					(click)="store.add()"
				>
					{{ 'admin.genre.add' | transloco }}
				</button>
			</div>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">
				@if (error === inUse) {
					{{ 'admin.genre.in-use' | transloco }}
				} @else {
					{{ error }}
				}
			</p>
		}

		@if (store.edit(); as edit) {
			<section class="editor" [attr.aria-label]="'admin.genre.editor' | transloco">
				<h2>
					@if (edit.uid) {
						{{ 'admin.genre.editing' | transloco }}
					} @else {
						{{ 'admin.genre.adding' | transloco }}
					}
				</h2>

				<div class="mc-field">
					<label for="genre-name">{{
						'admin.genre.name' | transloco
					}}</label>
					<input
						id="genre-name"
						type="text"
						[value]="edit.draft.name"
						(input)="store.setName(value($event))"
						[attr.placeholder]="
							'admin.genre.name-placeholder' | transloco
						"
					/>
				</div>

				<div class="mc-field">
					<label for="genre-description">{{
						'admin.genre.description' | transloco
					}}</label>
					<textarea
						id="genre-description"
						rows="2"
						[value]="edit.draft.description ?? ''"
						(input)="store.setDescription(value($event))"
					></textarea>
				</div>

				<div class="mc-field">
					<label for="genre-style">{{
						'admin.genre.styles' | transloco
					}}</label>
					<div class="style-input">
						<input
							id="genre-style"
							type="text"
							[attr.placeholder]="
								'admin.genre.style-placeholder' | transloco
							"
							(keydown.enter)="addStyle($event)"
						/>
						<button
							type="button"
							class="button"
							(click)="addStyle($event)"
						>
							{{ 'admin.genre.add-style' | transloco }}
						</button>
					</div>

					@if (edit.draft.styles.length) {
						<ul class="chips">
							@for (style of edit.draft.styles; track style) {
								<li class="chip">
									<span>{{ style }}</span>
									<button
										type="button"
										class="remove"
										[attr.aria-label]="
											'admin.genre.remove-style'
												| transloco
										"
										(click)="store.removeStyle(style)"
									>
										×
									</button>
								</li>
							}
						</ul>
					} @else {
						<p class="hint">
							{{ 'admin.genre.no-style-yet' | transloco }}
						</p>
					}
				</div>

				<label class="switch">
					<input
						type="checkbox"
						[checked]="edit.draft.active"
						(change)="store.setActive(checked($event))"
					/>
					{{ 'admin.genre.offered-on-forms' | transloco }}
				</label>

				<div class="editor-actions">
					<button
						type="button"
						class="button is-primary"
						[disabled]="!store.canSave() || store.isSaving()"
						(click)="store.save()"
					>
						{{ 'admin.genre.save' | transloco }}
					</button>
					<button
						type="button"
						class="button"
						[disabled]="store.isSaving()"
						(click)="store.cancel()"
					>
						{{ 'admin.genre.cancel' | transloco }}
					</button>
					@if (!store.canSave() && edit.draft.name.trim()) {
						<small class="hint">{{
							'admin.genre.name-taken' | transloco
						}}</small>
					}
				</div>
			</section>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">{{
					'common.loading' | transloco
				}}</span>
			</div>
		} @else if (!store.genres().length) {
			<p class="empty">{{ 'admin.genre.empty' | transloco }}</p>
		} @else {
			<p class="totals">
				{{ store.genres().length }}
				{{ 'admin.genre.genres' | transloco }} ·
				{{ store.styleCount() }}
				{{ 'admin.genre.styles-total' | transloco }}
			</p>

			<ul class="rows">
				@for (genre of store.genres(); track genre.uid) {
					<li class="row" [class.is-retired]="genre.active === false">
						<div class="main">
							<p class="name">
								{{ genre.name }}
								@if (genre.active === false) {
									<span class="tag">{{
										'admin.genre.retired' | transloco
									}}</span>
								}
							</p>
							@if (genre.description) {
								<p class="summary">{{ genre.description }}</p>
							}
							<p class="styles">
								@if (genre.styles.length) {
									{{ genre.styles.join(', ') }}
								} @else {
									{{ 'admin.genre.no-style-yet' | transloco }}
								}
							</p>
						</div>

						<div class="side">
							<span class="count">
								<strong>{{ genre.styles.length }}</strong>
								{{ 'admin.genre.styles-total' | transloco }}
							</span>
						</div>

						<div class="actions">
							<button
								type="button"
								class="button"
								(click)="store.edit(genre)"
							>
								{{ 'admin.genre.edit' | transloco }}
							</button>
							@if (store.pendingDeletion()?.uid === genre.uid) {
								<button
									type="button"
									class="button is-danger"
									[disabled]="store.isSaving()"
									(click)="store.confirmDeletion()"
								>
									{{ 'admin.genre.really-delete' | transloco }}
								</button>
								<button
									type="button"
									class="button"
									(click)="store.cancelDeletion()"
								>
									{{ 'admin.genre.cancel' | transloco }}
								</button>
							} @else {
								<button
									type="button"
									class="button"
									(click)="store.askDeletion(genre)"
								>
									{{ 'admin.genre.delete' | transloco }}
								</button>
							}
						</div>
					</li>
				}
			</ul>
		}
	`,
	styles: `
		.editor {
			margin-bottom: 1.5rem;
			padding: 1rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
			background: var(--mc-card-bg);
		}

		.editor h2 {
			margin-top: 0;
		}

		.mc-field {
			display: flex;
			flex-direction: column;
			gap: 0.375rem;
			margin-bottom: 1rem;
		}

		.mc-field input[type='text'],
		.mc-field textarea {
			padding: 0.5rem 0.625rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-sm, 6px);
			background: var(--mc-surface-2);
			color: var(--mc-text);
			font: inherit;
		}

		.style-input {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.style-input input {
			flex: 1 1 12rem;
		}

		.chips {
			display: flex;
			flex-wrap: wrap;
			gap: 0.375rem;
			margin: 0.5rem 0 0;
			padding: 0;
			list-style: none;
		}

		.chip {
			display: inline-flex;
			align-items: center;
			gap: 0.375rem;
			padding: 0.125rem 0.25rem 0.125rem 0.625rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
			font-size: 0.8125rem;
		}

		.chip .remove {
			min-width: 24px;
			min-height: 24px;
			border: 0;
			border-radius: 999px;
			background: transparent;
			color: var(--mc-text-muted);
			font-size: 1rem;
			line-height: 1;
			cursor: pointer;
		}

		.chip .remove:hover {
			color: var(--mc-text);
		}

		.switch {
			display: inline-flex;
			align-items: center;
			gap: 0.5rem;
		}

		.editor-actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;
			margin-top: 1rem;
		}

		.totals,
		.hint {
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		.rows {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		.row {
			display: flex;
			flex-wrap: wrap;
			align-items: flex-start;
			gap: 0.75rem;
			padding: 0.75rem 1rem;
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			background: var(--mc-card-bg);
		}

		.row.is-retired {
			opacity: 0.6;
		}

		.main {
			flex: 1 1 18rem;
		}

		.name {
			margin: 0;
			font-weight: 600;
		}

		.summary,
		.styles {
			margin: 0.25rem 0 0;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		.tag {
			margin-left: 0.5rem;
			color: var(--mc-text-muted);
			font-size: 0.6875rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.error {
			color: var(--mc-danger, crimson);
		}
	`,
})
export class GenreAdminComponent {
	protected readonly store = inject(GenreAdminStore);
	protected readonly inUse = GENRE_IN_USE;

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}

	protected checked(event: Event): boolean {
		return (event.target as HTMLInputElement).checked;
	}

	/**
	 * Adds what is typed and empties the field, so the next style can follow.
	 * The same handler serves the button and the Enter key, which is why the
	 * field is looked for rather than passed.
	 */
	protected addStyle(event: Event): void {
		const target = event.target as HTMLElement;
		const field =
			target instanceof HTMLInputElement
				? target
				: target.closest('.style-input')?.querySelector('input');

		if (field instanceof HTMLInputElement) {
			this.store.addStyle(field.value);
			field.value = '';
		}
	}
}
