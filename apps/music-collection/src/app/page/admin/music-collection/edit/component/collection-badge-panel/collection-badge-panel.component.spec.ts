import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import {
	type FakeEditStore,
	fakeEditStore,
	provideFakeEditStore,
} from '../../music-collection-edit.store.testing';

import { CollectionBadgePanelComponent } from './collection-badge-panel.component';

async function setUp(store: FakeEditStore) {
	await TestBed.configureTestingModule({
		imports: [CollectionBadgePanelComponent],
		providers: [provideI18nTesting(), provideFakeEditStore(store)],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionBadgePanelComponent);

	fixture.detectChanges();

	return fixture.nativeElement as HTMLElement;
}

describe('CollectionBadgePanelComponent', () => {
	it('writes the badge fields into the form', async () => {
		const store = fakeEditStore();
		const page = await setUp(store);
		const name = page.querySelector('#badge-name') as HTMLInputElement;
		const icon = page.querySelector('#badge-icon') as HTMLInputElement;

		name.value = 'Doom Lord';
		name.dispatchEvent(new Event('input'));
		icon.value = 'pi pi-bolt';
		icon.dispatchEvent(new Event('input'));

		expect(store.setField).toHaveBeenCalledWith({ badgeName: 'Doom Lord' });
		expect(store.setField).toHaveBeenCalledWith({
			badgeIcon: 'pi pi-bolt',
		});
	});

	it('shows the uploaded artwork in the upload row', async () => {
		const page = await setUp(
			fakeEditStore({ badgeArtworkUrl: 'https://img/art.webp' })
		);

		expect(
			page.querySelector<HTMLImageElement>(
				'mc-collection-image-upload .image-preview'
			)?.src
		).toBe('https://img/art.webp');
	});

	it('opens the library for the artwork', async () => {
		const store = fakeEditStore();
		const page = await setUp(store);

		page.querySelector<HTMLButtonElement>(
			'mc-collection-image-upload button'
		)?.click();

		expect(store.openLibrary).toHaveBeenCalledWith('badgeArtworkUrl');
	});

	it('ends with the pin, as one wide field of the grid', async () => {
		const page = await setUp(fakeEditStore());
		const pin = page.querySelector('mc-collection-badge-pin');

		expect(pin?.classList).toContain('mc-field');
		expect(pin?.classList).toContain('is-wide');
		expect(pin?.parentElement?.classList).toContain('mc-form-grid');
	});
});
