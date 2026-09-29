import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { focusOnClose } from './focus-on-close';

/**
 * A page with a button per record and a dialog open over one of them, as the
 * shelf and the copy page both are: the button is gone while the dialog is
 * open, and the record it belonged to may be gone once it closes.
 */
@Component({
	changeDetection: ChangeDetectionStrategy.OnPush,
	selector: 'mc-focus-host',
	template: `
		@for (id of copies(); track id) {
			<button type="button" [attr.data-remove-copy]="id">{{ id }}</button>
		}
		<h2 tabindex="-1" data-copy-heading>This copy</h2>
	`,
})
class HostComponent {
	public readonly openFor = signal<string | null>(null);
	public readonly copies = signal(['c1', 'c2']);

	public constructor() {
		focusOnClose(this.openFor, (copyId) => [
			`[data-remove-copy="${copyId}"]`,
			'[data-copy-heading]',
		]);
	}
}

/** Renders, and waits for what `afterNextRender` was given to have run. */
async function settle(fixture: ComponentFixture<HostComponent>): Promise<void> {
	fixture.detectChanges();
	await fixture.whenStable();
}

describe('focusOnClose', () => {
	let fixture: ComponentFixture<HostComponent>;
	let host: HostComponent;

	beforeEach(async () => {
		TestBed.resetTestingModule();
		TestBed.configureTestingModule({ imports: [HostComponent] });
		fixture = TestBed.createComponent(HostComponent);
		host = fixture.componentInstance;
		await settle(fixture);
	});

	it('hands the focus back to the button the dialog was opened from', async () => {
		host.openFor.set('c2');
		await settle(fixture);

		host.openFor.set(null);
		await settle(fixture);

		expect(document.activeElement?.getAttribute('data-remove-copy')).toBe(
			'c2'
		);
	});

	/** The copy was let go of: its button went with it. */
	it('falls back to the next target when the button is gone', async () => {
		host.openFor.set('c1');
		await settle(fixture);

		host.copies.set(['c2']);
		host.openFor.set(null);
		await settle(fixture);

		expect(document.activeElement?.hasAttribute('data-copy-heading')).toBe(
			true
		);
	});

	it('takes no focus while nothing has closed', async () => {
		const before = document.activeElement;

		host.openFor.set('c1');
		await settle(fixture);

		expect(document.activeElement).toBe(before);
	});
});
