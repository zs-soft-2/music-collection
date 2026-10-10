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
 * The style lock candidates, in the order they are worth trying. `none` is
 * the raw draw: the subject is the whole prompt, and what the model does
 * unled is the baseline every lock has to beat.
 */
const DRAFTS: readonly { id: SceneStyleDraft; label: string }[] = [
	{ id: 'none', label: 'Nincs zár — a szöveg megy ki, változtatás nélkül' },
	{ id: 'nocturne', label: 'Nocturne — éjszaka, egy meleg fénnyel' },
	{ id: 'weathered', label: 'Weathered — hideg, ködös, nap nélkül' },
	{ id: 'interior', label: 'Interior — belső tér, egy lámpával' },
];

/**
 * What the server lets a subject run to. Shown rather than enforced: the
 * ceiling is the server's, and a form that silently truncated would hide
 * the end of a prompt somebody wrote on purpose.
 */
const MAX_SUBJECT = 4000;

/** What the server will accept; which of them the model takes is the question. */
const SIZES: readonly string[] = [
	'1536x864',
	'1344x768',
	'1920x1080',
	'1024x1024',
];

/**
 * Subjects worth starting from: the collections that would get a backdrop
 * first, written the way a prompt wants them — a place, not a band.
 */
const BRIEF =
	'Standalone production-quality wide landscape website background, 16:9. ' +
	'Generate ONLY the background image: not a webpage, not a collage, no ' +
	'UI, no text, no lettering, no logos, no watermark, no people. Full ' +
	'bleed cinematic composition, deep atmospheric perspective, restrained ' +
	'sophisticated detail. It sits behind cards and white headline text, so ' +
	'keep the value range dark and the centre quiet, with the interest at ' +
	'the edges and no bright central focal point. ';

const EXAMPLES: readonly { label: string; subject: string }[] = [
	{
		label: 'Bay Area Thrash',
		subject:
			BRIEF +
			'Subject: the Bay Bridge and the San Francisco skyline seen ' +
			'across the water from an industrial Oakland shoreline at ' +
			'night, warm sodium lights in the far distance, low haze over ' +
			'the water, 1980s Bay Area thrash atmosphere.',
	},
	{
		label: 'Gothenburg Sound',
		subject:
			BRIEF +
			'Subject: a dense Nordic pine forest on a steep hillside above ' +
			'a cold fjord at blue hour, mist in receding layers, snow ' +
			'still lying in the shadows.',
	},
	{
		label: 'Doom',
		subject:
			BRIEF +
			'Subject: a derelict stone chapel on an open moor under a low ' +
			'heavy sky, its windows long gone, rain in the air.',
	},
	{
		label: 'A lap háttere',
		subject:
			BRIEF +
			'Subject: a wall of shelved vinyl records in a closed record ' +
			'shop seen from across the room, a single warm lamp just out ' +
			'of frame, everything beyond the foreground in soft bokeh.',
	},
];

/**
 * The collection's backdrop, drawn.
 *
 * Beside the pin, not on a settings page: both answer the same question —
 * what this collection looks like — and both are a thing an admin decides
 * while looking at the collection, not while looking at a budget.
 *
 * The models and the lock texts come in from the page, which asks the
 * gateway for them once and hands them to both panels; the picture that is
 * taken goes back out as a url, already uploaded and filed.
 *
 * Deliberately not translated. The locks are still being settled, and three
 * locale files gaining keys that may have to come back out is work in both
 * directions while that is true.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-scene-generator',
	providers: [SceneGeneratorStore],
	template: `
		<div class="probe">
			<p class="lead">
				A kollekció háttérképe. A kép csak akkor marad meg, ha
				ráteszed a kollekcióra — addig csak itt van, a lapon.
			</p>

			<div class="examples">
				<span>Kezdéshez:</span>
				@for (example of examples; track example.label) {
					<button
						type="button"
						(click)="store.set({ subject: example.subject })"
					>
						{{ example.label }}
					</button>
				}
			</div>

			<div class="mc-field is-wide">
				<label for="probe-subject">Mi legyen a képen</label>
				<textarea
					id="probe-subject"
					rows="3"
					placeholder="egy hely, egy mondatban — angolul"
					[value]="store.subject()"
					(input)="store.set({ subject: value($event) })"
				></textarea>
				<small>
					Egy hely, ne egy zenekar: a név védjegy, és a modell
					úgyis rosszul rajzolja. Zár nélkül ez az egész prompt,
					tehát itt hosszan is lehet írni.
					<span
						class="count"
						[class.is-over]="store.subject().length > maxSubject"
					>
						{{ store.subject().length }} / {{ maxSubject }}
					</span>
				</small>
			</div>

			<div class="mc-form-grid">
				<div class="mc-field">
					<label for="probe-draft">Stíluszár</label>
					<select
						id="probe-draft"
						(change)="store.set({ draft: draft($event) })"
					>
						@for (option of drafts; track option.id) {
							<option
								[value]="option.id"
								[selected]="option.id === store.draft()"
							>
								{{ option.label }}
							</option>
						}
					</select>
				</div>

				<div class="mc-field">
					<label for="probe-size">Méret</label>
					<select
						id="probe-size"
						(change)="store.set({ size: value($event) })"
					>
						@for (size of sizes; track size) {
							<option
								[value]="size"
								[selected]="size === store.size()"
							>
								{{ size }}
							</option>
						}
					</select>
					<small>Amit a mai képmodell elfogad, az is kiderül.</small>
				</div>

				<div class="mc-field">
					<label for="probe-count">Hány kép</label>
					<input
						id="probe-count"
						type="number"
						min="1"
						max="4"
						[value]="store.count()"
						(input)="store.setCount(value($event))"
					/>
					<small>A napi képkeret ezekre is fogy.</small>
				</div>

				<div class="mc-field is-wide">
					<label for="probe-model">Modell</label>
					<select
						id="probe-model"
						(change)="store.set({ model: value($event) })"
					>
						<option value="" [selected]="!store.model()">
							A gateway válasszon (ársáv szerint)
						</option>
						@for (model of models(); track model.id) {
							<option
								[value]="model.id"
								[selected]="model.id === store.model()"
							>
								{{ model.id
								}}{{ model.label ? ' — ' + model.label : '' }}
							</option>
						}
					</select>
					<small>
						@if (models().length) {
							A gatewayre bízva mindig a legolcsóbb rajzol — a
							legjobb képet a pro modell adja.
						} @else {
							A modell-lista töltődik; addig a gateway választ.
						}
					</small>
				</div>
			</div>

			<!--
				What will actually be sent. The locks wrap the text, and a
				lock around a finished prompt makes nonsense of it — that
				has to be visible before it costs a draw, not after.
			-->
			@if (outgoing(); as outgoing) {
				<div class="preview">
					<p class="preview-head">
						Ez megy ki
						@if (store.draft() !== 'none') {
							<span class="warn">
								— a(z) {{ store.draft() }} zár közé fűzve
							</span>
						}
					</p>
					<p class="preview-body">{{ outgoing }}</p>
				</div>
			}

			<div class="mc-form-actions">
				<button
					type="button"
					class="primary"
					[disabled]="!store.canProbe()"
					(click)="store.run()"
				>
					{{ store.isProbing() ? 'Rajzol…' : 'Rajzolj' }}
				</button>
			</div>

			@if (store.error(); as error) {
				<p class="error" role="alert">{{ error }}</p>
			}

			@if (store.result(); as result) {
				<div class="result">
					<ul class="shots">
						@for (image of result.images; track $index) {
							<li>
								<figure>
									<img
										[src]="image"
										[alt]="
											'Próbakép ' +
											($index + 1) +
											', ' +
											result.draft +
											' zárral'
										"
										(load)="measure($index, $event)"
									/>
									<!--
										The size the picture actually came
										back at. The requested one is a wish:
										these models take an aspect ratio, not
										pixels, and hand back a square however
										wide you ask.
									-->
									<span class="measured" aria-hidden="true">
										{{ measured()[$index] ?? '…' }}
									</span>
									<figcaption aria-hidden="true">
										BAY AREA THRASH
									</figcaption>
								</figure>
								<div class="shot-actions">
									<!--
										The library is where a picture becomes
										usable: the file alone would sit in the
										bucket where nothing can find it, so
										this files a document over it, the same
										way the editor's own upload does.
									-->
									@if (store.kept().includes($index)) {
										<span class="kept">
											✓ Ez a háttér
										</span>
									} @else {
										<button
											type="button"
											[disabled]="
												store.keeping() !== null
											"
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
											'jelenet-' +
											result.draft +
											'-' +
											($index + 1) +
											'.png'
										"
									>
										Letöltés
									</a>
								</div>
							</li>
						}
					</ul>

					@if (result.dropped) {
						<p class="dropped" role="status">
							{{ result.dropped }} kép nem fért a válaszba —
							kérj kevesebbet vagy kisebbet.
						</p>
					}

					<dl class="facts">
						<dt>Rajzolta</dt>
						<dd>{{ result.model }}</dd>
						<dt>Kértük</dt>
						<dd>
							{{
								result.requestedModel ??
									'a gateway választott'
							}}
						</dd>
						<dt>Kért méret</dt>
						<dd>{{ result.size }}</dd>
						<dt>Zár</dt>
						<dd>{{ result.draft }}</dd>
					</dl>

					<details>
						<summary>A prompt, amit a modell kapott</summary>
						<p class="prompt">{{ result.prompt }}</p>
					</details>
				</div>
			}
		</div>
	`,
	styles: `
		.probe {
			border: 1px dashed var(--mc-border-strong);
			border-radius: var(--mc-radius-lg);
			padding: 1.25rem;
		}

		.tag {
			margin-left: 0.5rem;
			padding: 0.15rem 0.5rem;
			border: 1px solid var(--mc-accent);
			border-radius: 999px;
			font-size: 0.65rem;
			font-weight: 700;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--mc-accent);
			vertical-align: middle;
		}

		.lead {
			max-width: 60ch;
			margin: 0 0 1rem;
			color: var(--mc-text-muted);
			line-height: 1.6;
		}

		.examples {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.5rem;
			margin-bottom: 1rem;
			font-size: 0.85rem;
			color: var(--mc-text-muted);

			button {
				padding: 0.3rem 0.75rem;
				background: transparent;
				border: 1px solid var(--mc-border-strong);
				border-radius: 999px;
				color: var(--mc-text);
				font: inherit;
				cursor: pointer;

				&:hover {
					border-color: var(--mc-accent);
				}
			}
		}

		textarea {
			resize: vertical;
		}

		/*
		 * The count is here because the ceiling is the server's: a subject
		 * over it comes back as an error after the round trip, which is a
		 * slow way to learn you wrote too much.
		 */
		/* The size that actually came back, over the corner of the picture. */
		.measured {
			position: absolute;
			top: 0.5rem;
			right: 0.5rem;
			padding: 0.2rem 0.5rem;
			border-radius: var(--mc-radius-sm);
			background: rgb(0 0 0 / 70%);
			color: #fff;
			font-size: 0.7rem;
			font-variant-numeric: tabular-nums;
		}

		.warn {
			color: var(--mc-status-warn);
		}

		.preview {
			margin: 1rem 0;
			padding: 0.85rem 1rem;
			background: var(--mc-surface-2);
			border-left: 3px solid var(--mc-info);
			border-radius: 0 var(--mc-radius-md) var(--mc-radius-md) 0;
		}

		.preview-head {
			margin: 0 0 0.4rem;
			font-size: 0.7rem;
			font-weight: 700;
			letter-spacing: 0.1em;
			text-transform: uppercase;
			color: var(--mc-text-subtle);
		}

		.preview-body {
			max-width: 90ch;
			margin: 0;
			max-height: 9rem;
			overflow-y: auto;
			color: var(--mc-text-muted);
			font-size: 0.8rem;
			line-height: 1.6;
		}

		.count {
			float: right;
			font-variant-numeric: tabular-nums;
			color: var(--mc-text-subtle);

			&.is-over {
				color: var(--mc-status-bad);
				font-weight: 700;
			}
		}

		.shots {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: 1rem;
			margin: 1rem 0 0;
			padding: 0;
			list-style: none;
		}

		/*
		 * The caption is not a label: it stands where a collection's name
		 * will stand on the card, so a lock that leaves no room for it fails
		 * here rather than after the real thing is built.
		 */
		figure {
			position: relative;
			margin: 0;
			overflow: hidden;
			border-radius: var(--mc-radius-md);
			background: var(--mc-surface-2);

			img {
				display: block;
				width: 100%;
				height: auto;
			}

			figcaption {
				position: absolute;
				inset: auto 0 0 0;
				padding: 2.5rem 1rem 0.9rem;
				background: linear-gradient(
					to top,
					rgb(0 0 0 / 85%),
					transparent
				);
				font-family: var(--mc-font-display);
				font-size: 1.75rem;
				letter-spacing: 0.02em;
				color: #fff;
			}
		}

		.shot-actions {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			margin-top: 0.5rem;
			font-size: 0.8rem;

			button {
				padding: 0.35rem 0.85rem;
				background: transparent;
				border: 1px solid var(--mc-border-strong);
				border-radius: 999px;
				color: var(--mc-text);
				font: inherit;
				cursor: pointer;

				&:hover:not(:disabled) {
					border-color: var(--mc-accent);
				}

				&:disabled {
					opacity: 0.5;
					cursor: default;
				}
			}
		}

		.kept {
			font-weight: 600;
			color: var(--mc-status-ok);
		}

		.dropped {
			margin: 0.75rem 0 0;
			color: var(--mc-status-warn);
			font-size: 0.85rem;
		}

		.facts {
			display: flex;
			flex-wrap: wrap;
			gap: 0.25rem 1.25rem;
			margin: 1rem 0 0.5rem;
			font-size: 0.85rem;

			dt {
				color: var(--mc-text-subtle);
			}

			dd {
				margin: 0 1rem 0 0;
				font-weight: 600;
			}
		}

		.prompt {
			max-width: 80ch;
			margin: 0.5rem 0 0;
			color: var(--mc-text-muted);
			font-size: 0.85rem;
			line-height: 1.6;
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

	/**
	 * Exactly what the model will be sent.
	 *
	 * Assembled from the server's own lock texts rather than a copy kept
	 * here: a copy would drift, and the only reason to show this is that it
	 * is the thing itself. A lock wrapped around a finished prompt once
	 * produced "…at blue hour of Use case: stylized-concept", and nothing on
	 * the page said it would.
	 */
	protected readonly outgoing = computed(() => {
		const subject = this.store.subject().trim();

		if (!subject) {
			return '';
		}

		const lock = this.locks().find((one) => one.id === this.store.draft());

		return lock ? `${lock.prefix}${subject}${lock.suffix}` : subject;
	});

	/** Files the picture, then hands its url to the page. */
	protected async take(index: number): Promise<void> {
		const url = await this.store.keep(index);

		if (url) {
			this.picked.emit(url);
		}
	}
	protected readonly drafts = DRAFTS;
	protected readonly sizes = SIZES;
	protected readonly examples = EXAMPLES;
	protected readonly maxSubject = MAX_SUBJECT;

	/**
	 * What each picture actually came back as, by its place in the grid.
	 *
	 * Purely a view concern, so it stays out of the store: the browser is
	 * the only one that knows, and it only knows once the image has loaded.
	 */
	protected readonly measured = signal<Record<number, string>>({});

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
