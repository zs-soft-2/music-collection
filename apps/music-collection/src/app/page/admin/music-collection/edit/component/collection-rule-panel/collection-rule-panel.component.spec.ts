import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { emptyCriteriaForm } from '../../../music-collection-admin.model';
import {
	type FakeEditStore,
	fakeEditStore,
	provideFakeEditStore,
} from '../../music-collection-edit.store.testing';

import { CollectionRulePanelComponent } from './collection-rule-panel.component';

async function setUp(store: FakeEditStore) {
	await TestBed.configureTestingModule({
		imports: [CollectionRulePanelComponent],
		providers: [provideI18nTesting(), provideFakeEditStore(store)],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionRulePanelComponent);

	fixture.detectChanges();

	return fixture.nativeElement as HTMLElement;
}

describe('CollectionRulePanelComponent', () => {
	it('writes a year as a number, and an empty one as no bound', async () => {
		const store = fakeEditStore();
		const page = await setUp(store);
		const from = page.querySelector('#year-from') as HTMLInputElement;

		from.value = '1980';
		from.dispatchEvent(new Event('input'));
		from.value = ' ';
		from.dispatchEvent(new Event('input'));

		expect(store.setCriteria).toHaveBeenNthCalledWith(1, {
			...emptyCriteriaForm(),
			yearFrom: 1980,
		});
		expect(store.setCriteria).toHaveBeenNthCalledWith(2, {
			...emptyCriteriaForm(),
			yearFrom: null,
		});
	});

	it('offers the taxonomy styles to the style criteria', async () => {
		const store = fakeEditStore();

		store.styles.set(['Doom', 'Thrash']);

		const page = await setUp(store);
		const offered = [
			...(page.querySelector('#styles') as HTMLSelectElement).options,
		].map((option) => option.value);

		expect(offered).toEqual(['Doom', 'Thrash']);
	});

	it('keeps the operator and the picked values of a criterion together', async () => {
		const store = fakeEditStore();

		store.styles.set(['Doom', 'Thrash']);

		const page = await setUp(store);
		const values = page.querySelector('#styles') as HTMLSelectElement;

		values.options[1].selected = true;
		values.dispatchEvent(new Event('change'));

		expect(store.setCriteria).toHaveBeenCalledWith({
			...emptyCriteriaForm(),
			styles: { operator: 'includesAny', values: ['Thrash'] },
		});
	});

	it('splits the credited roles on commas', async () => {
		const store = fakeEditStore();
		const page = await setUp(store);
		const roles = page.querySelector('#credit-roles') as HTMLInputElement;

		roles.value = 'Drums, Producer ,';
		roles.dispatchEvent(new Event('change'));

		expect(store.setCriteria).toHaveBeenCalledWith({
			...emptyCriteriaForm(),
			creditRoles: ['Drums', 'Producer'],
		});
	});
});
