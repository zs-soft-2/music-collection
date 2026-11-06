import { provideI18nTesting } from '@music-collection/core/i18n/testing';

import { TestBed } from '@angular/core/testing';

import { AvatarEffect, DEFAULT_AVATAR, avatarLayers } from '../../data/avatar';
import { AvatarFigureComponent } from './avatar-figure.component';
import { AvatarStore } from './avatar.store';

jest.mock('../../data/avatar', () => ({
	...jest.requireActual('../../data/avatar'),
	// The figure waits for every picture to load; here there is none.
	loadAvatarLayer: jest.fn(() => Promise.resolve()),
}));

const layerUrl = jest.fn(
	(file: string, size = 'large') => `https://layers/${size}/${file}`
);

beforeEach(() => {
	layerUrl.mockClear();

	TestBed.resetTestingModule();
	TestBed.configureTestingModule({
		providers: [
			provideI18nTesting(),
			{ provide: AvatarEffect, useValue: { layerUrl } },
		],
	});
});

describe('AvatarStore.layerUrl', () => {
	it('answers with the address the effect derives', () => {
		const store = TestBed.inject(AvatarStore);

		expect(store.layerUrl('hair-short.webp', 'small')).toBe(
			'https://layers/small/hair-short.webp'
		);
		expect(layerUrl).toHaveBeenCalledWith('hair-short.webp', 'small');
	});

	it('draws from the large cut unless told otherwise', () => {
		TestBed.inject(AvatarStore).layerUrl('thumb-hair-short.webp');

		expect(layerUrl).toHaveBeenCalledWith('thumb-hair-short.webp', 'large');
	});
});

describe('AvatarFigureComponent', () => {
	it('stacks the look’s layers from the addresses the store gives', async () => {
		const fixture = TestBed.createComponent(AvatarFigureComponent);

		fixture.componentRef.setInput('look', DEFAULT_AVATAR);
		fixture.componentRef.setInput('size', 'small');
		fixture.detectChanges();
		await fixture.whenStable();
		fixture.detectChanges();

		const shown = Array.from(
			(fixture.nativeElement as HTMLElement).querySelectorAll('img'),
			(image) => image.getAttribute('src')
		);

		expect(shown).toEqual(
			avatarLayers(DEFAULT_AVATAR, 'front').map(
				(file) => `https://layers/small/${file}`
			)
		);
	});
});
