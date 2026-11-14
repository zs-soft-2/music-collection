import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';
import { type MusicCollectionMembership } from '@music-collection/domain/music-collection/api';

import { CollectionEditPreviewComponent } from './collection-edit-preview.component';

const painkiller = {
	albumUid: 'painkiller',
	albumName: 'Painkiller',
	artistName: 'Judas Priest',
	year: 1990,
} as MusicCollectionMembership;

async function setUp(inputs: Record<string, unknown>) {
	await TestBed.configureTestingModule({
		imports: [CollectionEditPreviewComponent],
		providers: [provideI18nTesting()],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionEditPreviewComponent);

	for (const [name, value] of Object.entries(inputs)) {
		fixture.componentRef.setInput(name, value);
	}
	fixture.detectChanges();

	return fixture.nativeElement as HTMLElement;
}

describe('CollectionEditPreviewComponent', () => {
	it('lists what the rule catches, and counts the rest', async () => {
		const page = await setUp({
			total: 3,
			points: 40,
			albums: [painkiller],
		});

		expect(page.querySelector('.total')?.textContent).toContain(
			'3 records'
		);
		expect(page.querySelector('.points strong')?.textContent?.trim()).toBe(
			'40'
		);
		expect(
			page
				.querySelector('.albums li')
				?.textContent?.replace(/\s+/g, ' ')
				.trim()
		).toBe('Painkiller Judas Priest · 1990');
		expect(page.querySelector('.more')?.textContent).toContain(
			'…and 2 more.'
		);
		expect(page.querySelector('.warning')).toBeNull();
	});

	it('warns when the rule has no filter at all', async () => {
		const page = await setUp({ matchesEverything: true });

		expect(page.querySelector('.warning')?.textContent).toContain(
			'No filter yet'
		);
	});

	it('says when the rule is still being resolved', async () => {
		const page = await setUp({ isPreviewing: true });

		expect(page.querySelector('.total .busy')).not.toBeNull();
	});
});
