import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { CollectionLooksPanelComponent } from './component/collection-looks-panel/collection-looks-panel.component';
import { MusicCollectionEditComponent } from './music-collection-edit.component';
import {
	type FakeEditStore,
	fakeEditStore,
	provideFakeEditStore,
} from './music-collection-edit.store.testing';
import { SceneGeneratorComponent } from './scene-generator/scene-generator.component';

/** The scene pad has a store of its own that talks to the gateway. */
@Component({ selector: 'mc-scene-generator', template: '' })
class SceneGeneratorStubComponent {
	public readonly models = input<unknown>();
	public readonly locks = input<unknown>();
	public readonly title = input<string>();
}

async function setUp(store: FakeEditStore) {
	await TestBed.configureTestingModule({
		imports: [MusicCollectionEditComponent],
		providers: [provideI18nTesting(), provideRouter([])],
	})
		.overrideComponent(MusicCollectionEditComponent, {
			set: { providers: [provideFakeEditStore(store)] },
		})
		.overrideComponent(CollectionLooksPanelComponent, {
			remove: { imports: [SceneGeneratorComponent] },
			add: { imports: [SceneGeneratorStubComponent] },
		})
		.compileComponents();

	const fixture = TestBed.createComponent(MusicCollectionEditComponent);

	fixture.detectChanges();

	return fixture;
}

describe('MusicCollectionEditComponent', () => {
	it('loads the collection the route names', async () => {
		const store = fakeEditStore();

		await setUp(store);

		expect(store.load).toHaveBeenCalled();
	});

	it('shows one tab panel at a time, and keeps the others in the page', async () => {
		const fixture = await setUp(fakeEditStore());
		const page = fixture.nativeElement as HTMLElement;
		const hidden = () =>
			[...page.querySelectorAll<HTMLElement>('[role="tabpanel"]')].map(
				(panel) => panel.hidden
			);

		expect(hidden()).toEqual([false, true, true, true]);

		page.querySelector<HTMLButtonElement>('#tab-badge')?.click();
		fixture.detectChanges();

		expect(hidden()).toEqual([true, true, true, false]);
		expect(page.querySelector('mc-collection-looks-panel')).not.toBeNull();
	});

	it('paints the layout in the open tab’s colour', async () => {
		const fixture = await setUp(fakeEditStore());
		const page = fixture.nativeElement as HTMLElement;
		const layout = page.querySelector('.layout') as HTMLElement;

		expect(layout.style.getPropertyValue('--tint')).toBe(
			'var(--mc-series-2)'
		);

		page.querySelector<HTMLButtonElement>('#tab-rule')?.click();
		fixture.detectChanges();

		expect(layout.style.getPropertyValue('--tint')).toBe(
			'var(--mc-series-4)'
		);
	});

	it('shows only the head and a placeholder while loading', async () => {
		const store = fakeEditStore();

		store.isLoading.set(true);

		const page = (await setUp(store)).nativeElement as HTMLElement;

		expect(page.querySelector('mc-collection-edit-hero')).not.toBeNull();
		expect(page.querySelector('.skeleton')).not.toBeNull();
		expect(page.querySelector('[role="tablist"]')).toBeNull();
	});

	it('saves from the action row', async () => {
		const store = fakeEditStore({ name: 'Doom' });

		store.canSave.set(true);

		const page = (await setUp(store)).nativeElement as HTMLElement;

		page.querySelector<HTMLButtonElement>('.button.is-primary')?.click();

		expect(store.save).toHaveBeenCalled();
	});
});
