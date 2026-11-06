import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import {
	CollectionEditTabsComponent,
	type EditTabId,
} from './collection-edit-tabs.component';

async function setUp(
	inputs: {
		active?: EditTabId;
		criteriaCount?: number;
		hasCover?: boolean;
		hasBadge?: boolean;
	} = {}
) {
	await TestBed.configureTestingModule({
		imports: [CollectionEditTabsComponent],
		providers: [provideI18nTesting()],
	}).compileComponents();

	const fixture = TestBed.createComponent(CollectionEditTabsComponent);
	const asked: EditTabId[] = [];

	fixture.componentRef.setInput('active', inputs.active ?? 'basics');
	fixture.componentRef.setInput('criteriaCount', inputs.criteriaCount ?? 0);
	fixture.componentRef.setInput('hasCover', inputs.hasCover ?? false);
	fixture.componentRef.setInput('hasBadge', inputs.hasBadge ?? false);
	fixture.componentInstance.activeChange.subscribe((id) => asked.push(id));
	fixture.detectChanges();

	const page = fixture.nativeElement as HTMLElement;
	const tab = (id: EditTabId) =>
		page.querySelector<HTMLButtonElement>(
			`#tab-${id}`
		) as HTMLButtonElement;

	return { page, tab, asked };
}

describe('CollectionEditTabsComponent', () => {
	it('draws the four tabs and marks the open one', async () => {
		const { page, tab } = await setUp({ active: 'rule' });

		expect(page.querySelectorAll('[role="tab"]')).toHaveLength(4);
		expect(tab('rule').getAttribute('aria-selected')).toBe('true');
		expect(tab('rule').classList).toContain('is-active');
		expect(tab('rule').tabIndex).toBe(0);
		expect(tab('basics').tabIndex).toBe(-1);
	});

	it('asks for the tab that was clicked', async () => {
		const { tab, asked } = await setUp();

		tab('badge').click();

		expect(asked).toEqual(['badge']);
	});

	it('walks the tabs with the arrow keys, round the ends', async () => {
		const { tab, asked } = await setUp({ active: 'basics' });

		tab('basics').dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowLeft' })
		);
		tab('basics').dispatchEvent(
			new KeyboardEvent('keydown', { key: 'ArrowRight' })
		);
		tab('basics').dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter' })
		);

		expect(asked).toEqual(['badge', 'rule']);
	});

	it('counts the filters and marks the cover and the badge', async () => {
		const { tab } = await setUp({
			criteriaCount: 3,
			hasCover: true,
			hasBadge: true,
		});

		expect(tab('rule').querySelector('.count')?.textContent).toBe('3');
		expect(tab('looks').querySelector('.dot')).not.toBeNull();
		expect(tab('badge').querySelector('.dot')).not.toBeNull();
		expect(tab('basics').querySelector('.count, .dot')).toBeNull();
	});
});
