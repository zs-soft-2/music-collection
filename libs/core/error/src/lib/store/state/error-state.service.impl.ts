import { nanoid } from 'nanoid';
import { Observable } from 'rxjs';

import { Injectable, inject } from '@angular/core';
import { AppError, ErrorStateService } from '@music-collection/api';
import { Store, select } from '@ngrx/store';

import * as errorActions from './error.actions';
import { ErrorPartialState } from './error.reducer';
import * as errorSelectors from './error.selectors';

@Injectable()
export class ErrorStateServiceImpl extends ErrorStateService {
	private store = inject<Store<ErrorPartialState>>(Store);

	public dispatchReport(
		error: Pick<AppError, 'message' | 'source'> & Partial<AppError>
	): void {
		this.store.dispatch(
			errorActions.report({
				error: {
					uid: nanoid(),
					reportedAt: Date.now(),
					...error,
				},
			})
		);
	}

	public dispatchDismiss(uid: string): void {
		this.store.dispatch(errorActions.dismiss({ uid }));
	}

	public dispatchDismissAll(): void {
		this.store.dispatch(errorActions.dismissAll());
	}

	public selectErrors$(): Observable<AppError[]> {
		return this.store.pipe(select(errorSelectors.selectErrors));
	}
}
