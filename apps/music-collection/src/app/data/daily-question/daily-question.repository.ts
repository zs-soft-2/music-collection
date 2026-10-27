import { Observable, from, map, of, switchMap } from 'rxjs';

import {
	Injectable,
	Injector,
	inject,
	runInInjectionContext,
} from '@angular/core';
import {
	Firestore,
	collection,
	doc,
	docData,
	getDocs,
	limit,
	orderBy,
	query,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
	ANSWER_DAILY_QUESTION_FUNCTION,
	AnswerDailyQuestionInput,
	AnswerDailyQuestionResult,
	AuthenticatedUserService,
	ComposeDailyQuestionResult,
	DAILY_ANSWER_FEATURE_KEY,
	DAILY_QUESTION_FEATURE_KEY,
	DAILY_QUESTION_GAME_DOCUMENT,
	DailyAnswer,
	DailyQuestionEntity,
	DailyQuestionLeaderboard,
	DailyQuestionScore,
	DailyQuestionSettings,
	DailyQuestionSettingsView,
	GAME_FEATURE_KEY,
	RefreshLeaderboardResult,
} from '@music-collection/api';

import {
	COMPOSE_DAILY_QUESTION_NOW_FUNCTION,
	DAILY_QUESTION_LEADERBOARD_DOCUMENT,
	LEADERBOARD_FEATURE_KEY,
	READ_DAILY_QUESTION_SETTINGS_FUNCTION,
	REFRESH_DAILY_QUESTION_LEADERBOARD_FUNCTION,
	UPDATE_DAILY_QUESTION_SETTINGS_FUNCTION,
} from './daily-question.constants';

/** Parent of the collector's own data (`user/{uid}/…`). */
const USER_COLLECTION = 'user';
/** Where this browser remembers when the round started, per day. */
const CLOCK_STORAGE_PREFIX = 'mc.daily-question.started.';
/** …and where it remembers that the day's banner was sent away. */
const BANNER_STORAGE_PREFIX = 'mc.daily-question.dismissed.';
/**
 * What the past is ordered by. It carries the same `YYYY-MM-DD` as the
 * document id, and it is a field rather than the id on purpose: Firestore
 * does not scan keys backwards, so the newest-first list has to be ordered by
 * something it indexes — which, for a single field, it does by itself.
 */
const DAY_FIELD = 'day';

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

	/**
	 * When this browser first showed the day's question, epoch milliseconds.
	 *
	 * Kept in the browser rather than on the server on purpose: the clock is
	 * the client's, and a round opened on the server would cost a write a day
	 * per player. It survives a reload, though — otherwise F5 would hand out
	 * a fresh minute, which is not cheating so much as an accident waiting to
	 * happen.
	 *
	 * Storage can be unavailable (private window, blocked site data); the
	 * game works without it, the clock simply starts over.
	 */
	public startedAt(day: string): number | null {
		try {
			const stored = localStorage.getItem(
				`${CLOCK_STORAGE_PREFIX}${day}`
			);
			const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN;

			return Number.isFinite(parsed) ? parsed : null;
		} catch {
			return null;
		}
	}

	/** Remembers the start of the round, and forgets the days before it. */
	public rememberStart(day: string, startedAt: number): void {
		this.remember(CLOCK_STORAGE_PREFIX, day, String(startedAt));
	}

	/**
	 * The banner for the day was sent away in this browser.
	 *
	 * Kept here rather than on the collector's document for the same reason
	 * as the clock: closing a banner is not worth a write, and a browser is
	 * the right scope for it — the reminder is about this screen, not about
	 * the collector. A new day brings a new banner, because the key carries
	 * the day.
	 */
	public isDismissed(day: string): boolean {
		try {
			return !!localStorage.getItem(`${BANNER_STORAGE_PREFIX}${day}`);
		} catch {
			return false;
		}
	}

	/** Sends the day's banner away, and forgets the days before it. */
	public dismiss(day: string): void {
		this.remember(BANNER_STORAGE_PREFIX, day, '1');
	}

	/** One value per day, and only the day at hand is kept. */
	private remember(prefix: string, day: string, value: string): void {
		try {
			for (const key of Object.keys(localStorage)) {
				if (key.startsWith(prefix) && key !== `${prefix}${day}`) {
					localStorage.removeItem(key);
				}
			}

			localStorage.setItem(`${prefix}${day}`, value);
		} catch {
			// A browser that cannot remember it starts the day over.
		}
	}

	/** The signed-in collector's id; null while signed out. */
	public uid$(): Observable<string | null> {
		return this.authenticatedUser.user$.pipe(
			map((user) => user?.uid ?? null)
		);
	}

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

	/**
	 * The questions of the days before, newest first.
	 *
	 * Read once rather than followed: a day that is over does not change, and
	 * a listener on a list of them would cost the same reads for nothing.
	 */
	public history$(days: number): Observable<DailyQuestionEntity[]> {
		return this.list$<DailyQuestionEntity>(
			[DAILY_QUESTION_FEATURE_KEY],
			days
		);
	}

	/** The collector's own guesses, newest first; empty while signed out. */
	public answerHistory$(days: number): Observable<DailyAnswer[]> {
		return this.authenticatedUser.user$.pipe(
			switchMap((user) =>
				user
					? this.list$<DailyAnswer>(
							[
								USER_COLLECTION,
								user.uid,
								DAILY_ANSWER_FEATURE_KEY,
							],
							days
						)
					: of([])
			)
		);
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

	/**
	 * The field, as the daily run left it: one document for everybody.
	 *
	 * Null before the first run has written one. The collector's own place is
	 * not read from here but from their pot — the document only carries the
	 * top of the list.
	 */
	public leaderboard$(): Observable<DailyQuestionLeaderboard | null> {
		return this.document$<DailyQuestionLeaderboard>([
			LEADERBOARD_FEATURE_KEY,
			DAILY_QUESTION_LEADERBOARD_DOCUMENT,
		]);
	}

	/** Grades the guess on the server, which is the only place that can. */
	public grade$(
		input: AnswerDailyQuestionInput
	): Observable<AnswerDailyQuestionResult> {
		return this.call$<AnswerDailyQuestionInput, AnswerDailyQuestionResult>(
			ANSWER_DAILY_QUESTION_FUNCTION,
			input
		);
	}

	/**
	 * Admin: the game's settings, and the kinds of question there are to
	 * switch on and off. Both come from the server — the engine is what knows
	 * its own templates.
	 */
	public readSettings$(): Observable<DailyQuestionSettingsView> {
		return this.call$<Record<string, never>, DailyQuestionSettingsView>(
			READ_DAILY_QUESTION_SETTINGS_FUNCTION,
			{}
		);
	}

	/** Admin: saves the settings, and hands back what the server kept. */
	public updateSettings$(
		settings: DailyQuestionSettings
	): Observable<DailyQuestionSettingsView> {
		return this.call$<
			{ settings: DailyQuestionSettings },
			DailyQuestionSettingsView
		>(UPDATE_DAILY_QUESTION_SETTINGS_FUNCTION, { settings });
	}

	/** Admin: composes a day's question by hand. */
	public compose$(input: {
		day?: string;
		force?: boolean;
	}): Observable<ComposeDailyQuestionResult> {
		return this.call$<typeof input, ComposeDailyQuestionResult>(
			COMPOSE_DAILY_QUESTION_NOW_FUNCTION,
			input
		);
	}

	/** Admin: rebuilds the leaderboard without waiting for the nightly run. */
	public refreshLeaderboard$(): Observable<RefreshLeaderboardResult> {
		return this.call$<Record<string, never>, RefreshLeaderboardResult>(
			REFRESH_DAILY_QUESTION_LEADERBOARD_FUNCTION,
			{}
		);
	}

	private call$<TInput, TResult>(
		name: string,
		input: TInput
	): Observable<TResult> {
		const callable = httpsCallable<TInput, TResult>(this.functions, name);

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
	 * The newest documents of a collection of days: the last `days` of them,
	 * latest first. One read apiece, and none at all for the days nobody asks
	 * about.
	 */
	private list$<T>(path: string[], days: number): Observable<T[]> {
		const [first, ...rest] = path;

		return runInInjectionContext(this.injector, () =>
			from(
				getDocs(
					query(
						collection(this.firestore, first, ...rest),
						orderBy(DAY_FIELD, 'desc'),
						limit(days)
					)
				)
			).pipe(
				map((snapshot) =>
					snapshot.docs.map((document) => document.data() as T)
				)
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
