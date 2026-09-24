import { map } from 'rxjs';

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

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
	imports: [...I18N_IMPORTS, RouterLink, EntityPickerComponent],
	template: `
		<header class="mc-page-head">
			<div>
				<h1>
					{{ store.isNew() ? 'Add collection' : 'Edit collection' }}
				</h1>
				<p>
					{{ 'ui.musicCollectionEdit.a-collection-is-a' | transloco }}
				</p>
			</div>
		</header>

		@if (store.error(); as error) {
			<p class="error" role="alert">{{ error }}</p>
		}

		@if (store.isLoading()) {
			<div class="skeleton" role="status" aria-busy="true">
				<span class="visually-hidden">{{
					'ui.musicCollectionEdit.loading' | transloco
				}}</span>
			</div>
		} @else {
			@let form = store.form();

			<div class="layout">
				<div class="mc-form">
					<section class="mc-form-section">
						<h2>
							{{
								'ui.musicCollectionEdit.the-collection'
									| transloco
							}}
						</h2>

						<div class="mc-form-grid">
							<div class="mc-field">
								<label for="name">{{
									'ui.musicCollectionEdit.name' | transloco
								}}</label>
								<input
									id="name"
									type="text"
									[value]="form.name"
									(input)="store.setName(value($event))"
								/>
							</div>

							<div class="mc-field">
								<label for="slug">{{
									'ui.musicCollectionEdit.slug' | transloco
								}}</label>
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
								<label for="description">{{
									'ui.musicCollectionEdit.description'
										| transloco
								}}</label>
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
								<label for="icon">{{
									'ui.musicCollectionEdit.icon' | transloco
								}}</label>
								<input
									id="icon"
									type="text"
									[placeholder]="
										'ui.musicCollectionEdit.pi-pi-box'
											| transloco
									"
									[value]="form.icon"
									(input)="
										store.setField({ icon: value($event) })
									"
								/>
								<small>{{
									'ui.musicCollectionEdit.a-primeicons-class-as'
										| transloco
								}}</small>
							</div>

							<div class="mc-field">
								<label for="cover">{{
									'ui.musicCollectionEdit.cover-image-url'
										| transloco
								}}</label>
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
								<label for="status">{{
									'ui.musicCollectionEdit.status' | transloco
								}}</label>
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
									{{
										'ui.musicCollectionEdit.a-draft-is-not'
											| transloco
									}}
								</small>
							</div>

							<div class="mc-field">
								<label for="visibility">{{
									'ui.musicCollectionEdit.visibility'
										| transloco
								}}</label>
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
											{{ option.labelKey | transloco }}
										</option>
									}
								</select>
							</div>

							<div class="mc-field">
								<label for="base-points">{{
									'ui.musicCollectionEdit.points' | transloco
								}}</label>
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
									{{
										store.derivedPoints()
											| mcPlural
												: 'ui.musicCollectionEdit.pointsHint'
									}}
								</small>
							</div>

							<div class="mc-field">
								<label for="parent">{{
									'ui.musicCollectionEdit.parent-collection'
										| transloco
								}}</label>
								<select id="parent" (change)="onParent($event)">
									<option value="">
										{{
											'ui.musicCollectionEdit.none'
												| transloco
										}}
									</option>
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
						<h2>
							{{ 'ui.musicCollectionEdit.the-rule' | transloco }}
						</h2>
						<p class="hint">
							{{
								'ui.musicCollectionEdit.every-filter-given-must'
									| transloco
							}}
						</p>

						<div class="mc-form-grid">
							<div class="mc-field">
								<label for="year-from">{{
									'ui.musicCollectionEdit.released-from'
										| transloco
								}}</label>
								<input
									id="year-from"
									type="number"
									[value]="form.criteria.yearFrom ?? ''"
									(input)="onYear('yearFrom', $event)"
								/>
							</div>

							<div class="mc-field">
								<label for="year-to">{{
									'ui.musicCollectionEdit.released-to'
										| transloco
								}}</label>
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
										{{ criterion.labelKey | transloco }}
									</label>
									<div class="criterion">
										<select
											class="operator"
											[attr.aria-label]="
												'admin.criterion.operatorFor'
													| transloco
														: {
																field:
																	criterion.labelKey
																	| transloco,
														  }
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
													{{
														operator.labelKey
															| transloco
													}}
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
								<label for="artists">{{
									'ui.musicCollectionEdit.artists' | transloco
								}}</label>
								<mc-entity-picker
									inputId="artists"
									[placeholder]="
										'ui.musicCollectionEdit.search-artists'
											| transloco
									"
									[options]="store.artists()"
									[selected]="form.criteria.artists"
									(selectedChange)="
										onCriteria({ artists: $event })
									"
								/>
								<small>{{
									'ui.musicCollectionEdit.nothing-picked-means-any'
										| transloco
								}}</small>
							</div>

							<div class="mc-field">
								<label for="credit-musicians">
									{{
										'ui.musicCollectionEdit.credited-musicians'
											| transloco
									}}
								</label>
								<mc-entity-picker
									inputId="credit-musicians"
									[placeholder]="
										'ui.musicCollectionEdit.search-musicians'
											| transloco
									"
									[options]="store.musicians()"
									[selected]="form.criteria.creditMusicians"
									(selectedChange)="
										onCriteria({ creditMusicians: $event })
									"
								/>
							</div>

							<div class="mc-field">
								<label for="credit-roles">{{
									'ui.musicCollectionEdit.credited-as'
										| transloco
								}}</label>
								<input
									id="credit-roles"
									type="text"
									[placeholder]="
										'ui.musicCollectionEdit.drums-producer'
											| transloco
									"
									[value]="
										form.criteria.creditRoles.join(', ')
									"
									(change)="onRoles($event)"
								/>
								<small>
									{{
										'ui.musicCollectionEdit.discogs-roles-comma-separated'
											| transloco
									}}
								</small>
							</div>
						</div>
					</section>

					<section class="mc-form-section">
						<h2>
							{{ 'ui.musicCollectionEdit.the-badge' | transloco }}
						</h2>

						<div class="mc-form-grid">
							<div class="mc-field">
								<label for="badge-name">{{
									'ui.musicCollectionEdit.name2' | transloco
								}}</label>
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
									{{
										'ui.musicCollectionEdit.without-a-name-the'
											| transloco
									}}
								</small>
							</div>

							<div class="mc-field">
								<label for="badge-icon">{{
									'ui.musicCollectionEdit.icon2' | transloco
								}}</label>
								<input
									id="badge-icon"
									type="text"
									[placeholder]="
										'ui.musicCollectionEdit.pi-pi-star'
											| transloco
									"
									[value]="form.badgeIcon"
									(input)="
										store.setField({
											badgeIcon: value($event),
										})
									"
								/>
							</div>

							<div class="mc-field is-wide">
								<label for="badge-description">{{
									'ui.musicCollectionEdit.description2'
										| transloco
								}}</label>
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
								<label for="badge-art">{{
									'ui.musicCollectionEdit.artwork-url'
										| transloco
								}}</label>
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
									{{
										'ui.musicCollectionEdit.a-hand-made-image'
											| transloco
									}}
								</small>
							</div>

							<div class="mc-field is-wide badge-art">
								<div class="badge-art-head">
									<div>
										<strong>{{
											'ui.musicCollectionEdit.the-pin'
												| transloco
										}}</strong>
										<small>
											{{
												'ui.musicCollectionEdit.drawn-by-an-image'
													| transloco
											}}
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
										{{
											'ui.musicCollectionEdit.save-the-collection-first'
												| transloco
										}}
									</p>
								}

								@if (store.badgeImageUrl(); as badge) {
									<img
										class="chosen"
										[src]="badge"
										[alt]="
											'ui.musicCollectionEdit.the-collection-s-badge'
												| transloco
										"
									/>
								}

								@if (store.badgeGallery().length) {
									<ul class="gallery">
										@for (
											image of store.badgeGallery();
											track image.documentUid
										) {
											<li
												[class.is-chosen]="
													image.documentUid ===
													store.badgeImageUid()
												"
											>
												<img
													[src]="image.filePath"
													[alt]="image.name"
													loading="lazy"
												/>

												@if (
													image.documentUid ===
													store.badgeImageUid()
												) {
													<span class="current">
														{{
															'ui.musicCollectionEdit.the-badge2'
																| transloco
														}}
													</span>
												} @else {
													<button
														type="button"
														[disabled]="
															store.isPickingBadge()
														"
														(click)="
															store.pickBadge(
																image
															)
														"
													>
														{{
															'ui.musicCollectionEdit.pick-this-one'
																| transloco
														}}
													</button>
												}
											</li>
										}
									</ul>
								}
							</div>
						</div>
					</section>
				</div>

				<aside class="preview" aria-live="polite">
					<h2>
						{{
							'ui.musicCollectionEdit.what-it-catches' | transloco
						}}
					</h2>

					@if (store.matchesEverything()) {
						<p class="warning">
							{{
								'ui.musicCollectionEdit.no-filter-yet-this'
									| transloco
							}}
						</p>
					}

					<p class="total">
						{{
							store.previewTotal()
								| mcPlural
									: 'ui.musicCollectionEdit.previewTotal'
						}}
						@if (store.isPreviewing()) {
							<span class="busy">{{
								'ui.musicCollectionEdit.resolving' | transloco
							}}</span>
						}
					</p>

					<p class="points">
						{{ 'ui.musicCollectionEdit.worth' | transloco }}
						<strong>
							{{ store.curatedPoints() ?? store.derivedPoints() }}
						</strong>
						{{
							'ui.musicCollectionEdit.points-and-only-once'
								| transloco
						}}
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
							{{
								'ui.musicCollectionEdit.andMore'
									| transloco
										: {
												count:
													store.previewTotal() -
													store.previewAlbums()
														.length,
										  }
							}}
						</p>
					}
				</aside>
			</div>

			<div class="mc-form-actions">
				<a class="button" routerLink="/admin/music-collection">{{
					'ui.musicCollectionEdit.cancel' | transloco
				}}</a>
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

		.gallery {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
			gap: 0.75rem;
			margin: 0.9rem 0 0;
			padding: 0;
			list-style: none;
		}

		.gallery li {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
		}

		/* A pin átlátszó háttérrel érkezik: a lap színe látszik mögötte. */
		.gallery img,
		.chosen {
			width: 100%;
			aspect-ratio: 1;
			object-fit: contain;
			border-radius: var(--mc-radius-md);
		}

		.gallery li.is-chosen img {
			outline: 2px solid var(--mc-accent);
			outline-offset: 2px;
		}

		.gallery .current {
			text-align: center;
			font-size: 0.8rem;
			color: var(--mc-text-muted);
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
