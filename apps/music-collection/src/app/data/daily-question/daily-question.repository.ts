import { Observable, from, map, of, switchMap } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	ANSWER_DAILY_QUESTION_FUNCTION,
	AnswerDailyQuestionInput,
	AnswerDailyQuestionResult,
	AuthenticatedUserService,
	DAILY_ANSWER_FEATURE_KEY,
	DAILY_QUESTION_FEATURE_KEY,
	DAILY_QUESTION_GAME_DOCUMENT,
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionScore,
	GAME_FEATURE_KEY,
} from '@music-collection/api';

/** Parent of the collector's own data (`user/{uid}/…`). */
const USER_COLLECTION = 'user';

/**
 * Data access for the daily question: the question of the day, the
 * collector's own guess, the game's pot, and the grading.
 *
 * These documents are read one at a time, straight from Firestore, and not
 * through `FirestoreSyncService` like the catalog. The composing function
 * deliberately leaves `sync/catalog` alone — a question a day is not a
 * catalog collection to be cached whole, and the day's id is all it takes to
 * name the one document worth reading. The guess and the pot are private and
 * have no bundle to fill from either.
 *
 * Nothing here is written from the client. A guess goes to the
 * `answerDailyQuestion` callable, because the answer it is checked against
 * lives where the rules let nobody read it.
 */
@Injectable({ providedIn: 'root' })
export class DailyQuestionRepository {
	private readonly firestore = inject(Firestore);
	private readonly functions = inject(Functions);
	private readonly authenticatedUser = inject(AuthenticatedUserService);
	private readonly injector = inject(Injector);

	/** The question of the day; null on a day that has none. */
	public question$(day: string): Observable<DailyQuestionEntity | null> {
		return this.document$<DailyQuestionEntity>([
			DAILY_QUESTION_FEATURE_KEY,
			day,
		]);
	}

	/** The collector's own guess for the day; null while they have not made one. */
	public answer$(day: string): Observable<DailyAnswer | null> {
		return this.mine$((uid) => [
			USER_COLLECTION,
			uid,
			DAILY_ANSWER_FEATURE_KEY,
			day,
		]);
	}

	/** The game's pot; null until the first guess created it. */
	public score$(): Observable<DailyQuestionScore | null> {
		return this.mine$((uid) => [
			USER_COLLECTION,
			uid,
			GAME_FEATURE_KEY,
			DAILY_QUESTION_GAME_DOCUMENT,
		]);
	}

	/** Grades the guess on the server, which is the only place that can. */
	public grade$(
		input: AnswerDailyQuestionInput
	): Observable<AnswerDailyQuestionResult> {
		const callable = httpsCallable<
			AnswerDailyQuestionInput,
			AnswerDailyQuestionResult
		>(this.functions, ANSWER_DAILY_QUESTION_FUNCTION);

		return from(callable(input)).pipe(map((result) => result.data));
	}

	/** A document of the signed-in collector; empty while signed out. */
	private mine$<T>(path: (uid: string) => string[]): Observable<T | null> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user ? this.document$<T>(path(user.uid)) : of(null)
			)
		);
	}

	/**
	 * AngularFire wants its APIs in an injection context, and these run from
	 * a stream long after the repository was built.
	 */
	private document$<T>(path: string[]): Observable<T | null> {
		const [first, ...rest] = path;

		return runInInjectionContext(this.injector, () =>
			docData(doc(this.firestore, first, ...rest)).pipe(
				map((data) => (data as T | undefined) ?? null)
			)
		);
	}
}
