import { TranslocoService } from '@jsverse/transloco';

import { DOCUMENT } from '@angular/common';
import {
	Injectable,
	Signal,
	computed,
	effect,
	inject,
	signal,
} from '@angular/core';

import {
	DEFAULT_LANGUAGE,
	LANGUAGE_LOCALES,
	LanguageEnum,
	isLanguage,
	languageOf,
} from './language';

/**
 * Where the choice is kept in this browser.
 *
 * The very same key, and the very same shape, that the user-settings layer
 * writes while signed out. Two keys for one choice is what it looked like it
 * wanted — a bare code here, a settings document there — but then the two
 * copies can disagree, and the one that loses is whichever is read second.
 * One key cannot drift from itself.
 */
const STORAGE_KEY = 'mc-language';

/**
 * The app's default, as this browser last heard it.
 *
 * Kept because the default lives in Firestore and arrives a moment after the
 * page does. Without the copy, a reader who has never picked would see their
 * browser's language on every cold load and then watch it change; with it,
 * only the very first visit does that.
 */
const DEFAULT_KEY = 'mc-default-language';

/** What was stored, once it has been read back. */
interface StoredLanguage {
	language: LanguageEnum;
	/** Whether a person picked it, as against it being handed down. */
	chosen: boolean;
}

/**
 * Which language the app speaks, and the one thing every other part of the
 * i18n asks. It owns the choice rather than the account does, for the same
 * reason the theme does: the first screen is drawn long before Firestore
 * answers, and a page that renders in English and then flips to Hungarian
 * reads worse than one that was Hungarian to begin with.
 *
 * Four things can decide the language, and they are not equal:
 *
 *   1. what this reader picked — the switch in the bar, or their profile
 *   2. what an administrator set as the app's default
 *   3. what the browser asks for
 *   4. English
 *
 * So the service keeps not only the language but whether it was *chosen*.
 * Without that, a default arriving from the server a second after the page
 * loads could not tell a reader who wants German from one who simply has not
 * said, and would overrule the first of them.
 *
 * The choice is carried to and from the account by a separate service, so
 * that this one stays free of the data layer and can be read from anywhere,
 * including before sign-in.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
	private readonly document = inject(DOCUMENT);
	private readonly transloco = inject(TranslocoService);

	private readonly stored = this.readStored();

	private readonly state = signal<StoredLanguage>(this.stored);

	/** The language in force. Read-only: it changes through `choose`. */
	public readonly language: Signal<LanguageEnum> = computed(
		() => this.state().language
	);

	/**
	 * Whether the language in force is this reader's own pick.
	 *
	 * False means nobody has said, so a default may still take its place —
	 * from the account, or from what the administrator set for everybody.
	 */
	public readonly chosen: Signal<boolean> = computed(
		() => this.state().chosen
	);

	/**
	 * The BCP 47 tag the date, number and currency formatting goes by. The
	 * pipes take this, never the bare language code: `hu` alone would leave
	 * Intl to guess a region, and the guess is not always Hungary.
	 */
	public readonly locale = computed(() => LANGUAGE_LOCALES[this.language()]);

	public constructor() {
		// Once, synchronously, before anything is drawn. An effect would not
		// do on its own: effects first run during change detection, by which
		// time the app initializer has already asked Transloco which language
		// to fetch — and would have been told the wrong one.
		this.apply(this.language());

		effect(() => this.apply(this.language()));
	}

	/**
	 * The reader said so: in the bar, or in their profile. Nothing hands down
	 * a language over this again.
	 */
	public choose(language: LanguageEnum): void {
		this.set({ language, chosen: true });
	}

	/**
	 * A language handed down — the app's default, or an account that has one.
	 * It takes effect only while this reader has not chosen for themselves,
	 * which is what keeps a slow answer from the server off the back of
	 * somebody who already picked.
	 */
	public applyDefault(language: LanguageEnum): void {
		try {
			localStorage.setItem(DEFAULT_KEY, language);
		} catch {
			// Storage unavailable: the next load asks the server again.
		}

		if (this.chosen()) {
			return;
		}

		this.set({ language, chosen: false });
	}

	/**
	 * Written through at once rather than from an effect. An effect first
	 * runs at the next change detection, and a reader who picks a language
	 * and closes the tab in the same breath would have picked nothing.
	 */
	private set(next: StoredLanguage): void {
		this.state.set(next);
		this.write(next.language, next.chosen);
	}

	private apply(language: LanguageEnum): void {
		// Transloco holds the dictionary; this is what makes the strings
		// change. It fetches the file on first use of a language and keeps it
		// afterwards, so switching back is instant.
		if (this.transloco.getActiveLang() !== language) {
			this.transloco.setActiveLang(language);
		}

		// Screen readers pick their voice from this, and the browser its
		// hyphenation. Hungarian read aloud in an English voice is not a
		// cosmetic problem.
		this.document.documentElement.lang = language;
	}

	private write(language: LanguageEnum, chosen: boolean): void {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ language, chosen })
			);
		} catch {
			// Storage unavailable (e.g. private window): lasts the session.
		}
	}

	/**
	 * What this browser was last set to, or what it asks for.
	 *
	 * Reading the stored value synchronously is the point: the first paint
	 * has to be in the right language, and anything asynchronous — the
	 * account, the app's default, an HTTP-loaded dictionary — arrives too
	 * late for that.
	 */
	private readStored(): StoredLanguage {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			const stored = raw ? JSON.parse(raw) : null;

			if (isLanguage(stored?.language)) {
				return {
					language: stored.language,
					// A document written before this field existed held a
					// language the reader had picked; treat it as one.
					chosen: stored.chosen !== false,
				};
			}
		} catch {
			// Storage unavailable, or something unreadable in the key: fall
			// through to what the browser asks for.
		}

		return {
			language: this.cachedDefault() ?? this.preferred(),
			chosen: false,
		};
	}

	/** What the app's default was, last time this browser heard it. */
	private cachedDefault(): LanguageEnum | null {
		try {
			const stored = localStorage.getItem(DEFAULT_KEY);

			return isLanguage(stored) ? stored : null;
		} catch {
			return null;
		}
	}

	/**
	 * The first of the browser's languages we speak. `navigator.languages` is
	 * in the user's own order of preference, so a Hungarian who also reads
	 * German gets Hungarian rather than whichever we happen to check first.
	 */
	private preferred(): LanguageEnum {
		const navigator = this.document.defaultView?.navigator;

		for (const tag of navigator?.languages ?? []) {
			const language = languageOf(tag);

			if (language) {
				return language;
			}
		}

		return languageOf(navigator?.language) ?? DEFAULT_LANGUAGE;
	}
}
