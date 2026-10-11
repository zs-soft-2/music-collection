import { map, of } from 'rxjs';

import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import {
	CollectionForm,
	CriteriaForm,
	ENUM_CRITERIA,
	ENUM_OPERATOR_OPTIONS,
	EnumOperator,
	GROUP_OPTIONS,
	STATUS_OPTIONS,
	VISIBILITY_OPTIONS,
} from '../music-collection-admin.model';

import { AiMarkComponent } from '../../../../shared/music-ui';

import { EntityPickerComponent } from '../component/entity-picker.component';
import { ImageLibraryComponent } from '../component/image-library.component';
import { SceneGeneratorComponent } from './scene-generator/scene-generator.component';

import {
	MusicCollectionEditStore,
	UploadableField,
} from './music-collection-edit.store';

type EnumCriterionKey = (typeof ENUM_CRITERIA)[number]['key'];

/**
 * A szerkesztő négy lapja, sorrendben, mindegyik a maga színével.
 *
 * Egy űrlapban álltak eddig, egymás alatt: a szabály aljáig görgetni kellett
 * ahhoz, hogy valaki a jelvényhez érjen, és a borító mezőjébe ágyazott
 * rajzolópad végképp nem látszott annak, ami. A lapok nem rejtik el a
 * munkát, csak egyszerre egy döntést tesznek ki — a találatok oldalsávja
 * mind a négy mellett ott marad, mert az minden döntésre válaszol.
 *
 * A szín nem dísz: ugyanaz a `--tint` fut végig a lap szakaszain, a
 * mezői fókuszgyűrűjén és az oldalsávon, így a nyitott lap a lap aljáról is
 * felismerhető.
 */
const TABS = [
	{
		id: 'basics',
		labelKey: 'ui.musicCollectionEdit.basics',
		icon: 'pi pi-id-card',
		tint: 'var(--mc-series-2)',
	},
	{
		id: 'rule',
		labelKey: 'ui.musicCollectionEdit.rule',
		icon: 'pi pi-filter',
		tint: 'var(--mc-series-4)',
	},
	{
		id: 'looks',
		labelKey: 'ui.musicCollectionEdit.looks',
		icon: 'pi pi-image',
		tint: 'var(--mc-series-5)',
	},
	{
		id: 'badge',
		labelKey: 'ui.musicCollectionEdit.badge',
		icon: 'pi pi-star',
		tint: 'var(--mc-series-6)',
	},
] as const;

type TabId = (typeof TABS)[number]['id'];

/**
 * Admin: writing one collection's rule. The preview resolves the criteria
 * against the catalog as they are typed — the definition is the source of
 * truth, and this is the first place anyone sees its shadow.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-music-collection-edit',
	providers: [MusicCollectionEditStore],
	imports: [
		...I18N_IMPORTS,
		AiMarkComponent,
		RouterLink,
		EntityPickerComponent,
		ImageLibraryComponent,
		SceneGeneratorComponent,
	],
	template: `
		<!--
			A fej a kollekciót mutatja, nem a szerkesztőt: a borító mögötte
			áll elmosva, a címkék pedig azt mondják el, ami a mentés után
			számít — közzé van-e téve, ki látja, és hány lemezt fog be.
		-->
		<header class="hero">
			@if (store.form().coverImageUrl; as cover) {
				<img class="hero-art" [src]="cover" alt="" aria-hidden="true" />
			}

			<div class="hero-text">
				<p class="eyebrow">
					{{ 'ui.musicCollectionEdit.collection-editor' | transloco }}
				</p>

				<h1>
					{{
						store.form().name ||
							(store.isNew()
								? 'Add collection'
								: 'Edit collection')
					}}
				</h1>

				<p class="lead">
					{{ 'ui.musicCollectionEdit.a-collection-is-a' | transloco }}
				</p>

				@if (!store.isLoading()) {
					<div class="pills">
						<span
							class="pill"
							[style.--pill]="
								store.form().status === 'published'
									? 'var(--mc-status-ok)'
									: 'var(--mc-status-warn)'
							"
						>
							<i class="pi pi-circle-fill" aria-hidden="true"></i>
							{{ store.form().status }}
						</span>

						<span class="pill" [style.--pill]="'var(--mc-info)'">
							<i class="pi pi-eye" aria-hidden="true"></i>
							{{ visibilityLabel() | transloco }}
						</span>

						<span class="pill" [style.--pill]="'var(--mc-accent)'">
							<i class="pi pi-database" aria-hidden="true"></i>
							{{
								store.previewTotal()
									| mcPlural
										: 'ui.musicCollectionEdit.previewTotal'
							}}
						</span>

						@if (store.form().slug) {
							<span class="pill is-path">
								/collections/{{ store.form().slug }}
							</span>
						}
					</div>
				}
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

			<!--
				Négy lap egy űrlap helyett. A rejtett lapok a DOM-ban
				maradnak — hidden attribútummal, nem feltételes blokkal —,
				mert a jelenetpad saját store-ja a komponensében él: egy
				lapváltás különben eldobná a kirajzolt jelölteket, amik
				pénzbe kerültek.
			-->
			<nav
				class="tabs"
				role="tablist"
				[attr.aria-label]="
					'ui.musicCollectionEdit.the-editor-s-sections' | transloco
				"
			>
				@for (one of tabs; track one.id) {
					<button
						type="button"
						role="tab"
						[id]="'tab-' + one.id"
						[class.is-active]="tab() === one.id"
						[style.--tint]="one.tint"
						[attr.aria-selected]="tab() === one.id"
						[attr.aria-controls]="'panel-' + one.id"
						[attr.tabindex]="tab() === one.id ? 0 : -1"
						(click)="tab.set(one.id)"
						(keydown)="onTabKey($event)"
					>
						<i [class]="one.icon" aria-hidden="true"></i>
						{{ one.labelKey | transloco }}

						@if (one.id === 'rule' && criteriaCount(); as count) {
							<span class="count">{{ count }}</span>
						}
						@if (one.id === 'looks' && store.form().coverImageUrl) {
							<span class="dot" aria-hidden="true"></span>
						}
						@if (one.id === 'badge' && store.form().badgeName) {
							<span class="dot" aria-hidden="true"></span>
						}
					</button>
				}
			</nav>

			<div class="layout" [style.--tint]="tint()">
				<div class="mc-form">
					<div
						class="panel"
						role="tabpanel"
						[id]="'panel-basics'"
						[attr.aria-labelledby]="'tab-basics'"
						[hidden]="tab() !== 'basics'"
					>
						<section class="mc-form-section">
							<h2>
								<span class="chip" aria-hidden="true">
									<i class="pi pi-id-card"></i>
								</span>
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

								<div class="mc-field">
									<label for="group">{{
										'ui.musicCollectionEdit.group' | transloco
									}}</label>
									<select id="group" (change)="onGroup($event)">
										@for (
											option of groupOptions;
											track option.value
										) {
											<option
												[value]="option.value"
												[selected]="
													form.group === option.value
												"
											>
												{{ option.labelKey | transloco }}
											</option>
										}
									</select>
									<small>
										{{
											'ui.musicCollectionEdit.groupHint'
												| transloco
										}}
									</small>
								</div>
							</div>
						</section>
					</div>

					<div
						class="panel"
						role="tabpanel"
						[id]="'panel-rule'"
						[attr.aria-labelledby]="'tab-rule'"
						[hidden]="tab() !== 'rule'"
					>
						<section class="mc-form-section">
							<h2>
								<span class="chip" aria-hidden="true">
									<i class="pi pi-filter"></i>
								</span>
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
													option of options(criterion);
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
					</div>

					<div
						class="panel"
						role="tabpanel"
						[id]="'panel-looks'"
						[attr.aria-labelledby]="'tab-looks'"
						[hidden]="tab() !== 'looks'"
					>
						<section class="mc-form-section">
							<h2>
								<span class="chip" aria-hidden="true">
									<i class="pi pi-image"></i>
								</span>
								{{ 'ui.musicCollectionEdit.the-look' | transloco }}
							</h2>
							<p class="hint">
								{{
									'ui.musicCollectionEdit.the-cover-stands-behind'
										| transloco
								}}
							</p>

							<div class="mc-form-grid">
								<div class="mc-field is-wide">
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

									<div class="image-upload">
										<!--
											A rejtett input és a köré írt label: a
											lap sehol nem hoz be PrimeNG-t, a
											példányfotóknál is ez a gomb alakja.
										-->
										<label class="button">
											<input
												type="file"
												accept="image/*"
												[disabled]="
													!!store.uploadingField()
												"
												(change)="
													chooseImage(
														'coverImageUrl',
														$event
													)
												"
											/>
											{{
												store.uploadingField() ===
												'coverImageUrl'
													? ('ui.musicCollectionEdit.uploading-the-image'
														| transloco)
													: ('ui.musicCollectionEdit.upload-an-image'
														| transloco)
											}}
										</label>

										<!--
											Amit egyszer feltöltöttek, azt nem kell
											másodszor: a könyvtárból is választható.
										-->
										<button
											type="button"
											class="button"
											(click)="
												store.openLibrary('coverImageUrl')
											"
										>
											{{
												'ui.musicCollectionEdit.pick-from-uploaded'
													| transloco
											}}
										</button>

									</div>

									<!--
										A borító nem bélyegkép: 16:9-ben áll a
										kollekció mögött, és azon dől el, marad-e
										hely a címnek. Akkora, hogy ez látszódjon
										rajta — a gombsorból kikerülve, saját
										sorban.
									-->
									@if (form.coverImageUrl) {
										<img
											class="cover-preview"
											[src]="form.coverImageUrl"
											[alt]="
												'ui.musicCollectionEdit.cover-image-url'
													| transloco
											"
										/>
									}

									@if (
										store.libraryTarget() === 'coverImageUrl'
									) {
										<mc-image-library
											[images]="store.library()"
											(picked)="store.pickFromLibrary($event)"
											(closed)="store.closeLibrary()"
										></mc-image-library>
									}
								</div>
							</div>

							<!--
								A rajzolás a borító mellett áll, és nem egy
								beállítás-lapon: ugyanaz a döntés, mint a feltöltés
								fölötte — hogy néz ki ez a kollekció —, csak a kép nem
								kész, hanem most készül. Ami megszületik, a borító
								URL-jébe kerül, ahonnan mentéskor a definícióba. Saját
								blokként, nem a mezőbe ágyazva: egy mezőn belül a
								saját rácsa teljes szélességű dobozok oszlopává esik
								szét.
							-->
							<mc-scene-generator
								[models]="store.imageModels()"
								[locks]="store.sceneLocks()"
								[title]="form.name"
								(picked)="store.useAsCover($event)"
							></mc-scene-generator>
						</section>
					</div>

					<div
						class="panel"
						role="tabpanel"
						[id]="'panel-badge'"
						[attr.aria-labelledby]="'tab-badge'"
						[hidden]="tab() !== 'badge'"
					>
						<section class="mc-form-section">
							<h2>
								<span class="chip" aria-hidden="true">
									<i class="pi pi-star"></i>
								</span>
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

									<div class="image-upload">
										<label class="button">
											<input
												type="file"
												accept="image/*"
												[disabled]="
													!!store.uploadingField()
												"
												(change)="
													chooseImage(
														'badgeArtworkUrl',
														$event
													)
												"
											/>
											{{
												store.uploadingField() ===
												'badgeArtworkUrl'
													? ('ui.musicCollectionEdit.uploading-the-image'
														| transloco)
													: ('ui.musicCollectionEdit.upload-an-image'
														| transloco)
											}}
										</label>

										<button
											type="button"
											class="button"
											(click)="
												store.openLibrary('badgeArtworkUrl')
											"
										>
											{{
												'ui.musicCollectionEdit.pick-from-uploaded'
													| transloco
											}}
										</button>

										@if (form.badgeArtworkUrl) {
											<img
												class="image-preview"
												[src]="form.badgeArtworkUrl"
												[alt]="
													'ui.musicCollectionEdit.the-uploaded-artwork'
														| transloco
												"
											/>
										}
									</div>

									@if (
										store.libraryTarget() === 'badgeArtworkUrl'
									) {
										<mc-image-library
											[images]="store.library()"
											(picked)="store.pickFromLibrary($event)"
											(closed)="store.closeLibrary()"
										></mc-image-library>
									}

									@if (store.badgeImageUid()) {
										<p class="hint">
											{{
												'ui.musicCollectionEdit.a-chosen-pin-covers'
													| transloco
											}}
										</p>
									}
								</div>

								<div class="mc-field is-wide badge-art">
									<div class="badge-art-head">
										<div>
											<strong>
												{{
													'ui.musicCollectionEdit.the-pin'
														| transloco
												}}
												<!-- A képet képmodell rajzolja: a
												     jelzés ugyanaz, mint a fotós
												     felismerésen és a koncertlapon. -->
												<mc-ai-mark
													[compact]="true"
													[hint]="
														'ui.aiMark.hint.image'
															| transloco
													"
												></mc-ai-mark>
											</strong>
											<small>
												{{
													'ui.musicCollectionEdit.drawn-by-an-image'
														| transloco
												}}
											</small>
										</div>
										<div class="badge-art-actions">
											<!--
												A saját kép ugyanúgy pin lesz, mint
												egy rajzolt: dokumentum készül fölé,
												bekerül a galériába, és ott marad,
												ha később mégis másikra esik a
												választás.
											-->
											<label
												class="button pin-upload"
												[class.is-disabled]="store.isNew()"
											>
												<input
													type="file"
													accept="image/*"
													[disabled]="
														store.isNew() ||
														store.isUploadingPin()
													"
													(change)="choosePin($event)"
												/>
												{{
													store.isUploadingPin()
														? ('ui.musicCollectionEdit.uploading-the-image'
															| transloco)
														: ('ui.musicCollectionEdit.my-own-picture-as-pin'
															| transloco)
												}}
											</label>

											<!--
												Egy már beiktatott kép — másik
												collection pinje, korábbi jelölt,
												feltöltött grafika — újra pin lehet,
												feltöltés nélkül.
											-->
											<button
												type="button"
												[disabled]="
													store.isNew() ||
													store.isPickingBadge()
												"
												(click)="store.openLibrary('pin')"
											>
												{{
													'ui.musicCollectionEdit.pick-from-uploaded'
														| transloco
												}}
											</button>

											<!--
												Melyik modell rajzolja. Üresen a
												gateway dönt, és az ársáv szerinti
												választása a legolcsóbb képmodell —
												minden eddigi pin azon készült,
												anélkül hogy ez bárhol látszott
												volna.
											-->
											<label class="model-pick">
												<span class="visually-hidden">
													A pin modellje
												</span>
												<select
													[disabled]="store.isNew()"
													(change)="
														store.setBadgeModel(
															value($event)
														)
													"
												>
													<option
														value=""
														[selected]="
															!store.badgeModel()
														"
													>
														A gateway válasszon
													</option>
													@for (
														model of store.imageModels();
														track model.id
													) {
														<option
															[value]="model.id"
															[selected]="
																model.id ===
																store.badgeModel()
															"
														>
															{{ model.id }}
														</option>
													}
												</select>
											</label>

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

											<!--
												A pin levétele nem törli a képet: a
												galériában marad, csak a jelvény
												esik vissza a feltöltött grafikára.
											-->
											@if (store.badgeImageUid()) {
												<button
													type="button"
													[disabled]="
														store.isPickingBadge()
													"
													(click)="
														store.clearBadgeImage()
													"
												>
													{{
														'ui.musicCollectionEdit.take-the-pin-off'
															| transloco
													}}
												</button>
											}
										</div>
									</div>

									@if (store.isNew()) {
										<p class="hint">
											{{
												'ui.musicCollectionEdit.save-the-collection-first'
													| transloco
											}}
										</p>
									}

									@if (store.libraryTarget() === 'pin') {
										<p class="hint">
											{{
												'ui.musicCollectionEdit.the-picked-image-becomes'
													| transloco
											}}
										</p>
										<mc-image-library
											[images]="store.library()"
											[chosenUid]="store.badgeImageUid()"
											[busy]="store.isPickingBadge()"
											(picked)="store.pickFromLibrary($event)"
											(closed)="store.closeLibrary()"
										></mc-image-library>
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
		:host {
			display: block;
			/*
				A nyitott lap színe. Minden szakasz ebből festi a keretét, a
				fejléc-ikonját és a mezői fókuszgyűrűjét, így egy pillantásból
				látszik, melyik lapon áll az ember — a lap tetejére felnézni
				nélküle is kellene.
			*/
			--tint: var(--mc-primary);
		}

		/*
			A fej a kollekciót mutatja, nem a szerkesztőt: a borító elmosva
			áll mögötte, a lejtő pedig olvashatóan tartja rajta a címet —
			sötét és világos témában egyaránt, mert a lap saját háttérszínéből
			készül.
		*/
		.hero {
			position: relative;
			overflow: hidden;
			padding: 1.5rem;
			margin-bottom: 1.1rem;
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-lg);
			background:
				radial-gradient(
					90% 140% at 0% 0%,
					color-mix(in srgb, var(--mc-primary) 26%, transparent),
					transparent 58%
				),
				radial-gradient(
					80% 130% at 100% 10%,
					color-mix(in srgb, var(--mc-info) 20%, transparent),
					transparent 55%
				),
				var(--mc-card-bg);
		}

		.hero-art {
			position: absolute;
			inset: 0;
			width: 100%;
			height: 100%;
			object-fit: cover;
			opacity: 0.3;
			filter: blur(3px) saturate(1.15);
			transform: scale(1.06);
		}

		.hero::after {
			content: '';
			position: absolute;
			inset: 0;
			background: linear-gradient(
				100deg,
				var(--mc-bg) 8%,
				color-mix(in srgb, var(--mc-bg) 55%, transparent) 55%,
				transparent
			);
		}

		.hero-text {
			position: relative;
			z-index: 1;
		}

		.eyebrow {
			margin: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.14em;
			text-transform: uppercase;
			color: var(--mc-accent);
		}

		.hero h1 {
			margin: 0.3rem 0 0;
			font-family: var(--mc-font-display);
			font-size: 2.25rem;
			font-weight: 400;
			letter-spacing: 0.03em;
			line-height: 1.05;
		}

		.lead {
			max-width: 68ch;
			margin: 0.45rem 0 0;
			font-size: 0.9rem;
			color: var(--mc-text-muted);
		}

		.pills {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;
			margin-top: 0.9rem;
		}

		/* A címke színét a hívó adja (--pill); szín nélkül halkan áll. */
		.pill {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			padding: 0.22rem 0.65rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--pill, var(--mc-text-muted));
			background: color-mix(
				in srgb,
				var(--pill, var(--mc-text-muted)) 14%,
				transparent
			);
			border: 1px solid
				color-mix(
					in srgb,
					var(--pill, var(--mc-text-muted)) 45%,
					transparent
				);
			border-radius: 999px;

			i {
				font-size: 0.62rem;
			}
		}

		.pill.is-path {
			font-weight: 500;
			font-variant-numeric: tabular-nums;
		}

		/* Négy lap: telefonon csúszik a sor, nem tördelődik két sorba. */
		.tabs {
			display: flex;
			gap: 0.3rem;
			max-width: 100%;
			padding: 0.3rem;
			margin-bottom: 1.1rem;
			overflow-x: auto;
			overflow-y: hidden;
			background: var(--mc-bg-muted);
			border: 1px solid var(--mc-border);
			border-radius: 999px;
			scrollbar-width: thin;
		}

		.tabs button {
			display: inline-flex;
			flex: 0 0 auto;
			align-items: center;
			gap: 0.45rem;
			padding: 0.5rem 0.95rem;
			font: inherit;
			font-size: 0.85rem;
			font-weight: 600;
			white-space: nowrap;
			color: var(--mc-text-muted);
			cursor: pointer;
			background: transparent;
			border: 1px solid transparent;
			border-radius: 999px;
			transition:
				background var(--mc-duration-fast),
				color var(--mc-duration-fast);

			i {
				font-size: 0.85rem;
				color: var(--tint);
			}

			&:hover {
				color: var(--mc-text);
				background: color-mix(in srgb, var(--tint) 12%, transparent);
			}

			&.is-active {
				color: var(--mc-text);
				background: color-mix(in srgb, var(--tint) 22%, transparent);
				border-color: color-mix(in srgb, var(--tint) 55%, transparent);
			}
		}

		/* Hány szűrő él a szabályon, és hogy van-e már kép, illetve jelvény. */
		.tabs .count {
			padding: 0 0.4rem;
			font-size: 0.72rem;
			font-variant-numeric: tabular-nums;
			color: var(--mc-on-primary);
			background: var(--tint);
			border-radius: 999px;
		}

		.tabs .dot {
			width: 0.4rem;
			height: 0.4rem;
			background: var(--tint);
			border-radius: 50%;
		}

		.panel {
			display: flex;
			flex-direction: column;
			gap: 1.25rem;
		}

		/*
			A nem látszó lap a DOM-ban marad, csak rejtve: a jelenetpad
			állapota — a kirajzolt, még el nem mentett jelöltek — a
			komponensében él, és egy feltételes blokk lapváltáskor eldobná.
		*/
		.panel[hidden] {
			display: none;
		}

		.mc-form-section {
			position: relative;
			background:
				radial-gradient(
					130% 100% at 0% 0%,
					color-mix(in srgb, var(--tint) 9%, transparent),
					transparent 62%
				),
				var(--mc-card-bg);
			border-color: color-mix(in srgb, var(--tint) 22%, var(--mc-border));
		}

		.mc-form-section::before {
			content: '';
			position: absolute;
			inset: 0 0 auto;
			height: 2px;
			background: linear-gradient(
				90deg,
				var(--tint),
				color-mix(in srgb, var(--tint) 20%, transparent) 65%,
				transparent
			);
			border-radius: var(--mc-radius-lg) var(--mc-radius-lg) 0 0;
		}

		.mc-form-section > h2 {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			font-size: 1rem;
		}

		.chip {
			display: inline-grid;
			flex: 0 0 auto;
			place-items: center;
			width: 1.8rem;
			height: 1.8rem;
			font-size: 0.8rem;
			color: var(--tint);
			background: color-mix(in srgb, var(--tint) 16%, transparent);
			border-radius: var(--mc-radius-md);
		}

		.image-upload {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
			margin-top: 0.6rem;
		}

		/* A gomb maga a label; a fájlválasztó mögötte áll. */
		.image-upload input,
		.pin-upload input {
			position: absolute;
			width: 1px;
			height: 1px;
			opacity: 0;
			pointer-events: none;
		}

		.image-upload .button,
		.pin-upload {
			cursor: pointer;
		}

		/* Mentetlen collectionön nincs hová beiktatni a képet. */
		.pin-upload.is-disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}

		.image-preview {
			width: 64px;
			height: 64px;
			object-fit: contain;
			border-radius: var(--mc-radius-md);
		}

		/* Ugyanabban az arányban, ahogy a kollekció mögött állni fog. */
		.cover-preview {
			width: 100%;
			max-width: 32rem;
			aspect-ratio: 16 / 9;
			margin-top: 0.75rem;
			object-fit: cover;
			background: var(--mc-bg-muted);
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
		}

		.badge-art-head {
			display: flex;
			flex-wrap: wrap;
			align-items: flex-start;
			justify-content: space-between;
			gap: 1rem;
		}

		/* Négy gomb: telefonon törik, nem lóg ki a kártyából. */
		.badge-art-actions {
			display: flex;
			flex-wrap: wrap;
			flex-shrink: 0;
			gap: 0.5rem;
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

		input:focus-visible,
		select:focus-visible,
		textarea:focus-visible {
			outline: none;
			border-color: color-mix(in srgb, var(--tint) 65%, transparent);
			box-shadow: 0 0 0 3px
				color-mix(in srgb, var(--tint) 20%, transparent);
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

		@media (max-width: 720px) {
			.hero {
				padding: 1.1rem;
			}

			.hero h1 {
				font-size: 1.75rem;
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
			background:
				radial-gradient(
					120% 90% at 100% 0%,
					color-mix(in srgb, var(--tint) 12%, transparent),
					transparent 62%
				),
				var(--mc-card-bg);
			border: 1px solid
				color-mix(in srgb, var(--tint) 22%, var(--mc-border));
			border-radius: var(--mc-radius-lg);

			h2 {
				margin: 0;
				font-size: 0.8rem;
				font-weight: 700;
				letter-spacing: 0.1em;
				text-transform: uppercase;
				color: var(--mc-text-muted);
			}
		}

		/* A szám maga a mondat — „12 lemez” —, ezért az egész sor nagy. */
		.total {
			margin: 0.35rem 0 0.75rem;
			font-size: 1.35rem;
			font-weight: 600;
			font-variant-numeric: tabular-nums;
			color: var(--mc-text);
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
				background: linear-gradient(
					135deg,
					var(--mc-primary),
					var(--mc-accent)
				);
				border-color: transparent;
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
	protected readonly groupOptions = GROUP_OPTIONS;
	protected readonly tabs = TABS;

	/**
	 * Melyik lap van felül. Nézeti állapot, ezért marad a komponensben: a
	 * store a definíciót írja, és abban ennek nyoma sincs.
	 */
	protected readonly tab = signal<TabId>('basics');

	/** A nyitott lap színe, amit az egész elrendezés átvesz. */
	protected readonly tint = computed(
		() => TABS.find((one) => one.id === this.tab())?.tint ?? ''
	);

	/**
	 * Hány szűrőt visel a szabály — ennyi áll a lap fülén. A feloldott
	 * alakból számol, nem az űrlapéból: egy üresen hagyott operátor vagy egy
	 * érték nélküli lista nem szűrő, és a fül sem mondhatja annak.
	 */
	protected readonly criteriaCount = computed(
		() => Object.keys(this.store.criteria()).length
	);

	/** A láthatóság szava a fej címkéjéhez, a legördülővel egy forrásból. */
	protected readonly visibilityLabel = computed(() => {
		const visibility = this.store.form().visibility;

		return (
			VISIBILITY_OPTIONS.find((one) => one.value === visibility) ??
			VISIBILITY_OPTIONS[0]
		).labelKey;
	});

	public constructor() {
		this.store.load(
			inject(ActivatedRoute).paramMap.pipe(
				map((params) => params.get('uid') ?? '0')
			)
		);
	}

	/**
	 * What a criterion offers: the list the code knows, or — for the styles —
	 * the taxonomy's, which arrives with the page rather than with the build.
	 */
	protected options(
		criterion: (typeof ENUM_CRITERIA)[number]
	): readonly string[] {
		return criterion.options ?? this.store.styles();
	}

	/** The definitions a collection may sit under — never itself. */
	protected parents(): { uid: string; name: string }[] {
		const uid = this.store.uid();

		return this.store.parents().filter((parent) => parent.uid !== uid);
	}

	/**
	 * Nyilakkal is lehet lapozni, ahogy egy `tablist`-től elvárható: a
	 * fókusz a lappal megy, különben a következő nyíl a régi gombról
	 * indulna.
	 */
	protected onTabKey(event: KeyboardEvent): void {
		const step =
			event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

		if (!step) {
			return;
		}

		event.preventDefault();

		const index = TABS.findIndex((one) => one.id === this.tab());
		const next = TABS[(index + step + TABS.length) % TABS.length];

		this.tab.set(next.id);
		(event.currentTarget as HTMLElement).parentElement
			?.querySelector<HTMLElement>(`#tab-${next.id}`)
			?.focus();
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement | HTMLSelectElement).value;
	}

	/**
	 * A hand-made pin. It is not a form field like the other two uploads:
	 * the picture goes to the server, which files it and makes it the
	 * badge, so there is nothing here to write into the form.
	 */
	protected choosePin(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.store.uploadPin(of(file));
		}

		input.value = '';
	}

	/**
	 * The chosen file on its way to Storage. The input is cleared afterwards,
	 * so picking the same file twice still counts as a change.
	 */
	protected chooseImage(field: UploadableField, event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			this.store.uploadImage(of({ field, file }));
		}

		input.value = '';
	}

	protected onVisibility(event: Event): void {
		this.store.setField({
			visibility: this.value(event) as CollectionForm['visibility'],
		});
	}

	protected onParent(event: Event): void {
		this.store.setField({ parentUid: this.value(event) });
	}

	protected onGroup(event: Event): void {
		this.store.setField({
			group: this.value(event) as CollectionForm['group'],
		});
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
