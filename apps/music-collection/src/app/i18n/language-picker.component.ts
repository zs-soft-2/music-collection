import { TranslocoDirective } from '@jsverse/transloco';

import { UpperCasePipe } from '@angular/common';
import {
	ChangeDetectionStrategy,
	Component,
	inject,
	signal,
} from '@angular/core';
import {
	LANGUAGE_ENDONYMS,
	LanguageEnum,
	LanguageList,
	LanguageService,
} from '@music-collection/core/i18n';

/**
 * The language switch in the top bar.
 *
 * The languages name themselves — Magyar, English, Deutsch — and are never
 * translated: somebody who has landed in a language they cannot read is
 * looking for the word they *do* know, and "Ungarisch" is no help to them.
 * The two-letter code on the button is there for the same reason, so the
 * control is recognisable before anything around it has been read.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-language-picker',
	imports: [TranslocoDirective, UpperCasePipe],
	template: `
		<div class="picker" *transloco="let t">
			<button
				type="button"
				class="icon-btn code"
				[attr.aria-label]="t('nav.language')"
				aria-haspopup="menu"
				[attr.aria-expanded]="open()"
				(click)="toggle()"
			>
				{{ language.language() | uppercase }}
			</button>

			@if (open()) {
				<button
					type="button"
					class="scrim"
					[attr.aria-label]="t('common.close')"
					tabindex="-1"
					(click)="close()"
				></button>
				<div class="menu" role="menu">
					@for (option of languages; track option) {
						<button
							type="button"
							class="menu-item"
							role="menuitemradio"
							[attr.aria-checked]="option === language.language()"
							[class.is-active]="option === language.language()"
							(click)="pick(option)"
						>
							<span class="tag">{{ option | uppercase }}</span>
							{{ endonyms[option] }}
						</button>
					}
				</div>
			}
		</div>
	`,
	styleUrl: './language-picker.component.scss',
	host: {
		'(document:keydown.escape)': 'close()',
	},
})
export class LanguagePickerComponent {
	protected readonly language = inject(LanguageService);
	protected readonly languages = LanguageList;
	protected readonly endonyms = LANGUAGE_ENDONYMS;
	protected readonly open = signal(false);

	protected toggle(): void {
		this.open.update((open) => !open);
	}

	protected close(): void {
		this.open.set(false);
	}

	protected pick(language: LanguageEnum): void {
		// `choose`, not a bare set: this is the reader saying so, and it has to
		// outrank the default an administrator set for everybody.
		this.language.choose(language);
		this.close();
	}
}
