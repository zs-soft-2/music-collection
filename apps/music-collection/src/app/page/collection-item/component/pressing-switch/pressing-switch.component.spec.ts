import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CopyPressingOption } from '../../collection-item.mapper';
import { PressingSwitchComponent } from './pressing-switch.component';

function option(fields: Partial<CopyPressingOption> = {}): CopyPressingOption {
	return {
		id: 'r1',
		name: 'Painkiller',
		format: 'vinyl',
		formatDescription: 'LP, Album',
		labelName: 'Columbia',
		country: 'Germany',
		year: 1990,
		generic: false,
		current: false,
		taken: false,
		...fields,
	};
}

@Component({
	imports: [PressingSwitchComponent],
	template: `
		<mc-pressing-switch
			[options]="options()"
			[busy]="busy()"
			[picked]="picked()"
			(pick)="picked.set($event)"
			(confirmed)="moved.set($event)"
			(cancelled)="cancelled.set(true)"
		/>
	`,
})
class HostComponent {
	public readonly options = signal<CopyPressingOption[]>([]);
	public readonly busy = signal(false);
	public readonly picked = signal<string | null>(null);
	public readonly moved = signal<string | null>(null);
	public readonly cancelled = signal(false);
}

describe('PressingSwitchComponent', () => {
	let fixture: ComponentFixture<HostComponent>;

	const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
	const options = (): HTMLButtonElement[] =>
		Array.from(host().querySelectorAll<HTMLButtonElement>('button.option'));
	const move = (): HTMLButtonElement =>
		host().querySelector<HTMLButtonElement>(
			'.actions .button.primary'
		) as HTMLButtonElement;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [HostComponent],
			providers: [provideI18nTesting()],
		}).compileComponents();

		fixture = TestBed.createComponent(HostComponent);
		fixture.componentInstance.options.set([
			option({ id: 'r1', current: true }),
			option({ id: 'r2', labelName: 'Sony', year: 2016 }),
		]);
		fixture.detectChanges();
	});

	/** The question the list is opened for: which of these is mine. */
	it('marks the release the copy stands under, and leaves it unclickable', () => {
		const [mine] = options();

		expect(mine.classList).toContain('is-current');
		expect(mine.getAttribute('aria-current')).toBe('true');
		expect(mine.disabled).toBe(true);
	});

	it('reads the label, country and year of each release', () => {
		expect(options()[1].textContent).toContain('Sony');
		expect(options()[1].textContent).toContain('2016');
	});

	/**
	 * Picking and moving are two clicks: a pressing hit by accident would
	 * carry the copy — and its number — onto another release.
	 */
	it('points at a release without moving the copy onto it', () => {
		options()[1].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.picked()).toBe('r2');
		expect(fixture.componentInstance.moved()).toBeNull();
	});

	it('moves the copy once the pick is confirmed', () => {
		options()[1].click();
		fixture.detectChanges();
		move().click();

		expect(fixture.componentInstance.moved()).toBe('r2');
	});

	it('takes the pick back when the picked release is clicked again', () => {
		options()[1].click();
		fixture.detectChanges();
		options()[1].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.picked()).toBeNull();
	});

	it('has nothing to move onto until a release is picked', () => {
		expect(move().disabled).toBe(true);
	});

	/** Two copies under one pressing is a state nothing else allows. */
	it('offers no release another copy of the collector already stands under', () => {
		fixture.componentInstance.options.set([
			option({ id: 'r1', current: true }),
			option({ id: 'r2', taken: true }),
		]);
		fixture.detectChanges();

		expect(options()[1].disabled).toBe(true);

		options()[1].click();
		fixture.detectChanges();

		expect(fixture.componentInstance.picked()).toBeNull();
	});

	it('holds the list shut while the move is being written', () => {
		fixture.componentInstance.picked.set('r2');
		fixture.componentInstance.busy.set(true);
		fixture.detectChanges();

		expect(options()[1].disabled).toBe(true);
		expect(move().disabled).toBe(true);
	});

	it('says so where the album has only the one release', () => {
		fixture.componentInstance.options.set([
			option({ id: 'r1', current: true }),
		]);
		fixture.detectChanges();

		expect(options()).toHaveLength(1);
		expect(host().querySelector('.status')).not.toBeNull();
	});
});
