import {
	ChangeDetectionStrategy,
	Component,
	computed,
	inject,
	input,
	output,
	signal,
} from '@angular/core';
import {
	SceneLockText,
	SceneModel,
	SceneStyleDraft,
} from '@music-collection/domain/music-collection/api';

import { SceneGeneratorStore } from './scene-generator.store';

/**
 * The style locks. `none` is first and is the default: what is typed goes to
 * the model as written. A lock wrapped around a finished prompt once
 * produced "…at blue hour of Use case: stylized-concept", so the wrapping
 * has to be asked for, not assumed.
 */
const DRAFTS: readonly { id: SceneStyleDraft; label: string }[] = [
	{ id: 'none', label: 'Nincs zár — a szöveg megy ki, változtatás nélkül' },
	{ id: 'nocturne', label: 'Nocturne — éjszaka, egy meleg fénnyel' },
	{ id: 'weathered', label: 'Weathered — hideg, ködös, nap nélkül' },
	{ id: 'interior', label: 'Interior — belső tér, egy lámpával' },
];

/** What the server accepts; which of them the model honours is another matter. */
const SIZES: readonly string[] = [
	'1536x864',
	'1344x768',
	'1920x1080',
	'1024x1024',
];

/**
 * The brief every backdrop shares, in front of whatever the collection is.
 *
 * It is a starting point in the box, not a lock in the code: the picture
 * sits behind cards and a white title, which is a constraint of this app
 * rather than of this collection, so it belongs in the first draft of every
 * prompt — and stays editable, because that is what the box is for.
 */
const BRIEF =
	'Standalone production-quality wide landscape website background, 16:9. ' +
	'Generate ONLY the background image: not a webpage, not a collage, no ' +
	'UI, no text, no lettering, no logos, no watermark, no people. Full ' +
	'bleed cinematic composition, deep atmospheric perspective, restrained ' +
	'sophisticated detail. It sits behind cards and white headline text, so ' +
	'keep the value range dark and the centre quiet, with the interest at ' +
	'the edges and no bright central focal point. Subject: ';

/**
 * The collection's backdrop, drawn.
 *
 * It sits beside the pin rather than on a settings page: both answer the
 * same question — what does this collection look like — and both are
 * decided while looking at the collection, not at a budget.
 *
 * Closed until asked for, and laid out on its own classes rather than the
 * editor's form grid: nested inside a field, those collapse into a column
 * of full-width boxes.
 *
 * Deliberately untranslated while the locks are still being settled.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-scene-generator',
	providers: [SceneGeneratorStore],
	template: `
		<details class="panel">
			<summary>
				Háttérkép rajzolása
				<span class="by">képmodell</span>
			</summary>

			<div class="body">
				<label class="field">
					<span class="label">Mi legyen a képen</span>
					<textarea
						rows="4"
						placeholder="egy hely, angolul — a zár nélküli módban ez az egész prompt"
						[value]="store.subject()"
						(input)="store.set({ subject: value($event) })"
					></textarea>
					<span class="note">
						Egy hely, ne egy zenekar: a név védjegy, és a modell
						úgyis rosszul rajzolja.
						<b class="count">{{ store.subject().length }}/4000</b>
					</span>
				</label>

				<div class="starters">
					<button type="button" (click)="startFromBrief()">
						Kezdő sablon
					</button>
					@if (title()) {
						<button type="button" (click)="startFromTitle()">
							{{ title() }} alapján
						</button>
					}
				</div>

				<div class="row">
					<label class="field">
						<span class="label">Modell</span>
						<select (change)="store.set({ model: value($event) })">
							<option value="" [selected]="!store.model()">
								A gateway válasszon
							</option>
							@for (model of models(); track model.id) {
								<option
									[value]="model.id"
									[selected]="model.id === store.model()"
								>
									{{ model.id }}
								</option>
							}
						</select>
					</label>

					<label class="field">
						<span class="label">Stíluszár</span>
						<select (change)="store.set({ draft: draft($event) })">
							@for (option of drafts; track option.id) {
								<option
									[value]="option.id"
									[selected]="option.id === store.draft()"
								>
									{{ option.label }}
								</option>
							}
						</select>
					</label>

					<label class="field is-narrow">
						<span class="label">Méret</span>
						<select (change)="store.set({ size: value($event) })">
							@for (size of sizes; track size) {
								<option
									[value]="size"
									[selected]="size === store.size()"
								>
									{{ size }}
								</option>
							}
						</select>
					</label>

					<label class="field is-narrow">
						<span class="label">Képek</span>
						<input
							type="number"
							min="1"
							max="4"
							[value]="store.count()"
							(input)="store.setCount(value($event))"
						/>
					</label>
				</div>

				@if (outgoing(); as prompt) {
					<div class="preview">
						<p class="preview-head">
							Ez megy ki
							@if (store.draft() !== 'none') {
								<span class="warn">
									— a(z) {{ store.draft() }} zár közé fűzve
								</span>
							}
						</p>
						<p class="preview-body">{{ prompt }}</p>
					</div>
				}

				<div class="actions">
					<button
						type="button"
						class="go"
						[disabled]="!store.canProbe()"
						(click)="store.run()"
					>
						{{ store.isProbing() ? 'Rajzol…' : 'Rajzolj' }}
					</button>
					<span class="hint">
						A kép csak akkor marad meg, ha ráteszed a kollekcióra.
					</span>
				</div>

				@if (store.error(); as error) {
					<p class="error" role="alert">{{ error }}</p>
				}

				<!--
					A tárgy szabad szöveg, és az is marad: a pad arra való,
					hogy ki lehessen próbálni, mitől lesz jó a kép. Ami a
					felelősséget mégis viselhetővé teszi, az nem egy tiltás,
					hanem az, hogy amikor a modell elzárkózik, az ne egy
					néma hiba legyen.
				-->
				@if (store.errorReason() === 'no-image') {
					<p class="refused">
						A hívás sikerült, kép mégsem lett — ez rendszerint a
						modell elzárkózása. A leggyakoribb ok, hogy a
						szövegben valódi előadó-, zenekar- vagy személynév
						áll; a modell ilyenkor nem rajzol, és a gateway
						oldalán sikeres, nulla dolláros hívás marad utána.
						Írd körül a helyet név nélkül, és indítsd újra.
					</p>
				}

				@if (store.result(); as result) {
					<ul class="shots">
						@for (image of result.images; track $index) {
							<li>
								<figure>
									<img
										[src]="image"
										[alt]="'Háttérkép-jelölt ' + ($index + 1)"
										(load)="measure($index, $event)"
									/>
									<span class="measured" aria-hidden="true">
										{{ measured()[$index] ?? '…' }}
									</span>
									<!--
										The collection's own name, where it
										will stand on the card: a backdrop
										that leaves nowhere for the title
										fails here rather than afterwards.
									-->
									<figcaption aria-hidden="true">
										{{ title() || 'A KOLLEKCIÓ NEVE' }}
									</figcaption>
								</figure>

								<div class="shot-actions">
									@if (store.kept().includes($index)) {
										<span class="kept">✓ Ez a háttér</span>
									} @else {
										<button
											type="button"
											[disabled]="store.keeping() !== null"
											(click)="take($index)"
										>
											{{
												store.keeping() === $index
													? 'Mentés…'
													: 'Ez legyen a háttér'
											}}
										</button>
									}
									<a
										[href]="image"
										[download]="
											'hatter-' + ($index + 1) + '.png'
										"
									>
										Letöltés
									</a>
								</div>
							</li>
						}
					</ul>

					@if (result.dropped) {
						<p class="warn" role="status">
							{{ result.dropped }} kép nem fért a válaszba — kérj
							kevesebbet vagy kisebbet.
						</p>
					}

					<p class="facts">
						Rajzolta: <b>{{ result.model }}</b> · kért méret:
						<b>{{ result.size }}</b>
					</p>
				}
			</div>
		</details>
	`,
	styles: `
		:host {
			display: block;
			margin-top: 0.75rem;
		}

		.panel {
			border: 1px solid var(--mc-border);
			border-radius: var(--mc-radius-md);
			background: var(--mc-bg-muted);
		}

		summary {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 0.65rem 0.9rem;
			font-size: 0.85rem;
			font-weight: 600;
			cursor: pointer;
		}

		.by {
			padding: 0.1rem 0.45rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
			font-size: 0.65rem;
			font-weight: 600;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.body {
			display: flex;
			flex-direction: column;
			gap: 0.9rem;
			padding: 0 0.9rem 0.9rem;
		}

		/* Own classes, not the editor's: nested in a field, its grid stacks. */
		.row {
			display: flex;
			flex-wrap: wrap;
			gap: 0.75rem;
		}

		.field {
			display: flex;
			flex: 1 1 14rem;
			flex-direction: column;
			gap: 0.3rem;
			min-width: 0;
		}

		.field.is-narrow {
			flex: 0 1 8rem;
		}

		.label {
			font-size: 0.75rem;
			font-weight: 600;
			color: var(--mc-text-muted);
		}

		textarea {
			resize: vertical;
			font-family: inherit;
		}

		.note {
			font-size: 0.72rem;
			line-height: 1.5;
			color: var(--mc-text-subtle);
		}

		.count {
			float: right;
			font-variant-numeric: tabular-nums;
		}

		.starters {
			display: flex;
			flex-wrap: wrap;
			gap: 0.4rem;

			button {
				padding: 0.25rem 0.7rem;
				background: transparent;
				border: 1px solid var(--mc-border-strong);
				border-radius: 999px;
				color: var(--mc-text);
				font: inherit;
				font-size: 0.75rem;
				cursor: pointer;
			}

			button:hover {
				border-color: var(--mc-accent);
			}
		}

		.preview {
			padding: 0.6rem 0.75rem;
			background: var(--mc-surface-2);
			border-left: 3px solid var(--mc-info);
			border-radius: 0 var(--mc-radius-sm) var(--mc-radius-sm) 0;
		}

		.preview-head {
			margin: 0 0 0.3rem;
			font-size: 0.65rem;
			font-weight: 700;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.preview-body {
			max-height: 7rem;
			margin: 0;
			overflow-y: auto;
			font-size: 0.75rem;
			line-height: 1.55;
			color: var(--mc-text-muted);
		}

		.actions {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.75rem;
		}

		.go {
			padding: 0.45rem 1.1rem;
			background: var(--mc-primary);
			border: 0;
			border-radius: 999px;
			color: var(--mc-on-primary);
			font: inherit;
			font-weight: 700;
			cursor: pointer;
		}

		.go:disabled {
			opacity: 0.5;
			cursor: default;
		}

		.hint {
			font-size: 0.72rem;
			color: var(--mc-text-subtle);
		}

		.error {
			margin: 0;
			color: var(--mc-status-bad);
			font-size: 0.8rem;
		}

		.warn {
			color: var(--mc-status-warn);
			font-size: 0.75rem;
		}

		.refused {
			margin: 0;
			padding: 0.5rem 0.7rem;
			border-left: 3px solid var(--mc-status-warn);
			border-radius: 0 var(--mc-radius-sm) var(--mc-radius-sm) 0;
			background: var(--mc-surface-2);
			font-size: 0.75rem;
			line-height: 1.55;
			color: var(--mc-text-muted);
		}

		.shots {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
			gap: 0.9rem;
			margin: 0;
			padding: 0;
			list-style: none;
		}

		figure {
			position: relative;
			margin: 0;
			overflow: hidden;
			border-radius: var(--mc-radius-sm);
			background: var(--mc-surface-2);
		}

		figure img {
			display: block;
			width: 100%;
			height: auto;
		}

		.measured {
			position: absolute;
			top: 0.4rem;
			right: 0.4rem;
			padding: 0.15rem 0.4rem;
			border-radius: var(--mc-radius-sm);
			background: rgb(0 0 0 / 70%);
			color: #fff;
			font-size: 0.65rem;
			font-variant-numeric: tabular-nums;
		}

		figcaption {
			position: absolute;
			inset: auto 0 0 0;
			padding: 2rem 0.75rem 0.65rem;
			background: linear-gradient(to top, rgb(0 0 0 / 85%), transparent);
			font-family: var(--mc-font-display);
			font-size: 1.3rem;
			letter-spacing: 0.02em;
			color: #fff;
		}

		.shot-actions {
			display: flex;
			align-items: center;
			gap: 0.6rem;
			margin-top: 0.4rem;
			font-size: 0.75rem;

			button {
				padding: 0.3rem 0.7rem;
				background: transparent;
				border: 1px solid var(--mc-border-strong);
				border-radius: 999px;
				color: var(--mc-text);
				font: inherit;
				font-size: 0.75rem;
				cursor: pointer;
			}

			button:hover:not(:disabled) {
				border-color: var(--mc-accent);
			}

			button:disabled {
				opacity: 0.5;
				cursor: default;
			}
		}

		.kept {
			font-weight: 600;
			color: var(--mc-status-ok);
		}

		.facts {
			margin: 0;
			font-size: 0.72rem;
			color: var(--mc-text-subtle);
		}
	`,
})
export class SceneGeneratorComponent {
	/** The image models the page asked the gateway for, once, for both panels. */
	public readonly models = input<SceneModel[]>([]);
	/** The lock texts, so the outgoing prompt can be shown before it is sent. */
	public readonly locks = input<SceneLockText[]>([]);
	/** The collection's name, written across each candidate as a title would be. */
	public readonly title = input<string>('');
	/** A picture taken as the artwork: already uploaded and filed, by url. */
	public readonly picked = output<string>();

	protected readonly store = inject(SceneGeneratorStore);
	protected readonly drafts = DRAFTS;
	protected readonly sizes = SIZES;

	/**
	 * What each picture actually came back as, by its place in the grid.
	 *
	 * A view concern, so it stays out of the store: only the browser knows,
	 * and only once the image has loaded. It matters because the requested
	 * size is a wish — these models take an aspect ratio, not pixels, and
	 * hand back a square however wide you ask.
	 */
	protected readonly measured = signal<Record<number, string>>({});

	/**
	 * Exactly what the model will be sent.
	 *
	 * Assembled from the server's own lock texts rather than a copy kept
	 * here: a copy would drift, and the only reason to show this is that it
	 * is the thing itself.
	 */
	protected readonly outgoing = computed(() => {
		const subject = this.store.subject().trim();

		if (!subject) {
			return '';
		}

		const lock = this.locks().find((one) => one.id === this.store.draft());

		return lock ? `${lock.prefix}${subject}${lock.suffix}` : subject;
	});

	protected startFromBrief(): void {
		this.store.set({ subject: BRIEF });
	}

	/** The brief with the collection's name after it, as a first sentence. */
	protected startFromTitle(): void {
		this.store.set({ subject: `${BRIEF}${this.title()}, ` });
	}

	/** Files the picture, then hands its url to the page. */
	protected async take(index: number): Promise<void> {
		const url = await this.store.keep(index);

		if (url) {
			this.picked.emit(url);
		}
	}

	protected measure(index: number, event: Event): void {
		const image = event.target as HTMLImageElement;

		this.measured.update((sizes) => ({
			...sizes,
			[index]: `${image.naturalWidth}×${image.naturalHeight}`,
		}));
	}

	protected value(event: Event): string {
		return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
	}

	protected draft(event: Event): SceneStyleDraft {
		return (event.target as HTMLSelectElement).value as SceneStyleDraft;
	}
}
