import { filter, map, mergeMap } from 'rxjs/operators';
import { timer } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Action } from '@ngrx/store';

import * as errorActions from './error.actions';

/** Ennyi idő után tűnik el magától egy üzenet. */
const DISMISS_AFTER = 10_000;

/** A saját akcióink nem indíthatnak új jelentést. */
const OWN_PREFIX = '[Error]';

/** Minden akció, aminek a típusa hibát jelez — így egy sem vész el. */
const isFailure = (action: Action): boolean =>
	!action.type.startsWith(OWN_PREFIX) && /error|fail/i.test(action.type);

@Injectable()
export class ErrorEffects {
	private actions$ = inject(Actions);

	/** A hibát jelző akciókat jelentésre fordítja. */
	reportFailures$ = createEffect(() =>
		this.actions$.pipe(
			filter(isFailure),
			map((action) =>
				errorActions.report({
					error: {
						uid: `${action.type}-${Date.now()}`,
						message: messageOf(action),
						source: action.type,
						detail: detailOf(action),
						reportedAt: Date.now(),
					},
				})
			)
		)
	);

	/** Semmi nem marad némán: a jelentett hiba a konzolba is kikerül. */
	logReports$ = createEffect(
		() =>
			this.actions$.pipe(
				ofType(errorActions.report),
				map(({ error }) => {
					console.error(
						`[${error.source}] ${error.message}`,
						error.detail ?? ''
					);
				})
			),
		{ dispatch: false }
	);

	dismissReports$ = createEffect(() =>
		this.actions$.pipe(
			ofType(errorActions.report),
			mergeMap(({ error }) =>
				timer(DISMISS_AFTER).pipe(
					map(() => errorActions.dismiss({ uid: error.uid }))
				)
			)
		)
	);
}

/** Az akció `error` mezőjéből olvasható üzenet, bármilyen alakban jött. */
function messageOf(action: Action): string {
	const error = (action as Action & { error?: unknown }).error;

	if (typeof error === 'string' && error) return error;
	if (error instanceof Error) return error.message;
	if (error && typeof error === 'object') {
		const { message, code } = error as { message?: string; code?: string };
		if (message) return message;
		if (code) return code;
	}

	return action.type;
}

function detailOf(action: Action): string | undefined {
	const error = (action as Action & { error?: unknown }).error;

	if (error instanceof Error) return error.stack;
	if (error && typeof error === 'object') return JSON.stringify(error);

	return undefined;
}
