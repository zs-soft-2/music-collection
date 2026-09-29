import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GENRE_IN_USE } from '@music-collection/domain/genre';
import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { AutoComplete } from 'primeng/autocomplete';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';

import { GenreAdminStore } from './genre-admin.store';

/**
 * Admin: the genres the catalog files records under, and the styles under each.
 *
 * This is the taxonomy itself — what the artist and album forms offer, and what
 * an import matches the names it reads against. A genre nothing carries can be
 * deleted; one the catalog names is retired instead, so the styles already
 * saved keep their genre.
 *
 * The editor is the catalog's own form — the PrimeNG controls and the
 * `mc-form` frame the artist, album and label forms are built from — because
 * an admin arrives here from those pages and a second look would be a second
 * thing to learn. The draft stays in the store rather than in a FormGroup:
 * whether a name may be saved is the taxonomy's answer, not a field's.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-genre-admin',
	providers: [GenreAdminStore],
	imports: [
		...I18N_IMPORTS,
		FormsModule,
		AutoComplete,
		Button,
		Checkbox,
		InputText,
		Textarea,
	],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>{{ 'admin.genre.title' | transloco }}</h1>
				<p>{{ 'admin.genre.intro' | transloco }}</p>
			</div>
			<div class="mc-page-actions">
				<p-button
					[label]="'admin.genre.add' | transloco"
					icon="pi pi-plus"
					[disabled]="!!store.editor()"
					(onClick)="store.add()"
				></p-button>
			</div>
		</header>

		@if (store.error(); as error) {
			<small class="genre-error" role="alert">
				@if (error === inUse) {
					{{ 'admin.genre.in-use' | transloco }}
				} @else {
					{{ error }}
				}
			</small>
		}

		@if (store.editor(); as edit) {
			<form
				class="mc-form"
				[attr.aria-label]="'admin.genre.editor' | transloco"
				(ngSubmit)="store.save()"
			>
				<section class="mc-form-section" aria-labelledby="genre-editor">
					<h2 id="genre-editor">
						@if (edit.uid) {
							{{ 'admin.genre.editing' | transloco }}
						} @else {
							{{ 'admin.genre.adding' | transloco }}
						}
					</h2>

					<div class="mc-form-grid">
						<div class="mc-field">
							<label for="genre-name">{{
								'admin.genre.name' | transloco
							}}</label>
							<input
								id="genre-name"
								type="text"
								pInputText
								[value]="edit.draft.name"
								[placeholder]="
									'admin.genre.name-placeholder' | transloco
								"
								aria-describedby="genre-name-hint"
								(input)="store.setName(value($event))"
							/>
							@if (!store.canSave() && edit.draft.name.trim()) {
								<small id="genre-name-hint" class="is-error">{{
									'admin.genre.name-taken' | transloco
								}}</small>
							}
						</div>

						<div class="mc-field">
							<label for="genre-styles">{{
								'admin.genre.styles' | transloco
							}}</label>
							<p-autocomplete
								inputId="genre-styles"
								[multiple]="true"
								[typeahead]="false"
								[addOnBlur]="true"
								separator=","
								[ngModel]="edit.draft.styles"
								[ngModelOptions]="{ standalone: true }"
								[placeholder]="
									'admin.genre.style-placeholder' | transloco
								"
								[ariaLabel]="'admin.genre.styles' | transloco"
								aria-describedby="genre-styles-hint"
								(ngModelChange)="store.setStyles($event)"
							></p-autocomplete>
							<small id="genre-styles-hint">{{
								'admin.genre.style-hint' | transloco
							}}</small>
						</div>

						<div class="mc-field is-wide">
							<label for="genre-description">{{
								'admin.genre.description' | transloco
							}}</label>
							<textarea
								id="genre-description"
								pTextarea
								[rows]="3"
								[autoResize]="true"
								[value]="edit.draft.description ?? ''"
								(input)="store.setDescription(value($event))"
							></textarea>
						</div>

						<div class="mc-field is-wide">
							<div class="genre-switch">
								<p-checkbox
									inputId="genre-active"
									[binary]="true"
									[ngModel]="edit.draft.active"
									[ngModelOptions]="{ standalone: true }"
									(onChange)="store.setActive($event.checked)"
								></p-checkbox>
								<label for="genre-active">{{
									'admin.genre.offered-on-forms' | transloco
								}}</label>
							</div>
						</div>
					</div>
				</section>

				<div class="mc-form-actions">
					<p-button
						[label]="'admin.genre.cancel' | transloco"
						severity="secondary"
						[outlined]="true"
						[disabled]="store.isSaving()"
						(onClick)="store.cancel()"
					></p-button>
					<p-button
						type="submit"
						[label]="'admin.genre.save' | transloco"
						icon="pi pi-check"
						[disabled]="!store.canSave() || store.isSaving()"
						[loading]="store.isSaving()"
					></p-button>
				</div>
			</form>
		}

		@if (store.isLoading()) {
			<p class="mc-form-note" role="status" aria-busy="true">
				{{ 'common.loading' | transloco }}
			</p>
		} @else if (!store.genres().length) {
			<p class="mc-form-note">{{ 'admin.genre.empty' | transloco }}</p>
		} @else {
			<div class="mc-card">
				<div class="mc-table-tools">
					<span class="genre-totals">
						{{ store.genres().length }}
						{{ 'admin.genre.genres' | transloco }} ·
						{{ store.styleCount() }}
						{{ 'admin.genre.styles-total' | transloco }}
					</span>
				</div>

				<div class="mc-stacked-table">
					<table>
						<thead>
							<tr>
								<th scope="col">
									{{ 'admin.genre.name' | transloco }}
								</th>
								<th scope="col">
									{{ 'admin.genre.styles' | transloco }}
								</th>
								<th scope="col">
									{{ 'admin.genre.styles-total' | transloco }}
								</th>
								<th scope="col">
									<span class="visually-hidden">{{
										'admin.genre.actions' | transloco
									}}</span>
								</th>
							</tr>
						</thead>
						<tbody>
							@for (genre of store.genres(); track genre.uid) {
								<tr [class.is-retired]="genre.active === false">
									<th scope="row">
										{{ genre.name }}
										@if (genre.active === false) {
											<span class="genre-tag">{{
												'admin.genre.retired'
													| transloco
											}}</span>
										}
										@if (genre.description) {
											<small class="genre-summary">{{
												genre.description
											}}</small>
										}
									</th>
									<td
										class="genre-style-list"
										[attr.data-label]="
											'admin.genre.styles' | transloco
										"
									>
										@if (genre.styles.length) {
											{{ genre.styles.join(', ') }}
										} @else {
											{{
												'admin.genre.no-style-yet'
													| transloco
											}}
										}
									</td>
									<td
										class="genre-count"
										[attr.data-label]="
											'admin.genre.styles-total'
												| transloco
										"
									>
										{{ genre.styles.length }}
									</td>
									<td class="mc-stacked-actions">
										@if (
											store.pendingDeletion()?.uid ===
											genre.uid
										) {
											<p-button
												[label]="
													'admin.genre.really-delete'
														| transloco
												"
												icon="pi pi-trash"
												severity="danger"
												size="small"
												[loading]="store.isSaving()"
												(onClick)="
													store.confirmDeletion()
												"
											></p-button>
											<p-button
												[label]="
													'admin.genre.cancel'
														| transloco
												"
												severity="secondary"
												size="small"
												[text]="true"
												(onClick)="
													store.cancelDeletion()
												"
											></p-button>
										} @else {
											<p-button
												icon="pi pi-pencil"
												severity="secondary"
												size="small"
												[rounded]="true"
												[text]="true"
												[ariaLabel]="
													'admin.genre.edit'
														| transloco
												"
												(onClick)="store.edit(genre)"
											></p-button>
											<p-button
												icon="pi pi-trash"
												severity="danger"
												size="small"
												[rounded]="true"
												[text]="true"
												[ariaLabel]="
													'admin.genre.delete'
														| transloco
												"
												(onClick)="
													store.askDeletion(genre)
												"
											></p-button>
										}
									</td>
								</tr>
							}
						</tbody>
					</table>
				</div>
			</div>
		}
	`,
	styles: `
		.genre-error {
			display: block;
			margin-bottom: 1rem;
			color: var(--mc-status-bad);
		}

		.genre-totals {
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
		}

		.genre-switch {
			display: flex;
			align-items: center;
			gap: 0.5rem;

			label {
				font-size: 0.8125rem;
				font-weight: 600;
			}
		}

		.genre-summary {
			display: block;
			margin-top: 0.25rem;
			color: var(--mc-text-muted);
			font-size: 0.8125rem;
			font-weight: 400;
			white-space: normal;
		}

		.genre-tag {
			margin-left: 0.5rem;
			color: var(--mc-text-muted);
			font-size: 0.6875rem;
			font-weight: 700;
			letter-spacing: 0.04em;
			text-transform: uppercase;
		}

		tr.is-retired {
			opacity: 0.6;
		}

		/*
		 * The styles are the longest text on the page — Rock alone names
		 * fifty-five of them, some 750 characters on one line. The shared
		 * table keeps its cells on one line, which made the row several
		 * thousand pixels wide: the table scrolled sideways and the buttons
		 * at the end of the row sat three thousand pixels outside what the
		 * card shows. This one column wraps, and the table fits again. Widths
		 * on the two columns after it are not the answer — the actions cell
		 * is a flex box, and squeezing it makes the buttons spill back over
		 * the count.
		 */
		.mc-stacked-table td.genre-style-list {
			white-space: normal;
		}

		.mc-stacked-table td.genre-count {
			font-variant-numeric: tabular-nums;
		}
	`,
})
export class GenreAdminComponent {
	protected readonly store = inject(GenreAdminStore);
	protected readonly inUse = GENRE_IN_USE;

	protected value(event: Event): string {
		return (event.target as HTMLInputElement).value;
	}
}
