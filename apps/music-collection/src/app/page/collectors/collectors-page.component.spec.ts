import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CollectorCardDocument } from '../../data/collector-profile';
import { CollectorProfileEffect } from '../../data/collector-profile';

import { CollectorsPageComponent } from './collectors-page.component';

const card = (
	uid: string,
	displayName: string,
	slugs: string[]
): CollectorCardDocument =>
	({
		uid,
		displayName,
		copies: 100,
		points: 500,
		badges: slugs.map((slug) => ({
			slug,
			name: slug,
			imageUrl: null,
			points: 100,
		})),
		updatedAt: 1,
	}) as CollectorCardDocument;

describe('CollectorsPageComponent', () => {
	let fixture: ComponentFixture<CollectorsPageComponent>;

	const render = (cards: CollectorCardDocument[]): HTMLElement => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({
			imports: [CollectorsPageComponent],
			providers: [
				provideI18nTesting(),
				provideRouter([]),
				{
					provide: CollectorProfileEffect,
					useValue: { cards$: () => of(cards) },
				},
			],
		});

		fixture = TestBed.createComponent(CollectorsPageComponent);
		fixture.detectChanges();

		return fixture.nativeElement as HTMLElement;
	};

	it('draws a collector with what they finished', () => {
		const host = render([card('u1', 'Zsolt', ['doom'])]);

		expect(host.querySelector('.who b')?.textContent).toContain('Zsolt');
		expect(host.querySelector('.badges .label')?.textContent).toContain(
			'doom'
		);
	});

	/** Every card is a way into that collector's own page. */
	it('leads to the collector the card is about', () => {
		const host = render([card('u1', 'Zsolt', ['doom'])]);

		expect(host.querySelector('.who')?.getAttribute('href')).toBe(
			'/collector/u1'
		);
	});

	it('narrows the wall to whoever finished one collection', () => {
		const host = render([
			card('u1', 'Zsolt', ['doom']),
			card('u2', 'Anna', ['bay-area']),
		]);
		const chips = host.querySelectorAll<HTMLButtonElement>('.chips button');

		// The first chip is "all"; the next is a collection somebody finished.
		chips[1].click();
		fixture.detectChanges();

		expect(host.querySelectorAll('.wall > li')).toHaveLength(1);
	});

	it('says so where a search finds nobody', () => {
		const host = render([card('u1', 'Zsolt', ['doom'])]);
		const search =
			host.querySelector<HTMLInputElement>('input[type=search]');

		if (search) {
			search.value = 'nobody';
			search.dispatchEvent(new Event('input'));
		}

		fixture.detectChanges();

		expect(host.querySelector('.wall')).toBeNull();
		expect(host.querySelector('.note')).not.toBeNull();
	});

	it('draws an empty wall where nobody shares a page', () => {
		const host = render([]);

		expect(host.querySelector('.wall')).toBeNull();
		expect(host.querySelector('.toolbar')).toBeNull();
	});
});
