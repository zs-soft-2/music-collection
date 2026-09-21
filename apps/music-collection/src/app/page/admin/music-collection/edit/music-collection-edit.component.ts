import { map } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
	CollectionForm,
	CriteriaForm,
	ENUM_CRITERIA,
	ENUM_OPERATOR_OPTIONS,
	EnumOperator,
	STATUS_OPTIONS,
	VISIBILITY_OPTIONS,
} from '../music-collection-admin.model';

import { EntityPickerComponent } from '../component/entity-picker.component';

import { MusicCollectionEditStore } from './music-collection-edit.store';

type EnumCriterionKey = (typeof ENUM_CRITERIA)[number]['key'];

/**
 * Admin: writing one collection's rule. The preview resolves the criteria
 * against the catalog as they are typed — the definition is the source of
 * truth, and this is the first place anyone sees its shadow.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-music-collection-edit',
	providers: [MusicCollectionEditStore],
	imports: [RouterLink, EntityPickerComponent],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>
					{{ store.isNew() ? 'Add collection' : 'Edit collection' }}
				</h1>
				<p>
					A collection is a rule, not a list: what belongs to it is
					resolved against the catalog every time it is read.
				</p>
			</div>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">Loading…</span>
			</div>
		} @else {
			@let form = store.form();

			<div class="layout">
				<div class="mc-form">
					<section class="mc-form-section">
						<h2>The collection</h2>

						<div class="mc-form-grid">
							<div class="mc-field">
								<label for="name">Name</label>
								<input
									id="name"
									type="text"
									[value]="form.name"
									(input)="store.setName(value($event))"
								/>
							</div>

							<div class="mc-field">
								<label for="slug">Slug</label>
								<input
									id="slug"
									type="text"
									[value]="form.slug"
									(input)="store.setSlug(value($event))"
								/>
								<small
									>/collections/{{ form.slug || '…' }}</small
								>
							</div>

							<div class="mc-field is-wide">
								<label for="description">Description</label>
								<textarea
									id="description"
									rows="2"
									[value]="form.description"
									(input)="
										store.setField({
											description: value($event),
										})
									"
								></textarea>
							</div>

							<div class="mc-field">
								<label for="icon">Icon</label>
								<input
									id="icon"
									type="text"
									placeholder="pi pi-box"
									[value]="form.icon"
									(input)="
										store.setField({ icon: value($event) })
									"
								/>
								<small
									>A PrimeIcons class, as in the menu.</small
								>
							</div>

							<div class="mc-field">
								<label for="cover">Cover image URL</label>
								<input
									id="cover"
									type="url"
									[value]="form.coverImageUrl"
									(input)="
										store.setField({
											coverImageUrl: value($event),
										})
									"
								/>
							</div>

							<div class="mc-field">
								<label for="status">Status</label>
								<select
									id="status"
									(change)="
										store.setField({
											status:
												value($event) === 'published'
													? 'published'
													: 'draft',
										})
									"
								>
									@for (
										option of statusOptions;
										track option
									) {
										<option
											[value]="option"
											[selected]="form.status === option"
										>
											{{ option }}
										</option>
									}
								</select>
								<small>
									A draft is not listed and earns nobody a
									badge.
								</small>
							</div>

							<div class="mc-field">
								<label for="visibility">Visibility</label>
								<select
									id="visibility"
									(change)="onVisibility($event)"
								>
									@for (
										option of visibilityOptions;
										track option.value
									) {
										<option
											[value]="option.value"
											[selected]="
												form.visibility === option.value
											"
										>
											{{ option.label }}
										</option>
									}
								</select>
							</div>

							<div class="mc-field">
								<label for="base-points">Points</label>
								<input
									id="base-points"
									type="number"
									min="0"
									[placeholder]="store.derivedPoints()"
									[value]="form.basePoints"
									(input)="
										store.setField({
											basePoints: value($event),
										})
									"
								/>
								<small>
									What finishing it is worth. Left empty the
									rule decides — how many records it asks for,
									and how old they are — which right now would
									be
									{{ store.derivedPoints() }} points.
								</small>
							</div>

							<div class="mc-field">
								<label for="parent">Parent collection</label>
								<select id="parent" (change)="onParent($event)">
									<option value="">— none —</option>
									@for (
										parent of parents();
										track parent.uid
									) {
										<option
											[value]="parent.uid"
											[selected]="
												form.parentUid === parent.uid
											"
										>
											{{ parent.name }}
										</option>
									}
								</select>
							</div>
						</div>
					</section>

					<section class="mc-form-section">
						<h2>The rule</h2>
						<p class="hint">
							Every filter given must hold. A filter left empty
							says nothing — with all of them empty the collection
							asks for the whole catalog.
						</p>

						<div class="mc-form-grid">
							<div class="mc-field">
								<label for="year-from">Released from</label>
								<input
									id="year-from"
									type="number"
									[value]="form.criteria.yearFrom ?? ''"
									(input)="onYear('yearFrom', $event)"
								/>
							</div>

							<div class="mc-field">
								<label for="year-to">Released to</label>
								<input
									id="year-to"
									type="number"
									[value]="form.criteria.yearTo ?? ''"
									(input)="onYear('yearTo', $event)"
								/>
							</div>

							@for (
								criterion of enumCriteria;
								track criterion.key
							) {
								<div class="mc-field is-wide">
									<label [attr.for]="criterion.key">
										{{ criterion.label }}
									</label>
									<div class="criterion">
										<select
											class="operator"
											[attr.aria-label]="
												criterion.label + ' operator'
											"
											(change)="
												onOperator(
													criterion.key,
													$event
												)
											"
										>
											@for (
												operator of operatorOptions;
												track operator.value
											) {
												<option
													[value]="operator.value"
													[selected]="
														form.criteria[
															criterion.key
														].operator ===
														operator.value
													"
												>
													{{ operator.label }}
												</option>
											}
										</select>

										<select
											[id]="criterion.key"
											multiple
											size="5"
											(change)="
												onValues(criterion.key, $event)
											"
										>
											@for (
												option of criterion.options;
												track option
											) {
												<option
													[value]="option"
													[selected]="
														form.criteria[
															criterion.key
														].values.includes(
															option
														)
													"
												>
													{{ option }}
												</option>
											}
										</select>
									</div>
									<small>{{ criterion.hint }}</small>
								</div>
							}

							<div class="mc-field is-wide">
								<label for="artists">Artists</label>
								<mc-entity-picker
									inputId="artists"
									placeholder="Search artists…"
									[options]="store.artists()"
									[selected]="form.criteria.artists"
									(selectedChange)="
										onCriteria({ artists: $event })
									"
								/>
								<small>Nothing picked means any artist.</small>
							</div>

							<div class="mc-field">
								<label for="credit-musicians">
									Credited musicians
								</label>
								<mc-entity-picker
									inputId="credit-musicians"
									placeholder="Search musicians…"
									[options]="store.musicians()"
									[selected]="form.criteria.creditMusicians"
									(selectedChange)="
										onCriteria({ creditMusicians: $event })
									"
								/>
							</div>

							<div class="mc-field">
								<label for="credit-roles">Credited as</label>
								<input
									id="credit-roles"
									type="text"
									placeholder="Drums, Producer"
									[value]="
										form.criteria.creditRoles.join(', ')
									"
									(change)="onRoles($event)"
								/>
								<small>
									Discogs roles, comma separated. One credit
									must satisfy both: the musician in that
									role, not two credits together.
								</small>
							</div>
						</div>
					</section>

					<section class="mc-form-section">
						<h2>The badge</h2>

						<div class="mc-form-grid">
							<div class="mc-field">
								<label for="badge-name">Name</label>
								<input
									id="badge-name"
									type="text"
									[value]="form.badgeName"
									(input)="
										store.setField({
											badgeName: value($event),
										})
									"
								/>
								<small>
									Without a name the collection rewards no
									badge.
								</small>
							</div>

							<div class="mc-field">
								<label for="badge-icon">Icon</label>
								<input
									id="badge-icon"
									type="text"
									placeholder="pi pi-star"
									[value]="form.badgeIcon"
									(input)="
										store.setField({
											badgeIcon: value($event),
										})
									"
								/>
							</div>

							<div class="mc-field is-wide">
								<label for="badge-description"
									>Description</label
								>
								<textarea
									id="badge-description"
									rows="2"
									[value]="form.badgeDescription"
									(input)="
										store.setField({
											badgeDescription: value($event),
										})
									"
								></textarea>
							</div>

							<div class="mc-field is-wide">
								<label for="badge-art">Artwork URL</label>
								<input
									id="badge-art"
									type="url"
									[value]="form.badgeArtworkUrl"
									(input)="
										store.setField({
											badgeArtworkUrl: value($event),
										})
									"
								/>
								<small>
									A hand-made image, for the rare badge that
									wants one. The generated pin below wins over
									it.
								</small>
							</div>

							<div class="mc-field is-wide badge-art">
								<div class="badge-art-head">
									<div>
										<strong>The pin</strong>
										<small>
											Drawn once by an image model, from
											this collection's own data, and then
											fixed. The style is the same on
											every badge — only the motif, the
											enamel, the patina and the rim
											follow the rule.
										</small>
									</div>
									<button
										type="button"
										[disabled]="
											store.isNew() ||
											store.isGeneratingBadge()
										"
										(click)="store.generateBadge()"
									>
										{{
											store.isGeneratingBadge()
												? 'Drawing…'
												: store.badgeImageUrl()
													? 'Draw again'
													: 'Generate'
										}}
									</button>
								</div>

								@if (store.isNew()) {
									<p class="hint">
										Save the collection first: the prompt is
										built on the server from what is stored,
										not from this form.
									</p>
								}

								@if (store.badgeCandidates().length) {
									<ul class="candidates">
										@for (
											candidate of store.badgeCandidates();
											track candidate.path
										) {
											<li>
												<img
													[src]="candidate.url"
													alt=""
													loading="lazy"
												/>
												<button
													type="button"
													[disabled]="
														store.isPickingBadge()
													"
													(click)="
														store.pickBadge(
															candidate
														)
													"
												>
													Pick this one
												</button>
											</li>
										}
									</ul>
								} @else if (store.badgeImageUrl(); as badge) {
									<img
										class="chosen"
										[src]="badge"
										alt="The collection's badge"
									/>
								}
							</div>
						</div>
					</section>
				</div>

				<aside class="preview" aria-live="polite">
					<h2>What it catches</h2>

					@if (store.matchesEverything()) {
						<p class="warning">
							No filter yet — this rule takes in the whole
							catalog. Publishing it is refused.
						</p>
					}

					<p class="total">
						<strong>{{ store.previewTotal() }}</strong> records
						@if (store.isPreviewing()) {
							<span class="busy">· resolving…</span>
						}
					</p>

					<p class="points">
						Worth
						<strong>
							{{ store.curatedPoints() ?? store.derivedPoints() }}
						</strong>
						points, and only once a collector owns every one of
						them. Owning the original pressing of an old record
						raises it further.
					</p>

					<ul class="albums">
						@for (
							album of store.previewAlbums();
							track album.albumUid
						) {
							<li>
								<span class="album">{{ album.albumName }}</span>
								<span class="artist">
									{{ album.artistName }}
									@if (album.year) {
										· {{ album.year }}
									}
								</span>
							</li>
						}
					</ul>

					@if (store.previewTotal() > store.previewAlbums().length) {
						<p class="more">
							…and
							{{
								store.previewTotal() -
									store.previewAlbums().length
							}}
							more.
						</p>
					}
				</aside>
			</div>

			<div class="mc-form-actions">
				<a class="button" routerLink="/admin/music-collection"
					>Cancel</a
				>
				<button
					type="button"
					class="button is-primary"
					[disabled]="!store.canSave()"
					(click)="store.save()"
				>
					{{ store.isSaving() ? 'Saving…' : 'Save' }}
				</button>
			</div>
		}
	`,
	styles: `
		.badge-art-head {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 1rem;
		}

		.badge-art-head small {
			display: block;
			max-width: 46ch;
			margin-top: 0.25rem;
		}

		.badge-art .hint {
			margin: 0.75rem 0 0;
			font-size: 0.85rem;
			color: var(--mc-text-muted);
		}

		.candidates {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			gap: 0.75rem;
			margin: 0.9rem 0 0;
			padding: 0;
			list-style: none;
		}

		.candidates li {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
		}

		.candidates img,
		.chosen {
			width: 100%;
			aspect-ratio: 1;
			object-fit: contain;
			border-radius: var(--mc-radius-md);
			background: var(--mc-bg-muted);
		}

		.chosen {
			max-width: 220px;
			margin-top: 0.9rem;
		}

		:host {
			display: block;
		}

		.layout {
			display: grid;
			grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
			gap: 1.25rem;
			align-items: start;
		}

		@media (max-width: 1000px) {
			.layout {
				grid-template-columns: minmax(0, 1fr);
			}
		}

		input,
		select,
		textarea {
			padding: 0.45rem 0.6rem;
			font: inherit;
			font-size: 0.9rem;
			color: var(--mc-text);
			background: var(--mc-bg);
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);
		}

		select[multiple] {
			min-height: 7rem;
		}

		.criterion {
			display: flex;
			gap: 0.5rem;
			align-items: flex-start;

			.operator {
				flex: 0 0 8rem;
			}

			select[multiple] {
				flex: 1;
				min-width: 0;
			}
		}

		.hint {
			margin: 0;
			font-size: 0.82rem;
			color: var(--mc-text-muted);
		}

		.preview {
			position: sticky;
			top: calc(var(--mc-app-bar-height) + 1rem);
			padding: 1.25rem;
			background: var(--mc-card-bg);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);

			h2 {
				margin: 0;
				font-size: 0.9375rem;
				font-weight: 600;
			}
		}

		.total {
			margin: 0.5rem 0 0.75rem;
			color: var(--mc-text-muted);
			font-variant-numeric: tabular-nums;

			strong {
				font-size: 1.4rem;
				color: var(--mc-text);
			}
		}

		.busy {
			font-size: 0.8rem;
			color: var(--mc-text-subtle);
		}

		.points {
			margin: 0 0 0.75rem;
			font-size: 0.82rem;
			color: var(--mc-text-muted);

			strong {
				color: var(--mc-accent);
				font-size: 1rem;
				font-variant-numeric: tabular-nums;
			}
		}

		.albums {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
			max-height: 24rem;
			overflow-y: auto;
			margin: 0;
			padding: 0;
			list-style: none;

			li {
				display: flex;
				flex-direction: column;
				font-size: 0.82rem;
			}
		}

		.album {
			font-weight: 600;
		}

		.artist {
			color: var(--mc-text-muted);
		}

		.more {
			margin: 0.6rem 0 0;
			font-size: 0.8rem;
			color: var(--mc-text-subtle);
		}

		.warning {
			margin: 0.5rem 0 0;
			font-size: 0.82rem;
			color: var(--mc-status-warn, var(--mc-accent));
		}

		.button {
			padding: 0.45rem 1rem;
			font: inherit;
			font-size: 0.9rem;
			color: var(--mc-text);
			text-decoration: none;
			cursor: pointer;
			background: transparent;
			border: 1px solid var(--mc-border-strong);
			border-radius: var(--mc-radius-md);

			&:disabled {
				opacity: 0.6;
				cursor: default;
			}

			&.is-primary {
				color: var(--mc-on-primary);
				background: var(--mc-primary);
				border-color: var(--mc-primary);
			}
		}

		.error {
			padding: 0.75rem 1rem;
			margin-bottom: 1rem;
			color: var(--mc-primary);
			border: 1px solid var(--mc-primary);
			border-radius: var(--mc-radius-md);
		}

		.skeleton {
			height: 20rem;
			border-radius: var(--mc-radius-lg);
			background: var(--mc-card-bg);
		}

		.visually-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			margin: -1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
			border: 0;
		}
	`,
})
export class MusicCollectionEditComponent {
	protected readonly store = inject(MusicCollectionEditStore);

	protected readonly enumCriteria = ENUM_CRITERIA;
	protected readonly operatorOptions = ENUM_OPERATOR_OPTIONS;
	protected readonly statusOptions = STATUS_OPTIONS;
	protected readonly visibilityOptions = VISIBILITY_OPTIONS;

	public constructor() {
		this.store.load(
			inject(ActivatedRoute).paramMap.pipe(
				map((params) => params.get('uid') ?? '0')
			)
		);
	}

	/** The definitions a collection may sit under — never itself. */
	protected parents(): { uid: string; name: string }[] {
		const uid = this.store.uid();

		return this.store.parents().filter((parent) => parent.uid !== uid);
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement | HTMLSelectElement).value;
	}

	protected onVisibility(event: Event): void {
		this.store.setField({
			visibility: this.value(event) as CollectionForm['visibility'],
		});
	}

	protected onParent(event: Event): void {
		this.store.setField({ parentUid: this.value(event) });
	}

	protected onYear(key: 'yearFrom' | 'yearTo', event: Event): void {
		const raw = this.value(event).trim();

		this.patchCriteria({ [key]: raw ? Number(raw) : null });
	}

	protected onOperator(key: EnumCriterionKey, event: Event): void {
		const criteria = this.store.form().criteria;

		this.patchCriteria({
			[key]: {
				...criteria[key],
				operator: this.value(event) as EnumOperator,
			},
		});
	}

	protected onValues(key: EnumCriterionKey, event: Event): void {
		const criteria = this.store.form().criteria;

		this.patchCriteria({
			[key]: { ...criteria[key], values: this.selected(event) },
		});
	}

	protected onCriteria(patch: Partial<CriteriaForm>): void {
		this.patchCriteria(patch);
	}

	/** Free text, because a Discogs role is free text. */
	protected onRoles(event: Event): void {
		this.patchCriteria({
			creditRoles: this.value(event)
				.split(',')
				.map((role) => role.trim())
				.filter(Boolean),
		});
	}

	private selected(event: Event): string[] {
		return Array.from(
			(event.target as HTMLSelectElement).selectedOptions
		).map((option) => option.value);
	}

	private patchCriteria(patch: Partial<CriteriaForm>): void {
		this.store.setCriteria({ ...this.store.form().criteria, ...patch });
	}
}
