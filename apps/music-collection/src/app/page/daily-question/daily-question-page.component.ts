import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18N_IMPORTS } from '@music-collection/core/i18n';

import { DailyQuestionPageStore } from './daily-question-page.store';
import { DIFFICULTY_KEY_PREFIX } from './daily-question.model';

/**
 * The question of the day: one question for everybody, one guess, and the
 * answer the moment the guess is in.
 *
 * The question is drawn out of the catalog by `composeDailyQuestionDaily`
 * once a day, so the page only reads it. The guess goes to a callable,
 * because the answer it is checked against lives in a document the rules let
 * nobody read — a page that could grade itself could also win by reading.
 *
 * The points are the game's own. They are kept apart from the collection
 * score on purpose: there, nothing pays until a collection is complete.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	providers: [DailyQuestionPageStore],
	selector: 'mc-daily-question-page',
	templateUrl: './daily-question-page.component.html',
	styleUrls: ['./daily-question-page.component.scss'],
	imports: [...I18N_IMPORTS, RouterLink],
})
export class DailyQuestionPageComponent {
	protected readonly store = inject(DailyQuestionPageStore);
	protected readonly difficultyPrefix = DIFFICULTY_KEY_PREFIX;
}
