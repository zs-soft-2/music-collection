import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';
import localeEnGb from '@angular/common/locales/en-GB';
import localeHu from '@angular/common/locales/hu';
import { Component, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LanguageEnum } from '../language';
import { LanguageService } from '../language.service';
import { provideI18nTesting } from '../testing';
import { McCurrencyPipe } from './currency.pipe';
import { McDatePipe } from './date.pipe';
import { McNumberPipe, McPercentPipe } from './number.pipe';

@Component({
	selector: 'mc-pipe-host',
	imports: [McDatePipe, McNumberPipe, McPercentPipe, McCurrencyPipe],
	template: `
		<span class="date">{{ date | mcDate: 'longDate' }}</span>
		<span class="number">{{ 1234567.5 | mcNumber }}</span>
		<span class="percent">{{ 0.425 | mcPercent: '1.0-1' }}</span>
		<span class="huf">{{ 8000 | mcCurrency: 'HUF' }}</span>
		<span class="eur">{{ 24.9 | mcCurrency: 'EUR' }}</span>
	`,
})
class PipeHostComponent {
	public readonly language = inject(LanguageService);
	// The third of April, so that a day-first and a month-first reading of
	// the same date could not be mistaken for one another.
	public readonly date = new Date(2026, 3, 3);
}

describe('locale-aware pipes', () => {
	let fixture: ComponentFixture<PipeHostComponent>;
	let host: PipeHostComponent;

	const text = (selector: string): string =>
		(
			fixture.nativeElement.querySelector(selector) as HTMLElement
		).textContent
			// Intl separates groups with a non-breaking or narrow space;
			// which one is not the point of these tests.
			?.replace(/[\u00a0\u202f]/g, ' ')
			.trim() ?? '';

	const switchTo = (language: LanguageEnum): void => {
		host.language.choose(language);
		fixture.detectChanges();
	};

	beforeAll(() => {
		registerLocaleData(localeHu);
		registerLocaleData(localeEnGb);
		registerLocaleData(localeDe);
	});

	beforeEach(() => {
		localStorage.clear();
		TestBed.configureTestingModule({
			imports: [PipeHostComponent],
			providers: [provideI18nTesting()],
		});

		fixture = TestBed.createComponent(PipeHostComponent);
		host = fixture.componentInstance;
		switchTo(LanguageEnum.en);
	});

	/**
	 * The whole reason these pipes exist. Angular's own `date` and `number`
	 * read `LOCALE_ID`, which is settled at bootstrap: with them, none of
	 * these would change without reloading the page.
	 */
	it('redraws every format when the language changes', () => {
		const english = [text('.date'), text('.number'), text('.huf')];

		switchTo(LanguageEnum.hu);

		expect([text('.date'), text('.number'), text('.huf')]).not.toEqual(
			english
		);
	});

	describe('dates', () => {
		it('writes the month in the language in force', () => {
			expect(text('.date')).toContain('April');

			switchTo(LanguageEnum.hu);
			expect(text('.date')).toContain('április');

			switchTo(LanguageEnum.de);
			expect(text('.date')).toContain('April');
		});

		it('puts a Hungarian date in the order Hungarian writes it', () => {
			switchTo(LanguageEnum.hu);
			expect(text('.date')).toBe('2026. április 3.');
		});

		it('says nothing about a date that is not there', () => {
			TestBed.runInInjectionContext(() => {
				expect(new McDatePipe().transform(null)).toBeNull();
			});
		});
	});

	describe('numbers', () => {
		it('groups and separates the way each language does', () => {
			expect(text('.number')).toBe('1,234,567.5');

			switchTo(LanguageEnum.hu);
			expect(text('.number')).toBe('1 234 567,5');

			// The one that matters: 1.234.567,5 read as English would be a
			// number a million times smaller.
			switchTo(LanguageEnum.de);
			expect(text('.number')).toBe('1.234.567,5');
		});

		it('writes a percentage', () => {
			expect(text('.percent')).toBe('42.5%');

			switchTo(LanguageEnum.de);
			expect(text('.percent')).toBe('42,5 %');
		});
	});

	describe('prices', () => {
		/**
		 * A record bought for 8 000 Ft stays 8 000 Ft in every language. Only
		 * the writing of it changes; nothing is ever converted.
		 */
		it('keeps the currency the copy was bought in', () => {
			for (const language of [
				LanguageEnum.en,
				LanguageEnum.hu,
				LanguageEnum.de,
			]) {
				switchTo(language);
				expect(text('.huf')).toContain('8');
				expect(text('.eur')).toMatch(/24[.,]90/);
			}
		});

		it('writes forints without a minor unit', () => {
			switchTo(LanguageEnum.hu);
			expect(text('.huf')).toBe('8 000 Ft');
		});

		it('still writes cents for a currency that has them', () => {
			switchTo(LanguageEnum.de);
			expect(text('.eur')).toBe('24,90 €');
		});

		// Nothing recorded against the copy: the collection is kept in
		// forints, and an amount with no currency at all would say less than
		// a wrong guess would cost.
		it('falls back to forints when the copy does not say', () => {
			TestBed.runInInjectionContext(() => {
				const unstated = new McCurrencyPipe().transform(8000, null);
				const stated = new McCurrencyPipe().transform(8000, 'HUF');

				expect(unstated).toBe(stated);
			});
		});
	});
});
