import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StarRatingComponent } from './star-rating.component';

@Component({
	imports: [StarRatingComponent],
	template: `
		<mc-star-rating
			[stars]="stars()"
			[readonly]="readonly()"
			(rated)="given.set($event)"
			(cleared)="takenBack.set(true)"
		/>
	`,
})
class HostComponent {
	public readonly stars = signal<number | null>(null);
	public readonly readonly = signal(false);
	public readonly given = signal<number | null>(null);
	public readonly takenBack = signal(false);
}

describe('StarRatingComponent', () => {
	let fixture: ComponentFixture<HostComponent>;

	const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
	const stars = (): HTMLButtonElement[] =>
		Array.from(host().querySelectorAll<HTMLButtonElement>('button.star'));
	const takeBack = (): HTMLButtonElement | null =>
		host().querySelector<HTMLButtonElement>('.take-back');

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [provideI18nTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(HostComponent);
		fixture.detectChanges();
	});

	it('offers the five stars a collector can give', () => {
		expect(stars()).toHaveLength(5);
	});

	it('says which star was pressed', () => {
		stars()[3].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.given()).toBe(4);
	});

	it('lights the row up to the verdict given', () => {
		fixture.componentInstance.stars.set(3);
		fixture.detectChanges();

		expect(
			stars().map((star) => star.classList.contains('is-lit'))
		).toEqual([true, true, true, false, false]);
	});

	it('marks the star given, for a screen reader', () => {
		fixture.componentInstance.stars.set(2);
		fixture.detectChanges();

		expect(
			stars().map((star) => star.getAttribute('aria-checked'))
		).toEqual(['false', 'true', 'false', 'false', 'false']);
	});

	it('offers to take a verdict back only once one was given', () => {
		expect(takeBack()).toBeNull();

		fixture.componentInstance.stars.set(5);
		fixture.detectChanges();

		takeBack()?.click();
		fixture.detectChanges();

		expect(fixture.componentInstance.takenBack()).toBe(true);
	});

	it('cannot be pressed where it only shows somebody verdict', () => {
		fixture.componentInstance.readonly.set(true);
		fixture.componentInstance.stars.set(4);
		fixture.detectChanges();

		expect(stars()).toHaveLength(0);
		expect(takeBack()).toBeNull();
		expect(host().querySelectorAll('.star.is-lit')).toHaveLength(4);
	});
});
