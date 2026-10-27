import { I18N_IMPORTS } from '@music-collection/core/i18n';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The mark that says a model did this.
 *
 * One component for every such place in the app, because the promise is to the
 * reader, not to a page: wherever something was proposed, read or drawn by a
 * model, it looks the same and reads the same. A collector who learns the mark
 * on the concert page recognises it under a badge without being told again.
 *
 * What goes on it:
 *  - the word itself (`Modell` by default, and the label is translated), so
 *    the mark says something even without the hover;
 *  - a sentence, as `hint`, on what the model actually did here and what
 *    checked it. This is the part the pages differ in, and the reason the text
 *    is passed in rather than built from a kind: „a modell javasolta, admin
 *    hagyta jóvá" and „a modell olvasta le a fotót" are not the same claim.
 *
 * Deliberately not a PrimeNG tag: this sits inside rows, headings and image
 * corners, and it has to inherit the colour of whatever it is in. The frame is
 * ours (`mc-*` tokens), as everywhere outside the forms.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-ai-mark',
	host: {
		class: 'ai-mark',
		'[attr.title]': 'hint()',
		'[class.is-compact]': 'compact()',
	},
	imports: [...I18N_IMPORTS],
	template: `
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M12 2.5l1.7 4.6 4.6 1.7-4.6 1.7-1.7 4.6-1.7-4.6L5.7 8.8l4.6-1.7z"
			/>
			<path
				d="M18.5 15l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"
			/>
		</svg>
		<span>{{ label() ?? ('ui.aiMark.label' | transloco) }}</span>
		@if (hint()) {
			<!-- A hover szövege egérrel elérhető; olvasónak ez a párja. -->
			<span class="visually-hidden">{{ hint() }}</span>
		}
	`,
	styles: `
		:host {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
			padding: 0.15rem 0.5rem;
			border: 1px solid var(--mc-border-strong);
			border-radius: 999px;
			font-size: 0.7rem;
			font-weight: 600;
			letter-spacing: 0.08em;
			text-transform: uppercase;
			color: var(--mc-text);
			white-space: nowrap;
			/* Címsorban és táblázatsorban is a szöveg közepéhez igazodik:
			   ez a jelzés mindenhol egy nagyobb betű mellett ül. */
			vertical-align: middle;
		}

		:host([title]) {
			cursor: help;
		}

		:host(.is-compact) {
			padding: 0;
			border: 0;
			color: var(--mc-text-subtle);
		}

		svg {
			width: 13px;
			height: 13px;
			flex: none;
			color: var(--mc-accent);
		}
	`,
})
export class AiMarkComponent {
	/** The word on the mark; the translated `Modell` when nothing is given. */
	public readonly label = input<string | null>(null);
	/** What the model did here, and what checked it. Shown on hover. */
	public readonly hint = input<string | null>(null);
	/** Inside a table row or a caption: the word and the icon, no frame. */
	public readonly compact = input(false);
}
