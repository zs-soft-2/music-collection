import { TestBed } from '@angular/core/testing';

import { LanguageEnum } from './language';
import { LanguageService } from './language.service';
import { provideI18nTesting } from './testing';

/**
 * Four things can decide the language, and which of them wins is the whole
 * point of this service. A default that arrives a second after the page —
 * from the account, or from what an administrator set for everybody — must
 * not overrule a reader who has already said what they want.
 */
describe('LanguageService', () => {
	const build = (): LanguageService => {
		TestBed.configureTestingModule({ providers: [provideI18nTesting()] });

		return TestBed.inject(LanguageService);
	};

	beforeEach(() => {
		localStorage.clear();
		TestBed.resetTestingModule();
	});

	it('opens in a language the browser asks for, unchosen', () => {
		const language = build();

		// jsdom asks for English; what matters is that nobody chose it.
		expect(language.chosen()).toBe(false);
	});

	it('takes the app default while nobody has chosen', () => {
		const language = build();

		language.applyDefault(LanguageEnum.de);

		expect(language.language()).toBe(LanguageEnum.de);
		expect(language.chosen()).toBe(false);
	});

	it('leaves a reader who chose alone', () => {
		const language = build();

		language.choose(LanguageEnum.hu);
		language.applyDefault(LanguageEnum.de);

		expect(language.language()).toBe(LanguageEnum.hu);
	});

	it('remembers a choice for the next visit', () => {
		build().choose(LanguageEnum.de);
		TestBed.resetTestingModule();

		const next = build();

		expect(next.language()).toBe(LanguageEnum.de);
		expect(next.chosen()).toBe(true);
	});

	/**
	 * The default lives in Firestore and arrives after the page does. Without
	 * this, a reader who never picked would watch the language change on
	 * every cold load.
	 */
	it('opens in the app default it heard last time, without a flicker', () => {
		build().applyDefault(LanguageEnum.hu);
		TestBed.resetTestingModule();

		const next = build();

		expect(next.language()).toBe(LanguageEnum.hu);
		// Still not a choice: a new default from the server may replace it.
		expect(next.chosen()).toBe(false);
	});

	it('lets a new app default replace the remembered one', () => {
		build().applyDefault(LanguageEnum.hu);
		TestBed.resetTestingModule();

		const next = build();

		next.applyDefault(LanguageEnum.de);

		expect(next.language()).toBe(LanguageEnum.de);
	});

	/** A choice stored before the `chosen` field existed was a real one. */
	it('reads a choice written by an older build as a choice', () => {
		localStorage.setItem('mc-language', JSON.stringify({ language: 'hu' }));

		const language = build();

		expect(language.language()).toBe(LanguageEnum.hu);
		expect(language.chosen()).toBe(true);
	});

	it('shrugs off something unreadable in the key', () => {
		localStorage.setItem('mc-language', 'not json');

		expect(build().chosen()).toBe(false);
	});

	it('gives the locale, not the bare code, for the formatting', () => {
		const language = build();

		language.choose(LanguageEnum.hu);

		expect(language.locale()).toBe('hu-HU');
	});
});
