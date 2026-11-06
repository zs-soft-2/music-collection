import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import {
	type FakeEditStore,
	fakeEditStore,
	provideFakeEditStore,
} from '../../music-collection-edit.store.testing';

import { CollectionBadgePinComponent } from './collection-badge-pin.component';

async function setUp(store: FakeEditStore) {
	await TestBed.configureTestingModule({
		imports: [CollectionBadgePinComponent],
		providers: [provideI18nTesting(), provideFakeEditStore(store)],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionBadgePinComponent);

	fixture.detectChanges();

	return fixture.nativeElement as HTMLElement;
}

function buttons(page: HTMLElement): HTMLButtonElement[] {
	return [...page.querySelectorAll<HTMLButtonElement>('button')];
}

function button(page: HTMLElement, text: string): HTMLButtonElement {
	return buttons(page).find((one) =>
		one.textContent?.includes(text)
	) as HTMLButtonElement;
}

describe('CollectionBadgePinComponent', () => {
	it('waits for the first save before anything can be drawn', async () => {
		const store = fakeEditStore();

		store.isNew.set(true);

		const page = await setUp(store);

		expect(page.textContent).toContain('Save the collection first');
		expect(button(page, 'Generate').disabled).toBe(true);
		expect(page.querySelector('.pin-upload')?.classList).toContain(
			'is-disabled'
		);
	});

	it('draws a pin, with the model that was chosen', async () => {
		const store = fakeEditStore();

		store.imageModels.set([{ id: 'imagen-4' }]);

		const page = await setUp(store);
		const model = page.querySelector(
			'.model-pick select'
		) as HTMLSelectElement;

		model.value = 'imagen-4';
		model.dispatchEvent(new Event('change'));
		button(page, 'Generate').click();

		expect(store.setBadgeModel).toHaveBeenCalledWith('imagen-4');
		expect(store.generateBadge).toHaveBeenCalled();
	});

	it('picks a pin out of the gallery, and marks the current one', async () => {
		const store = fakeEditStore();
		const old = {
			documentUid: 'old',
			filePath: 'https://img/old',
			name: 'Old',
		};
		const current = {
			documentUid: 'current',
			filePath: 'https://img/current',
			name: 'Current',
		};

		store.badgeGallery.set([old, current]);
		store.badgeImageUid.set('current');
		store.badgeImageUrl.set('https://img/current');

		const page = await setUp(store);
		const items = page.querySelectorAll('.gallery li');

		expect(items[1].classList).toContain('is-chosen');
		expect(page.querySelector<HTMLImageElement>('.chosen')?.src).toBe(
			'https://img/current'
		);

		button(page, 'Pick this one').click();
		button(page, 'Take the pin off').click();

		expect(store.pickBadge).toHaveBeenCalledWith(old);
		expect(store.clearBadgeImage).toHaveBeenCalled();
	});
});
