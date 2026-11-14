import { Observable } from 'rxjs';

import { Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import {
	type FakeEditStore,
	fakeEditStore,
	provideFakeEditStore,
} from '../../music-collection-edit.store.testing';
import { SceneGeneratorComponent } from '../../scene-generator/scene-generator.component';

import { CollectionLooksPanelComponent } from './collection-looks-panel.component';

/** The scene pad has a store of its own that talks to the gateway. */
@Component({ selector: 'mc-scene-generator', template: '' })
class SceneGeneratorStubComponent {
	public readonly models = input<unknown>();
	public readonly locks = input<unknown>();
	public readonly title = input<string>();
	public readonly picked = output<string>();
}

async function setUp(store: FakeEditStore) {
	await TestBed.configureTestingModule({
		imports: [CollectionLooksPanelComponent],
		providers: [provideI18nTesting(), provideFakeEditStore(store)],
	})
		.overrideComponent(CollectionLooksPanelComponent, {
			remove: { imports: [SceneGeneratorComponent] },
			add: { imports: [SceneGeneratorStubComponent] },
		})
		.compileComponents();

	const fixture = TestBed.createComponent(CollectionLooksPanelComponent);

	fixture.detectChanges();

	return fixture;
}

describe('CollectionLooksPanelComponent', () => {
	it('writes a typed cover address into the form, and shows it', async () => {
		const store = fakeEditStore({ coverImageUrl: 'https://img/a.webp' });
		const page = (await setUp(store)).nativeElement as HTMLElement;
		const cover = page.querySelector('#cover') as HTMLInputElement;

		expect(
			page.querySelector<HTMLImageElement>('.cover-preview')?.src
		).toBe('https://img/a.webp');

		cover.value = 'https://img/b.webp';
		cover.dispatchEvent(new Event('input'));

		expect(store.setField).toHaveBeenCalledWith({
			coverImageUrl: 'https://img/b.webp',
		});
	});

	it('uploads a chosen file as the cover', async () => {
		const store = fakeEditStore();
		const page = (await setUp(store)).nativeElement as HTMLElement;
		const input = page.querySelector(
			'mc-collection-image-upload input[type="file"]'
		) as HTMLInputElement;
		const file = new File(['x'], 'cover.png', { type: 'image/png' });

		Object.defineProperty(input, 'files', { value: [file] });
		input.dispatchEvent(new Event('change'));

		const [source] = store.uploadImage.mock.calls[0] as [
			Observable<unknown>,
		];
		const sent: unknown[] = [];

		source.subscribe((one) => sent.push(one));

		expect(sent).toEqual([{ field: 'coverImageUrl', file }]);
	});

	it('opens the library for the cover only when asked', async () => {
		const store = fakeEditStore();
		const fixture = await setUp(store);
		const page = fixture.nativeElement as HTMLElement;

		expect(page.querySelector('mc-image-library')).toBeNull();

		page.querySelector<HTMLButtonElement>(
			'mc-collection-image-upload button'
		)?.click();

		expect(store.openLibrary).toHaveBeenCalledWith('coverImageUrl');

		store.libraryTarget.set('coverImageUrl');
		fixture.detectChanges();

		expect(page.querySelector('mc-image-library')).not.toBeNull();
	});

	it('takes a drawn scene as the cover', async () => {
		const store = fakeEditStore({ name: 'Doom' });
		const fixture = await setUp(store);
		const pad = fixture.debugElement.query(
			(node) => node.name === 'mc-scene-generator'
		).componentInstance as SceneGeneratorStubComponent;

		expect(pad.title()).toBe('Doom');

		pad.picked.emit('https://img/scene.webp');

		expect(store.useAsCover).toHaveBeenCalledWith('https://img/scene.webp');
	});
});
