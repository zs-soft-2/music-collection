import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import {
	type FakeEditStore,
	fakeEditStore,
	provideFakeEditStore,
} from '../../music-collection-edit.store.testing';

import { CollectionBasicsPanelComponent } from './collection-basics-panel.component';

async function setUp(store: FakeEditStore) {
	await TestBed.configureTestingModule({
		imports: [CollectionBasicsPanelComponent],
		providers: [provideI18nTesting(), provideFakeEditStore(store)],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionBasicsPanelComponent);

	fixture.detectChanges();

	return fixture.nativeElement as HTMLElement;
}

function type(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
	field.value = value;
	field.dispatchEvent(new Event('input'));
}

function choose(select: HTMLSelectElement, value: string) {
	select.value = value;
	select.dispatchEvent(new Event('change'));
}

describe('CollectionBasicsPanelComponent', () => {
	it('fills the fields from the form', async () => {
		const page = await setUp(
			fakeEditStore({ name: 'Doom', slug: 'doom', status: 'published' })
		);

		expect(page.querySelector<HTMLInputElement>('#name')?.value).toBe(
			'Doom'
		);
		expect(page.querySelector('#slug + small')?.textContent).toContain(
			'/collections/doom'
		);
		expect(page.querySelector<HTMLSelectElement>('#status')?.value).toBe(
			'published'
		);
	});

	it('writes what is typed and chosen into the store', async () => {
		const store = fakeEditStore();
		const page = await setUp(store);

		type(page.querySelector('#name') as HTMLInputElement, 'Doom');
		type(page.querySelector('#slug') as HTMLInputElement, 'doom');
		type(page.querySelector('#description') as HTMLTextAreaElement, 'Slow');
		choose(page.querySelector('#status') as HTMLSelectElement, 'published');
		choose(page.querySelector('#visibility') as HTMLSelectElement, 'link');
		choose(
			page.querySelector('#group') as HTMLSelectElement,
			'discography'
		);

		expect(store.setName).toHaveBeenCalledWith('Doom');
		expect(store.setSlug).toHaveBeenCalledWith('doom');
		expect(store.setField).toHaveBeenCalledWith({ description: 'Slow' });
		expect(store.setField).toHaveBeenCalledWith({ status: 'published' });
		expect(store.setField).toHaveBeenCalledWith({ visibility: 'link' });
		expect(store.setField).toHaveBeenCalledWith({ group: 'discography' });
	});

	it('never offers the collection as its own parent', async () => {
		const store = fakeEditStore();

		store.parents.set([
			{ uid: 'one', name: 'This one' },
			{ uid: 'metal', name: 'Metal' },
		]);

		const page = await setUp(store);
		const offered = [
			...(page.querySelector('#parent') as HTMLSelectElement).options,
		].map((option) => option.value);

		expect(offered).toEqual(['', 'metal']);
	});
});
