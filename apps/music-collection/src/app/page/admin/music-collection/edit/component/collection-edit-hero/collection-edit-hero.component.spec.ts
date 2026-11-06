import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import {
	type CollectionForm,
	emptyCollectionForm,
} from '../../../music-collection-admin.model';

import { CollectionEditHeroComponent } from './collection-edit-hero.component';

async function setUp(
	form: Partial<CollectionForm>,
	inputs: { isNew?: boolean; isLoading?: boolean; previewTotal?: number } = {}
) {
	await TestBed.configureTestingModule({
		imports: [CollectionEditHeroComponent],
		providers: [provideI18nTesting()],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionEditHeroComponent);

	fixture.componentRef.setInput('form', {
		...emptyCollectionForm(),
		...form,
	});
	fixture.componentRef.setInput('isNew', inputs.isNew ?? false);
	fixture.componentRef.setInput('isLoading', inputs.isLoading ?? false);
	fixture.componentRef.setInput('previewTotal', inputs.previewTotal ?? 0);
	fixture.detectChanges();

	return fixture.nativeElement as HTMLElement;
}

describe('CollectionEditHeroComponent', () => {
	it('names the collection, and says what it is when it has no name yet', async () => {
		expect(
			(await setUp({ name: 'Doom' })).querySelector('h1')?.textContent
		).toContain('Doom');

		TestBed.resetTestingModule();

		expect(
			(await setUp({}, { isNew: true })).querySelector('h1')?.textContent
		).toContain('Add collection');
	});

	it('shows the status, the visibility, the count and the path', async () => {
		const page = await setUp(
			{ status: 'published', visibility: 'link', slug: 'doom' },
			{ previewTotal: 12 }
		);
		const pills = [...page.querySelectorAll('.pill')].map((pill) =>
			pill.textContent?.trim()
		);

		expect(pills).toEqual([
			'published',
			'Link — readable by whoever knows it',
			'12 records',
			'/collections/doom',
		]);
	});

	it('keeps the pills back while the definition loads', async () => {
		const page = await setUp({ slug: 'doom' }, { isLoading: true });

		expect(page.querySelector('.pills')).toBeNull();
	});

	it('puts the cover behind the head', async () => {
		const page = await setUp({ coverImageUrl: 'https://img/cover.webp' });

		expect(page.querySelector<HTMLImageElement>('.hero-art')?.src).toBe(
			'https://img/cover.webp'
		);
	});
});
